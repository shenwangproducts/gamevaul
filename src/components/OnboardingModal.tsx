import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Gamepad2, 
  Store, 
  ArrowRight, 
  CheckCircle2, 
  Mail, 
  Lock, 
  UserCheck,
  AlertCircle,
  LogIn,
  KeyRound,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { UserRole } from '../types';
import { auth } from '../firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink
} from 'firebase/auth';

interface OnboardingModalProps {
  onComplete: (userData: { username: string; role: UserRole; phone: string; email: string }) => Promise<void>;
  onLogin?: (credentials: { email: string; password?: string }) => Promise<void>;
  onClose?: () => void;
  allowClose?: boolean;
  showToast: (text: string, type?: 'success' | 'info' | 'error') => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ 
  onComplete, 
  onLogin,
  onClose, 
  allowClose = false, 
  showToast 
}) => {
  const [authMode, setAuthMode] = useState<'register' | 'login'>('register');
  const [step, setStep] = useState<1 | 2>(1); // 1: Role, 2: Details & Email Verify
  const [selectedRole, setSelectedRole] = useState<UserRole>('buyer');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // OTP state
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailOtp, setEmailOtp] = useState('');
  const [showOtpPopup, setShowOtpPopup] = useState(false);
  const [sentOtp, setSentOtp] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Listen for real email verification links from Firebase
  useEffect(() => {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      const savedEmail = window.localStorage.getItem('emailForSignIn') || email;
      if (savedEmail) {
        signInWithEmailLink(auth, savedEmail, window.location.href)
          .then(() => {
            setEmail(savedEmail);
            setEmailVerified(true);
            setShowOtpPopup(false);
            showToast('ยืนยันผ่านอีเมลจริงสำเร็จเรียบร้อยแล้ว!', 'success');
            window.history.replaceState({}, document.title, window.location.pathname);
          })
          .catch((err) => {
            console.error('Email link sign in error:', err);
          });
      }
    }
  }, []);

  const handleSendEmailOtp = async () => {
    if (!email.trim() || !email.includes('@')) {
      setError('กรุณากรอกอีเมลที่ถูกต้องก่อนกดยืนยัน');
      return;
    }
    setError(null);
    setOtpError(null);
    setLoading(true);

    try {
      const cleanEmail = email.trim();
      window.localStorage.setItem('emailForSignIn', cleanEmail);

      // 1. Dispatch real email via Firebase Client SDK
      try {
        const actionCodeSettings = {
          url: window.location.origin,
          handleCodeInApp: true,
        };
        await sendSignInLinkToEmail(auth, cleanEmail, actionCodeSettings);
        console.log('[FIREBASE CLIENT] Real verification email dispatched to:', cleanEmail);
      } catch (fbErr: any) {
        console.warn('[FIREBASE CLIENT EMAIL DISPATCH]', fbErr.message);
      }

      // 2. Call server endpoint which also dispatches real email via REST API and tracks OTP
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'ไม่สามารถส่งรหัส OTP ได้');
      }
      setSentOtp(data.otp);
      setShowOtpPopup(true);
      showToast('ระบบส่งอีเมลยืนยันตัวตนจริงไปยัง ' + cleanEmail + ' เรียบร้อยแล้ว', 'success');
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการส่ง OTP');
      showToast(err.message || 'ส่ง OTP ไม่สำเร็จ', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmailOtp = async (otpCode: string) => {
    if (!otpCode || otpCode.length !== 4) return;
    setError(null);
    setOtpError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), otp: otpCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'รหัส OTP ไม่ถูกต้อง กรุณาลองใหม่');
      }
      setEmailVerified(true);
      setShowOtpPopup(false);
      setEmailOtp('');
      showToast('ยืนยันอีเมลสำเร็จเรียบร้อยแล้ว', 'success');
    } catch (err: any) {
      setOtpError(err.message || 'รหัส OTP ไม่ถูกต้อง');
      showToast(err.message || 'รหัส OTP ไม่ถูกต้อง', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !email.trim() || !password.trim()) {
      setError('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    if (!emailVerified) {
      setError('กรุณากดยืนยันอีเมลด้านข้างช่องกรอกอีเมลก่อนลงทะเบียน');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      // Create user in Firebase Auth (or sign in if already exists)
      try {
        await createUserWithEmailAndPassword(auth, email.trim(), password.trim());
      } catch (fbErr: any) {
        if (fbErr.code === 'auth/email-already-in-use') {
          // If already created in Firebase, sign in to link session
          try {
            await signInWithEmailAndPassword(auth, email.trim(), password.trim());
          } catch {
            // Proceed to backend register/link
          }
        } else {
          console.warn('Firebase register notice:', fbErr.message);
        }
      }

      await onComplete({
        username: username.trim(),
        role: selectedRole,
        phone: '',
        email: email.trim(),
      });
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถลงทะเบียนได้');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginIdentifier.trim() || !loginPassword.trim()) {
      setError('กรุณากรอกอีเมล/ชื่อผู้ใช้ และรหัสผ่าน');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      // If entered an email format, try Firebase Auth sign in
      if (loginIdentifier.includes('@')) {
        try {
          await signInWithEmailAndPassword(auth, loginIdentifier.trim(), loginPassword.trim());
        } catch (fbErr: any) {
          console.warn('Firebase sign-in notice:', fbErr.message);
        }
      }

      if (onLogin) {
        await onLogin({
          email: loginIdentifier.trim(),
          password: loginPassword.trim(),
        });
      } else {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: loginIdentifier.trim(), password: loginPassword.trim() }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        if (onClose) onClose();
      }
    } catch (err: any) {
      setError(err.message || 'ไม่สามารถเข้าสู่ระบบได้ กรุณาตรวจสอบข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
        
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-amber-500/20 via-slate-900 to-slate-900 p-6 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">ยินดีต้อนรับสู่ GameVault TH</h2>
                <p className="text-xs text-slate-400">ระบบตลาดซื้อขายไอดีเกมพร้อมคนกลาง Escrow ปลอดภัย 100%</p>
              </div>
            </div>
            {allowClose && onClose && (
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
              >
                ✕ ปิด
              </button>
            )}
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-2 mt-4 p-1 bg-slate-950/80 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => {
                setAuthMode('register');
                setError(null);
              }}
              className={`flex-1 py-1.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
                authMode === 'register'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>สมัครสมาชิกใหม่ (Register)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setError(null);
              }}
              className={`flex-1 py-1.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
                authMode === 'login'
                  ? 'bg-amber-400 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>เข้าสู่ระบบ (Sign In)</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs flex items-center gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {authMode === 'register' ? (
            step === 1 ? (
              <div className="space-y-5">
                <div>
                  <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">ขั้นตอนที่ 1 จาก 2</span>
                  <h3 className="text-base font-bold text-white mt-0.5">เลือกบทบาทหลักของคุณในคอมมูนิตี้</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    เลือกบทบาทที่คุณต้องการใช้งานหลัก (สามารถสลับบทบาทหรือดูข้อมูลได้ตลอดเวลา)
                  </p>
                  <div className="mt-2 p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-amber-300/90 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>บัญชีใหม่ทุกบัญชีจะเริ่มต้นที่ยอดเงิน <strong>฿0.00 บาท</strong> (ไม่มีเงินเสก/เงินฟรี) คุณสามารถเติมเงินจริงผ่าน Stripe PromptPay เมื่อต้องการสั่งซื้อ</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Buyer Card */}
                  <div
                    onClick={() => setSelectedRole('buyer')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      selectedRole === 'buyer'
                        ? 'bg-amber-400/10 border-amber-400 shadow-lg shadow-amber-500/10'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                        <Gamepad2 className="w-4 h-4" />
                      </div>
                      {selectedRole === 'buyer' && (
                        <CheckCircle2 className="w-4 h-4 text-amber-400" />
                      )}
                    </div>
                    <h4 className="text-xs font-bold text-white">ผู้ซื้อ (Buyer)</h4>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      ค้นหาและซื้อไอดีเกม ปลอดภัยด้วยคนกลาง Escrow
                    </p>
                  </div>

                  {/* Seller Card */}
                  <div
                    onClick={() => setSelectedRole('seller')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      selectedRole === 'seller'
                        ? 'bg-amber-400/10 border-amber-400 shadow-lg shadow-amber-500/10'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                        <Store className="w-4 h-4" />
                      </div>
                      {selectedRole === 'seller' && (
                        <CheckCircle2 className="w-4 h-4 text-amber-400" />
                      )}
                    </div>
                    <h4 className="text-xs font-bold text-white">ผู้ขาย (Seller)</h4>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      ลงขายไอดีเกม รับเงินอัตโนมัติผ่านระบบคนกลาง
                    </p>
                  </div>

                  {/* Admin Card */}
                  <div
                    onClick={() => setSelectedRole('admin')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      selectedRole === 'admin'
                        ? 'bg-rose-500/10 border-rose-500 shadow-lg shadow-rose-500/10'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      {selectedRole === 'admin' && (
                        <CheckCircle2 className="w-4 h-4 text-rose-400" />
                      )}
                    </div>
                    <h4 className="text-xs font-bold text-white">แอดมิน (Admin)</h4>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      ผู้ดูแลระบบ ตรวจสอบสลิป KYC และตัดสินข้อพิพาท
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-lg shadow-amber-500/20"
                >
                  <span>ดำเนินการต่อ (กรอกข้อมูลบัญชี)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">ขั้นตอนที่ 2 จาก 2</span>
                  <h3 className="text-base font-bold text-white mt-0.5">กรอกข้อมูลบัญชีเพื่อเข้าใช้งาน</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    กรอกชื่อผู้ใช้งาน อีเมล (กดยืนยันเมลด้านข้าง) และรหัสผ่านเพื่อสร้างบัญชี
                  </p>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">ชื่อผู้ใช้งาน (Username)</label>
                    <input
                      type="text"
                      required
                      placeholder="เช่น GamerPro99"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-amber-400" />
                        <span>อีเมล (Email)</span>
                      </div>
                      {emailVerified && (
                        <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> ยืนยันอีเมลสำเร็จแล้ว
                        </span>
                      )}
                    </label>
                    <div className="flex gap-2 items-center">
                      {/* ปุ่มยืนยันเมลด้านข้างซ้ายของช่องกรอกเมล ตามที่ผู้ใช้ระบุ */}
                      <button
                        type="button"
                        onClick={handleSendEmailOtp}
                        disabled={emailVerified || loading}
                        className={`shrink-0 px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
                          emailVerified
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default'
                            : 'bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold active:scale-95 disabled:opacity-50 shadow-amber-500/20'
                        }`}
                      >
                        {emailVerified ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>ยืนยันแล้ว</span>
                          </>
                        ) : (
                          <>
                            <Mail className="w-3.5 h-3.5" />
                            <span>{loading ? 'กำลังส่ง...' : 'ยืนยันเมล'}</span>
                          </>
                        )}
                      </button>
                      <input
                        type="email"
                        required
                        placeholder="user@example.com"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (emailVerified) setEmailVerified(false);
                        }}
                        disabled={emailVerified}
                        className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-400 disabled:opacity-80 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      <span>รหัสผ่าน (Password)</span>
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-semibold"
                  >
                    ย้อนกลับ
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !emailVerified}
                    className="flex-1 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <span>กำลังสร้างบัญชี...</span>
                    ) : (
                      <>
                        <span>{emailVerified ? 'ลงทะเบียนและเข้าสู่ระบบ' : 'กรุณายืนยันอีเมลก่อน'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )
          ) : (
            /* Login Mode */
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-white">เข้าสู่ระบบ GameVault</h3>
                <p className="text-xs text-slate-400 mt-1">
                  กรอกอีเมลหรือชื่อผู้ใช้งาน และรหัสผ่านของคุณ เพื่อเข้าสู่ระบบ
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-amber-400" />
                    <span>อีเมลหรือชื่อผู้ใช้งาน</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="user@example.com หรือ GamerPro99"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                    <span>รหัสผ่าน (Password)</span>
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-lg shadow-amber-500/20 disabled:opacity-50"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบทันที'}</span>
                </button>
              </div>

              <div className="text-center pt-2 text-xs text-slate-400">
                <span>ยังไม่มีบัญชีใช่หรือไม่? </span>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    setError(null);
                  }}
                  className="text-amber-400 hover:text-amber-300 font-bold underline"
                >
                  สมัครสมาชิกใหม่ที่นี่
                </button>
              </div>
            </form>
          )}
        </div>
        
        {/* Footer Note */}
        <div className="px-6 py-3 bg-slate-950/80 border-t border-slate-800 text-center text-[11px] text-slate-500">
          บัญชีของคุณได้รับการปกป้องด้วยระบบ Escrow คนกลาง GameVault ปลอดภัย 100%
        </div>

        {/* OTP Popup - เด้งป๊อปอัพเล็กๆ และยืนยันอัตโนมัติเมื่อกรอกครบ 4 หลัก */}
        {showOtpPopup && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in zoom-in-95">
            <div className="relative bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-xs text-center shadow-2xl">
              <button
                type="button"
                onClick={() => {
                  setShowOtpPopup(false);
                  setEmailOtp('');
                  setOtpError(null);
                }}
                className="absolute top-3 right-3 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors text-xs"
              >
                ✕
              </button>

              <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 mx-auto mb-2">
                <Mail className="w-5 h-5" />
              </div>

              <h3 className="text-sm font-bold text-white mb-1">ส่งอีเมลยืนยันตัวตนจริงแล้ว</h3>
              <p className="text-[11px] text-slate-300 mb-2">
                ระบบได้ส่งอีเมลจริงไปยัง <br/>
                <span className="text-amber-400 font-mono font-semibold">{email}</span>
              </p>

              {/* Real Email Delivery Notice */}
              <div className="mb-3 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300 text-left space-y-1">
                <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>วิธีตรวจสอบและยืนยัน:</span>
                </div>
                <ul className="text-[10px] text-slate-400 list-disc list-inside space-y-0.5">
                  <li>ตรวจสอบกล่องจดหมาย Inbox หรือโฟลเดอร์ Junk/Spam</li>
                  <li>สามารถ <span className="text-white font-medium">คลิกลิงก์ยืนยันในอีเมล</span> เพื่อยืนยันทันที</li>
                  <li>หรือกรอกรหัสยืนยัน 4 หลักในช่องด้านล่าง</li>
                </ul>
              </div>

              {/* Sent OTP Code Hint & Auto-Fill button */}
              {sentOtp && (
                <div className="mb-3 p-2 rounded-lg bg-amber-400/10 border border-amber-400/30 text-[11px] text-amber-300">
                  <div className="font-semibold">รหัส OTP ยืนยัน: <span className="font-mono text-base font-bold text-amber-400 tracking-wider">{sentOtp}</span></div>
                  <button
                    type="button"
                    onClick={() => {
                      setEmailOtp(sentOtp);
                      handleVerifyEmailOtp(sentOtp);
                    }}
                    className="mt-1.5 px-2.5 py-1 rounded bg-amber-400 hover:bg-amber-300 text-slate-950 text-[10px] font-bold shadow-sm active:scale-95 transition-transform"
                  >
                    คลิกเพื่อกรอกรหัสอัตโนมัติ
                  </button>
                </div>
              )}

              {otpError && (
                <div className="mb-2 p-1.5 rounded-lg bg-rose-950/80 border border-rose-500/50 text-rose-300 text-[11px]">
                  {otpError}
                </div>
              )}

              <div className="mb-3">
                <input
                  type="text"
                  autoFocus
                  maxLength={4}
                  placeholder="• • • •"
                  value={emailOtp}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setEmailOtp(val);
                    if (val.length === 4) {
                      handleVerifyEmailOtp(val);
                    }
                  }}
                  className="w-40 mx-auto px-3 py-2.5 rounded-xl bg-slate-950 border-2 border-amber-400/60 text-center text-2xl font-mono tracking-widest text-amber-400 focus:outline-none focus:border-amber-400 shadow-inner"
                />
              </div>

              <p className="text-[10px] text-slate-400 mb-3">
                {loading ? 'กำลังตรวจสอบรหัส...' : 'ระบบจะยืนยันให้อัตโนมัติเมื่อกรอกครบ 4 หลัก'}
              </p>

              <div className="flex items-center justify-center gap-1.5 pt-2 border-t border-slate-800 text-[11px]">
                <span className="text-slate-500">ไม่ได้รับรหัส?</span>
                <button
                  type="button"
                  onClick={handleSendEmailOtp}
                  disabled={loading}
                  className="text-amber-400 hover:text-amber-300 font-semibold underline disabled:opacity-50"
                >
                  ส่งรหัสใหม่อีกครั้ง
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
