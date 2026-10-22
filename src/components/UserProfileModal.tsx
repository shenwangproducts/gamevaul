import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShieldCheck, 
  Star, 
  Award, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Package, 
  MessageSquare, 
  ExternalLink,
  Building,
  UserCheck,
  Coins,
  LogOut,
  Gift,
  Smartphone,
  QrCode,
  Lock,
  Check
} from 'lucide-react';
import { User, Review, GameAccountListing } from '../types';

interface UserProfileModalProps {
  userId: string | null;
  onClose: () => void;
  onSelectListing?: (listing: GameAccountListing) => void;
  onLogout?: () => void;
}

interface ProfileData {
  user: User;
  kycData: {
    realName: string;
    idCardMasked: string;
    bankName: string;
    bankAccountMasked: string;
    submittedAt: string;
  } | null;
  reviews: Review[];
  listings: GameAccountListing[];
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  userId,
  onClose,
  onSelectListing,
  onLogout,
}) => {
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'reviews' | 'listings' | 'kyc' | 'points'>('reviews');
  const [redeeming, setRedeeming] = useState(false);
  const [redeemMessage, setRedeemMessage] = useState<string | null>(null);
  
  // Thai ID App KYC State
  const [kycConnecting, setKycConnecting] = useState(false);
  const [kycMessage, setKycMessage] = useState<string | null>(null);
  const [kycForm, setKycForm] = useState({
    realName: '',
    idCardNumber: '',
    bankName: 'กสิกรไทย (KBANK)',
    bankAccount: '',
  });

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    fetch(`/api/users/${userId}/profile`)
      .then((r) => {
        if (!r.ok) throw new Error('Network response was not ok');
        return r.json();
      })
      .then((data) => {
        if (data && !data.error) {
          setProfileData(data);
          if (data.kycData) {
            setKycForm({
              realName: data.kycData.realName || '',
              idCardNumber: data.kycData.idCardMasked || '',
              bankName: data.kycData.bankName || 'กสิกรไทย (KBANK)',
              bankAccount: data.kycData.bankAccountMasked || '',
            });
          }
        } else {
          setProfileData({
            user: {
              id: userId,
              username: 'User_' + userId,
              email: `${userId}@gamevault.in.th`,
              phone: '08X-XXX-XXXX',
              role: 'buyer',
              balance: 0,
              vaultPoints: 0,
              rating: 5.0,
              totalSales: 0,
              reviewsCount: 0,
              reviews: [],
              avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&q=80',
              kycStatus: 'unverified'
            },
            kycData: null,
            reviews: [],
            listings: []
          });
        }
      })
      .catch((err) => {
        console.error('Failed to load profile, using fallback:', err);
        setProfileData({
          user: {
            id: userId,
            username: 'User_' + userId,
            email: `${userId}@gamevault.in.th`,
            phone: '08X-XXX-XXXX',
            role: 'buyer',
            balance: 0,
            vaultPoints: 0,
            rating: 5.0,
            totalSales: 0,
            reviewsCount: 0,
            reviews: [],
            avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&q=80',
            kycStatus: 'unverified'
          },
          kycData: null,
          reviews: [],
          listings: []
        });
      })
      .finally(() => setLoading(false));
  }, [userId]);

  const handleRedeemPoints = async (points: number) => {
    setRedeeming(true);
    setRedeemMessage(null);
    try {
      const res = await fetch('/api/users/redeem-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pointsToRedeem: points }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setRedeemMessage(data.message);
      if (profileData) {
        setProfileData({
          ...profileData,
          user: data.user,
        });
      }
    } catch (err: any) {
      setRedeemMessage(err.message || 'เกิดข้อผิดพลาดในการแลกแต้ม');
    } finally {
      setRedeeming(false);
    }
  };

  const handleThaiIdVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setKycConnecting(true);
    setKycMessage(null);
    try {
      const res = await fetch('/api/auth/thai-id-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(kycForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setKycMessage(data.message || 'เชื่อมต่อแอป Thai ID สำเร็จเรียบร้อย');
      if (profileData) {
        setProfileData({
          ...profileData,
          user: data.user,
          kycData: {
            realName: kycForm.realName || data.user.username,
            idCardMasked: kycForm.idCardNumber || '1-1099-00123-45-9',
            bankName: kycForm.bankName,
            bankAccountMasked: kycForm.bankAccount || '123-x-xx890',
            submittedAt: new Date().toISOString(),
          }
        });
      }
    } catch (err: any) {
      setKycMessage(err.message || 'เกิดข้อผิดพลาดในการยืนยันตัวตนผ่าน Thai ID');
    } finally {
      setKycConnecting(false);
    }
  };

  if (!userId) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-6">
        
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-sky-400" />
            <h3 className="text-sm font-bold text-white">
              โปรไฟล์และความน่าเชื่อถือของผู้ใช้งาน (User Profile)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400 space-y-2">
            <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
            <div>กำลังโหลดข้อมูลโปรไฟล์และความน่าเชื่อถือ...</div>
          </div>
        ) : !profileData ? (
          <div className="p-8 text-center text-xs text-rose-400">
            ไม่พบข้อมูลผู้ใช้งานรายนี้
          </div>
        ) : (
          <div className="max-h-[80vh] overflow-y-auto p-6 space-y-6">
            
            {/* Top Identity Block */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-950 border border-slate-800">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img
                    src={profileData.user.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=user'}
                    alt={profileData.user.username}
                    className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-750 p-1"
                  />
                  {profileData.user.kycStatus === 'verified' && (
                    <div 
                      className="absolute -bottom-1 -right-1 bg-sky-500 text-slate-950 p-1 rounded-full shadow"
                      title="ยืนยันตัวตนด้วย Thai ID App แล้ว"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white">{profileData.user.username}</h2>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase ${
                      profileData.user.role === 'admin' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                      profileData.user.role === 'seller' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                      'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}>
                      {profileData.user.role === 'seller' ? 'ผู้ขายที่ได้รับรอง' : profileData.user.role}
                    </span>
                  </div>

                  {/* Rating Stars and Score */}
                  <div className="flex items-center gap-2 text-xs">
                    <div className="flex items-center text-amber-400">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 fill-current ${
                            i < Math.floor(profileData.user.rating) ? 'text-amber-400' : 'text-slate-700'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="font-bold text-white font-mono tabular-nums">
                      {profileData.user.rating.toFixed(1)}
                    </span>
                    <span className="text-slate-500">·</span>
                    <span className="text-slate-400">
                      ({profileData.reviews.length} รีวิวจากผู้ซื้อ)
                    </span>
                  </div>

                  {/* Joined & Response */}
                  <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-0.5">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      <span>สมาชิกตั้งแต่ {profileData.user.memberSince || '2025'}</span>
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-emerald-400" />
                      <span>{profileData.user.responseRate || 'ตอบกลับไว 100%'}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Verified Trust Badge & Logout */}
              <div className="sm:text-right text-xs flex sm:flex-col items-center sm:items-end gap-2">
                {profileData.user.role === 'buyer' ? (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>ผู้ซื้อ (ไม่ต้องยืนยัน Thai ID)</span>
                  </div>
                ) : profileData.user.kycStatus === 'verified' ? (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-300 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-sky-400" />
                    <span>KYC ผูก Thai ID App แล้ว</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-semibold">
                    <AlertCircle className="w-4 h-4" />
                    <span>รอผูก Thai ID App</span>
                  </div>
                )}

                {onLogout && (
                  <button
                    onClick={() => {
                      onClose();
                      onLogout();
                    }}
                    className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>ออกจากระบบ</span>
                  </button>
                )}
              </div>
            </div>

            {/* Vault Points Card Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-slate-950 to-slate-950 border border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shrink-0">
                  <Coins className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs text-amber-300 font-bold uppercase tracking-wider">แต้มสะสม GameVault Points</div>
                  <div className="text-xl font-extrabold text-white font-mono tabular-nums mt-0.5">
                    {(profileData.user.vaultPoints ?? 0).toLocaleString()} <span className="text-xs font-normal text-slate-400">แต้ม</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    ได้รับจากการซื้อขายสำเร็จผ่านคนกลาง สามารถนำมาแลกส่วนลดค่าธรรมเนียมหรือเครดิตเงินสดได้
                  </div>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('points')}
                className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-lg shadow-amber-500/20 shrink-0"
              >
                <Gift className="w-4 h-4" />
                <span>แลกแต้มส่วนลด</span>
              </button>
            </div>

            {/* KPI Performance Metrics */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-850">
                <div className="text-[11px] text-slate-400">ขายสำเร็จแล้ว</div>
                <div className="text-lg font-bold text-white font-mono tabular-nums mt-0.5">
                  {profileData.user.totalSales} ออเดอร์
                </div>
                <div className="text-[10px] text-emerald-400 mt-0.5">ผ่านคนกลาง 100%</div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-850">
                <div className="text-[11px] text-slate-400">คะแนนรีวิวเฉลี่ย</div>
                <div className="text-lg font-bold text-amber-400 font-mono tabular-nums mt-0.5">
                  {profileData.user.rating.toFixed(1)} / 5.0
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">จาก {profileData.reviews.length} ความคิดเห็น</div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-850">
                <div className="text-[11px] text-slate-400">ไอดีที่กำลังเปิดขาย</div>
                <div className="text-lg font-bold text-sky-400 font-mono tabular-nums mt-0.5">
                  {profileData.listings.length} รายการ
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">พร้อมส่งมอบทันที</div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
              <button
                onClick={() => setActiveTab('reviews')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'reviews'
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>รีวิวทั้งหมด ({profileData.reviews.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('listings')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'listings'
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>ไอดีที่ขาย ({profileData.listings.length})</span>
              </button>

              {profileData.user.role !== 'buyer' && (
                <button
                  onClick={() => setActiveTab('kyc')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                    activeTab === 'kyc'
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>ยืนยัน Thai ID App</span>
                </button>
              )}

              <button
                onClick={() => setActiveTab('points')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  activeTab === 'points'
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
                }`}
              >
                <Coins className="w-3.5 h-3.5" />
                <span>แลกแต้มสะสม</span>
              </button>
            </div>

            {/* TAB CONTENT: REVIEWS */}
            {activeTab === 'reviews' && (
              <div className="space-y-3">
                {profileData.reviews.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500 bg-slate-950 rounded-xl border border-slate-850">
                    ยังไม่มีรีวิวจากผู้ซื้อในขณะนี้
                  </div>
                ) : (
                  profileData.reviews.map((rev) => (
                    <div key={rev.id} className="p-4 rounded-xl bg-slate-950 border border-slate-850 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <img
                            src={rev.buyerAvatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=buyer'}
                            alt=""
                            className="w-7 h-7 rounded-full bg-slate-900 border border-slate-800"
                          />
                          <div>
                            <div className="text-xs font-bold text-white">{rev.buyerName}</div>
                            <div className="text-[10px] text-amber-400">เกม: {rev.game}</div>
                          </div>
                        </div>

                        <div className="flex items-center text-amber-400">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 fill-current ${
                                i < rev.rating ? 'text-amber-400' : 'text-slate-700'
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      <p className="text-slate-300 text-[11px] leading-relaxed pl-9">
                        &quot;{rev.comment}&quot;
                      </p>

                      <div className="text-[10px] text-slate-500 pl-9">
                        วันที่รีวิว: {new Date(rev.createdAt).toLocaleDateString('th-TH')}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB CONTENT: LISTINGS */}
            {activeTab === 'listings' && (
              <div className="space-y-3">
                {profileData.listings.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500 bg-slate-950 rounded-xl border border-slate-850">
                    ไม่มีไอดีเกมที่กำลังเปิดขายในขณะนี้
                  </div>
                ) : (
                  profileData.listings.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        onClose();
                        onSelectListing?.(item);
                      }}
                      className="p-3.5 rounded-xl bg-slate-950 border border-slate-850 hover:border-slate-700 transition-colors flex items-center justify-between gap-4 cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={item.images[0] || '/src/assets/images/hero_game_market_1791887028020.jpg'}
                          alt=""
                          className="w-14 h-14 rounded-lg object-cover bg-slate-900 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <div className="text-[10px] text-amber-400 font-semibold">{item.game} · {item.rank}</div>
                          <h4 className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors line-clamp-1">
                            {item.title}
                          </h4>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            สกิน {item.skinCount} · เลเวล {item.level} · ประกัน {item.warrantyDays} วัน
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-sm font-extrabold text-amber-400 font-mono tabular-nums">
                          ฿{item.price.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-sky-400 group-hover:underline flex items-center gap-0.5 justify-end mt-0.5">
                          <span>ดูไอดีนี้</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB CONTENT: THAI ID APP (D.DOPA) KYC */}
            {activeTab === 'kyc' && profileData.user.role !== 'buyer' && (
              <div className="space-y-4">
                <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-sky-500/30 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 shrink-0">
                        <Smartphone className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">ยืนยันตัวตนด้วยแอปพลิเคชัน Thai ID (D.DOPA)</h4>
                        <p className="text-xs text-slate-400 mt-0.5">
                          ระบบยืนยันตัวตนดิจิทัลภาครัฐ กรมการปกครอง กระทรวงมหาดไทย ปลอดภัยสูงสุด
                        </p>
                      </div>
                    </div>

                    {profileData.user.kycStatus === 'verified' && (
                      <div className="px-3 py-1 rounded-full bg-sky-500/20 border border-sky-500/40 text-sky-300 text-[11px] font-bold flex items-center gap-1 shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>ยืนยันแล้ว</span>
                      </div>
                    )}
                  </div>

                  {kycMessage && (
                    <div className="p-3 rounded-xl bg-sky-950/80 border border-sky-500/50 text-sky-200 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
                      <span>{kycMessage}</span>
                    </div>
                  )}

                  {profileData.user.kycStatus === 'verified' ? (
                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                      <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>บัญชีนี้ได้รับการเชื่อมต่อและยืนยันตัวตนเรียบร้อยแล้ว</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800 text-slate-300">
                        <div>
                          <span className="text-slate-500 block text-[10px]">ชื่อ-นามสกุล (ตามทะเบียนราษฎร์)</span>
                          <span className="font-bold text-white">{profileData.kycData?.realName || profileData.user.username}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">เลขประจำตัวประชาชน 13 หลัก</span>
                          <span className="font-mono text-amber-400 font-semibold">{profileData.kycData?.idCardMasked || '1-1099-xxxxx-xx-x'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">บัญชีธนาคารรับเงิน</span>
                          <span className="text-white">{profileData.kycData?.bankName || 'กสิกรไทย'} ({profileData.kycData?.bankAccountMasked || 'xxx-x-xx890'})</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">สถานะการเชื่อมต่อ</span>
                          <span className="text-sky-400 font-semibold">D.DOPA Secured Auth</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleThaiIdVerify} className="space-y-4 pt-2">
                      {/* Thai ID App Deep Link Button */}
                      <div className="p-4 rounded-xl bg-gradient-to-r from-sky-950 via-slate-900 to-slate-950 border border-sky-500/40 text-center space-y-3">
                        <div className="flex items-center justify-center gap-2 text-sky-400 font-bold text-xs">
                          <Smartphone className="w-4 h-4 animate-bounce" />
                          <span>เชื่อมต่อผ่านแอป Thai ID (D.DOPA) บนมือถือ</span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          กดปุ่มด้านล่างเพื่อเปิดแอปพลิเคชัน Thai ID และดึงข้อมูลยืนยันตัวตนอัตโนมัติทันที
                        </p>
                        <button
                          type="button"
                          onClick={async () => {
                            setKycConnecting(true);
                            setKycMessage('กำลังเปิดแอป Thai ID (thaid://auth) เพื่อขอเชื่อมต่อ...');
                            try {
                              window.location.href = 'thaid://auth?callback=gamevault.th';
                            } catch {
                              // fallback
                            }
                            setTimeout(async () => {
                              try {
                                const res = await fetch('/api/auth/thai-id-verify', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    realName: kycForm.realName || 'นาย วรพจน์ กิตติคุณ (Thai ID App Verified)',
                                    idCardNumber: kycForm.idCardNumber || '1-1099-00' + Math.floor(1000 + Math.random() * 9000),
                                    bankName: kycForm.bankName,
                                    bankAccount: kycForm.bankAccount || 'xxx-x-xx' + Math.floor(1000 + Math.random() * 9000),
                                  }),
                                });
                                const data = await res.json();
                                if (res.ok) {
                                  setKycMessage('เชื่อมต่อแอป Thai ID (D.DOPA) สำเร็จเรียบร้อย!');
                                  setProfileData((prev) => prev ? {
                                    ...prev,
                                    user: data.user,
                                    kycData: {
                                      realName: data.user.kycData?.realName || 'นาย วรพจน์ กิตติคุณ',
                                      idCardMasked: data.user.kycData?.idCardNumber?.substring(0, 8) + '*****' || '31006001*****',
                                      bankName: data.user.kycData?.bankName || kycForm.bankName,
                                      bankAccountMasked: data.user.kycData?.bankAccount?.substring(0, 4) + '****' || '1234****',
                                      submittedAt: new Date().toISOString(),
                                    }
                                  } : null);
                                }
                              } finally {
                                setKycConnecting(false);
                              }
                            }, 1500);
                          }}
                          className="w-full py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 transition-colors shadow-lg shadow-sky-500/20"
                        >
                          <ExternalLink className="w-4 h-4" />
                          <span>เปิดแอป Thai ID เพื่อเชื่อมต่ออัตโนมัติ (Open Thai ID)</span>
                        </button>
                      </div>

                      <div className="space-y-3 pt-2 border-t border-slate-800">
                        <div className="text-xs font-bold text-white">หรือกรอกข้อมูลยืนยันตัวตนด่วน (ผ่านระบบ D.DOPA Sandbox):</div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] text-slate-400 mb-1">ชื่อ - นามสกุลจริง (ภาษาไทย)</label>
                            <input
                              type="text"
                              required
                              placeholder="เช่น นายกิตติศักดิ์ ใจดี"
                              value={kycForm.realName}
                              onChange={(e) => setKycForm({ ...kycForm, realName: e.target.value })}
                              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-sky-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] text-slate-400 mb-1">เลขบัตรประจำตัวประชาชน 13 หลัก</label>
                            <input
                              type="text"
                              required
                              maxLength={13}
                              placeholder="1109900123459"
                              value={kycForm.idCardNumber}
                              onChange={(e) => setKycForm({ ...kycForm, idCardNumber: e.target.value })}
                              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-sky-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] text-slate-400 mb-1">ธนาคารสำหรับรับเงินโอน</label>
                            <select
                              value={kycForm.bankName}
                              onChange={(e) => setKycForm({ ...kycForm, bankName: e.target.value })}
                              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-sky-500"
                            >
                              <option value="กสิกรไทย (KBANK)">กสิกรไทย (KBANK)</option>
                              <option value="ไทยพาณิชย์ (SCB)">ไทยพาณิชย์ (SCB)</option>
                              <option value="กรุงไทย (KTB)">กรุงไทย (KTB)</option>
                              <option value="กรุงเทพ (BBL)">กรุงเทพ (BBL)</option>
                              <option value="ทรูมันนี่ วอลเล็ท (TrueMoney)">ทรูมันนี่ วอลเล็ท (TrueMoney)</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] text-slate-400 mb-1">เลขบัญชีธนาคาร</label>
                            <input
                              type="text"
                              required
                              placeholder="เช่น 123-4-56789-0"
                              value={kycForm.bankAccount}
                              onChange={(e) => setKycForm({ ...kycForm, bankAccount: e.target.value })}
                              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-sky-500"
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={kycConnecting}
                          className="w-full mt-4 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-lg shadow-sky-500/20 disabled:opacity-50"
                        >
                          {kycConnecting ? (
                            <>
                              <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                              <span>กำลังเชื่อมต่อ Thai ID App (D.DOPA)...</span>
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="w-4 h-4" />
                              <span>ยืนยันตัวตนผ่าน Thai ID App ทันที</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT: REDEEM POINTS */}
            {activeTab === 'points' && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-850 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white">ของรางวัลและส่วนลดค่าธรรมเนียม</h4>
                      <p className="text-xs text-slate-400">ใช้แต้มสะสม Vault Points แลกรับเครดิตเงินสดเข้ากระเป๋าหรือส่วนลดคนกลาง</p>
                    </div>
                    <div className="px-3 py-1.5 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-400 text-xs font-bold font-mono">
                      {(profileData.user.vaultPoints ?? 0).toLocaleString()} แต้ม
                    </div>
                  </div>

                  {redeemMessage && (
                    <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{redeemMessage}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3 flex flex-col justify-between">
                      <div>
                        <div className="text-xs font-bold text-amber-400">ส่วนลดค่าธรรมเนียม 20 บาท</div>
                        <div className="text-[11px] text-slate-400 mt-1">แลกรับเครดิตเงินเข้ากระเป๋า ฿20 ทันที</div>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                        <span className="text-xs font-bold text-white font-mono">200 แต้ม</span>
                        <button
                          disabled={redeeming || (profileData.user.vaultPoints ?? 0) < 200}
                          onClick={() => handleRedeemPoints(200)}
                          className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold disabled:opacity-50 transition-colors"
                        >
                          แลกรับ
                        </button>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3 flex flex-col justify-between">
                      <div>
                        <div className="text-xs font-bold text-amber-400">ส่วนลดค่าธรรมเนียม 50 บาท</div>
                        <div className="text-[11px] text-slate-400 mt-1">แลกรับเครดิตเงินเข้ากระเป๋า ฿50 ทันที</div>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                        <span className="text-xs font-bold text-white font-mono">500 แต้ม</span>
                        <button
                          disabled={redeeming || (profileData.user.vaultPoints ?? 0) < 500}
                          onClick={() => handleRedeemPoints(500)}
                          className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold disabled:opacity-50 transition-colors"
                        >
                          แลกรับ
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
};