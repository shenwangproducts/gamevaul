import React, { useState } from 'react';
import { 
  X, 
  Wallet, 
  QrCode, 
  ArrowUpRight, 
  ArrowDownLeft, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Sparkles,
  Building,
  History,
  Lock,
  ShieldCheck,
  Send,
  ExternalLink,
  ChevronRight,
  Download,
  Info,
  Check
} from 'lucide-react';
import { User, WalletTransaction, Order } from '../types';

interface WalletModalProps {
  currentUser: User | null;
  transactions: WalletTransaction[];
  orders?: Order[];
  activeEscrowAmount?: number;
  onClose: () => void;
  onTopupRequest: (amount: number, slipUrl?: string) => Promise<WalletTransaction>;
  onAutoVerifyTopup: (txId: string) => Promise<void>;
  onWithdrawRequest: (amount: number, bankName: string, accountNumber: string, accountName: string) => Promise<void>;
  onAdminReleasePayout?: (orderId: string) => Promise<void>;
  onGoToEscrowOrders?: () => void;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const WalletModal: React.FC<WalletModalProps> = ({
  currentUser,
  transactions,
  orders = [],
  activeEscrowAmount,
  onClose,
  onTopupRequest,
  onAutoVerifyTopup,
  onWithdrawRequest,
  onAdminReleasePayout,
  onGoToEscrowOrders,
  showToast,
}) => {
  const isAdmin = currentUser?.role === 'admin';
  const calculatedEscrowTotal = activeEscrowAmount !== undefined
    ? activeEscrowAmount
    : orders
        .filter(o => o.status === 'buyer_inspecting' || o.status === 'escrow_held' || o.status === 'disputed')
        .reduce((sum, o) => sum + o.price, 0);

  const escrowOrders = orders.filter(
    o => o.status === 'buyer_inspecting' || o.status === 'escrow_held' || o.status === 'disputed'
  );

  const [activeTab, setActiveTab] = useState<'topup' | 'withdraw' | 'history' | 'escrow'>(
    isAdmin && calculatedEscrowTotal > 0 ? 'escrow' : 'topup'
  );
  
  // Topup State
  const [topupAmount, setTopupAmount] = useState('1000');
  const [generatedTx, setGeneratedTx] = useState<WalletTransaction | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<{
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
  } | null>(null);
  const [topupSuccessData, setTopupSuccessData] = useState<{
    amount: number;
    referenceCode: string;
    newBalance?: number;
  } | null>(null);
  const [confirmingTxId, setConfirmingTxId] = useState<string | null>(null);

  // Withdraw State
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [bankName, setBankName] = useState('ธนาคารกสิกรไทย (KBANK)');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  // Admin Escrow Release Action State
  const [releasingOrderId, setReleasingOrderId] = useState<string | null>(null);

  const presets = [10, 20, 50, 100, 500, 1000];

  const handleGenerateQR = async () => {
    const amt = Number(topupAmount);
    if (!amt || amt < 10) {
      setStatusFeedback({
        type: 'error',
        message: 'Stripe กำหนดขั้นต่ำการชำระเงินสกุลเงินบาท (THB) ที่ 10 บาทขึ้นไป กรุณาระบุยอดเงินอย่างน้อย 10 บาท',
      });
      return;
    }
    setStatusFeedback(null);
    setTopupSuccessData(null);
    try {
      const res = await fetch('/api/gbprimepay/generate-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amt }),
      });
      const data = await res.json();
      if (res.ok && data.transaction) {
        setGeneratedTx(data.transaction);
        if (data.qrCodeDataUrl) setQrDataUrl(data.qrCodeDataUrl);
      } else {
        setStatusFeedback({
          type: 'error',
          message: data.error || 'ไม่สามารถสร้าง QR Code จาก Stripe ได้ กรุณาระบุจำนวนเงินใหม่อีกครั้ง',
        });
      }
    } catch (err) {
      setStatusFeedback({
        type: 'error',
        message: 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง',
      });
    }
  };

  const handleConfirmPaid = async (customTx?: WalletTransaction) => {
    const target = customTx || generatedTx;
    if (!target) return;
    setIsVerifying(true);
    setStatusFeedback(null);

    try {
      const res = await fetch('/api/wallet/confirm-topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referenceCode: target.referenceCode,
          transactionId: target.id,
        }),
      });
      const data = await res.json();

      if (res.ok && data.approved) {
        setTopupSuccessData({
          amount: target.amount,
          referenceCode: target.referenceCode,
          newBalance: data.newBalance,
        });

        setStatusFeedback({
          type: 'success',
          message: `ยืนยันการโอนเงินสำเร็จ! ยอดเงิน ฿${target.amount.toLocaleString()} โอนเข้า Stripe และปรับเข้ากระเป๋าเรียบร้อยแล้ว`,
        });

        if (showToast) {
          showToast(`เติมเงินสำเร็จ ฿${target.amount.toLocaleString()} ยอดเงินเข้ากระเป๋าเรียบร้อย`, 'success');
        }
      } else {
        setStatusFeedback({
          type: 'warning',
          message: data.error || 'ยังไม่พบยอดโอนเงินในระบบ Stripe (สถานะ: รอดำเนินการ) กรุณาสแกน QR Code และทำรายการโอนผ่านแอปธนาคารให้เสร็จสิ้นก่อนกดยืนยัน',
        });
      }
    } catch (err: any) {
      console.error('Failed to confirm topup:', err);
      setStatusFeedback({
        type: 'error',
        message: 'เกิดข้อผิดพลาดในการเชื่อมต่อเพื่อตรวจสอบยอดเงิน กรุณาลองใหม่อีกครั้ง',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCheckXenditStatus = async () => {
    if (!generatedTx) return;
    setIsVerifying(true);
    setStatusFeedback(null);
    try {
      const res = await fetch(`/api/stripe/status/${generatedTx.referenceCode}`);
      const data = await res.json();
      if (res.ok && data.approved) {
        try {
          await onAutoVerifyTopup(generatedTx.id);
        } catch {
          // Handled
        }
        setTopupSuccessData({
          amount: generatedTx.amount,
          referenceCode: generatedTx.referenceCode,
          newBalance: data.newBalance,
        });
        setStatusFeedback({
          type: 'success',
          message: 'ตรวจสอบการชำระเงินผ่าน Stripe Gateway สำเร็จ! ยอดเงินเข้ากระเป๋าเรียบร้อยแล้ว',
        });
        if (showToast) {
          showToast(`เติมเงินสำเร็จ ฿${generatedTx.amount.toLocaleString()} ยอดเงินเข้ากระเป๋าแล้ว`, 'success');
        }
      } else {
        setStatusFeedback({
          type: 'info',
          message: data.message || `สถานะปัจจุบันจาก Stripe: ${data.status || 'PENDING'} (หากท่านโอนเงินผ่านแอปธนาคารเรียบร้อยแล้ว กรุณากดปุ่มสีเขียว "ฉันโอนเงินแล้ว" ด้านล่าง เพื่อปรับยอดเงินเข้ากระเป๋าทันที)`,
        });
      }
    } catch (err) {
      console.error('Failed to check Stripe status:', err);
      setStatusFeedback({
        type: 'warning',
        message: 'ระบบพร้อมเพย์และ Stripe พร้อมใช้งาน หากคุณโอนเงินผ่าน PromptPay แล้ว สามารถกดปุ่มสีเขียว "ฉันโอนเงินแล้ว" ด้านล่างเพื่อปรับยอดเงินเข้ากระเป๋าทันทีได้เลย',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawError(null);
    const amt = Number(withdrawAmount);
    if (!amt || amt <= 0) {
      setWithdrawError('กรุณาระบุจำนวนเงินที่ถูกต้อง');
      return;
    }
    if (amt > (currentUser?.balance || 0)) {
      setWithdrawError('ยอดเงินคงเหลือไม่เพียงพอ');
      return;
    }
    if (!accountNumber || !accountName) {
      setWithdrawError('กรุณากรอกเลขบัญชีและชื่อบัญชีให้ครบถ้วน');
      return;
    }

    try {
      await onWithdrawRequest(amt, bankName, accountNumber, accountName);
      setWithdrawSuccess(true);
      setWithdrawAmount('');
      setTimeout(() => setWithdrawSuccess(false), 4000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setWithdrawError(err.message);
      } else {
        setWithdrawError('เกิดข้อผิดพลาดในการส่งคำขอถอนเงิน');
      }
    }
  };

  const handleReleaseEscrow = async (orderId: string) => {
    if (!onAdminReleasePayout) return;
    setReleasingOrderId(orderId);
    try {
      await onAdminReleasePayout(orderId);
    } finally {
      setReleasingOrderId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-4 sm:my-6">
        
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-slate-800 bg-slate-950/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">กระเป๋าเงิน GameVault Wallet</h3>
                {isAdmin && (
                  <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase">
                    Admin Officer
                  </span>
                )}
              </div>
              
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mt-0.5">
                <div>
                  ยอดคงเหลือ {isAdmin ? '(บัญชีคนกลาง Escrow Vault)' : ''}:{' '}
                  <span className="font-bold text-amber-400 font-mono tabular-nums">
                    ฿{(isAdmin ? calculatedEscrowTotal : (currentUser?.balance ?? 0)).toLocaleString()}
                  </span>
                </div>

                {/* Always show Escrow Held for Admin or if system holds escrow */}
                {!isAdmin && calculatedEscrowTotal > 0 && (
                  <div className="flex items-center gap-1 text-sky-400">
                    <span>·</span>
                    <Lock className="w-3 h-3 text-sky-400" />
                    <span>เงินกักในคนกลาง (Escrow):</span>
                    <span className="font-bold font-mono tabular-nums text-sky-300">
                      ฿{calculatedEscrowTotal.toLocaleString()}
                    </span>
                  </div>
                )}

              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 sm:static p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher - Responsive Horizontal Scroll */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 text-xs font-semibold overflow-x-auto scrollbar-none">
          {/* TAB: ESCROW VAULT (For Admin or Users with Escrow) */}
          {(isAdmin || calculatedEscrowTotal > 0) && (
            <button
              onClick={() => setActiveTab('escrow')}
              className={`flex-1 min-w-[130px] py-3 px-3 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap ${
                activeTab === 'escrow'
                  ? 'border-sky-400 text-sky-300 bg-sky-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Lock className="w-4 h-4 text-sky-400" />
              <span>เงินกักคนกลาง ({escrowOrders.length})</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('topup')}
            className={`flex-1 min-w-[120px] py-3 px-3 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === 'topup'
                ? 'border-amber-400 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
            <span>เติมเงิน (PromptPay)</span>
          </button>
          <button
            onClick={() => setActiveTab('withdraw')}
            className={`flex-1 min-w-[110px] py-3 px-3 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === 'withdraw'
                ? 'border-amber-400 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowUpRight className="w-4 h-4 text-sky-400" />
            <span>ถอนเงิน</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 min-w-[110px] py-3 px-3 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap ${
              activeTab === 'history'
                ? 'border-amber-400 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-4 h-4 text-slate-400" />
            <span>ประวัติธุรกรรม</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-4 sm:p-6 max-h-[75vh] overflow-y-auto">
          
          {/* TAB: ESCROW VAULT (เงินกักในคนกลาง) */}
          {activeTab === 'escrow' && (
            <div className="space-y-4">
              {/* Escrow Pool Overview Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950/40 border border-sky-500/30 shadow-lg space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-semibold text-sky-400">
                    <ShieldCheck className="w-4 h-4 text-sky-400" />
                    <span>บัญชีกลางรับฝากเงิน (GameVault Escrow Vault)</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/20 font-bold">
                    คุ้มครอง 100%
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <div className="text-[11px] text-slate-400">ยอดเงินกักในคนกลางทั้งหมด (Escrow Balance)</div>
                    <div className="text-2xl sm:text-3xl font-extrabold text-sky-300 font-mono tabular-nums mt-0.5">
                      ฿{calculatedEscrowTotal.toLocaleString()}
                    </div>
                  </div>
                  <div className="text-xs text-slate-400 sm:text-right">
                    <div>คำสั่งซื้อที่กักเงินอยู่: <span className="font-bold text-white font-mono">{escrowOrders.length}</span> รายการ</div>
                    <div className="text-[11px] text-amber-400 mt-0.5">รอส่งมอบให้ผู้ขายเมื่อผู้ซื้อตรวจผ่าน</div>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  เงินในส่วนนี้ถูกล็อคไว้ในตู้เซฟคนกลาง ผู้ซื้อได้หักเงินไปแล้วแต่ผู้ขายยังไม่ได้รับเงิน 
                  จนกว่าผู้ซื้อจะตรวจสอบไอดีผ่านและแอดมินคนกลางกด <strong>&quot;ส่งเงินให้ผู้ขาย&quot;</strong>
                </p>
              </div>

              {/* List of Orders in Escrow */}
              <div className="space-y-2.5">
                <div className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>รายการคำสั่งซื้อที่เงินถูกกักในระบบ ({escrowOrders.length})</span>
                  {onGoToEscrowOrders && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onGoToEscrowOrders();
                      }}
                      className="text-[11px] text-sky-400 hover:underline flex items-center gap-1"
                    >
                      <span>ไปที่หน้าคนกลาง</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {escrowOrders.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500 bg-slate-950 rounded-xl border border-slate-800">
                    ไม่มียอดเงินกักในคนกลางในขณะนี้
                  </div>
                ) : (
                  escrowOrders.map((order) => {
                    const isBuyerConfirmed = order.buyerReportStatus === 'confirmed_working';
                    const hasIssue = order.buyerReportStatus === 'has_issue' || order.status === 'disputed';

                    return (
                      <div
                        key={order.id}
                        className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5 text-xs shadow-sm hover:border-slate-700 transition-colors"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <div className="font-bold text-white flex items-center gap-1.5">
                              <span className="text-amber-400">[{order.game}]</span>
                              <span className="line-clamp-1">{order.listingTitle}</span>
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              #{order.id} · ผู้ซื้อ: <span className="text-slate-300">{order.buyerName}</span> → ผู้ขาย: <span className="text-slate-300">{order.sellerName}</span>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="font-mono font-bold text-amber-400 text-sm tabular-nums">
                              ฿{order.price.toLocaleString()}
                            </div>
                            <span className={`text-[10px] px-2 py-0.5 rounded font-semibold inline-block mt-0.5 ${
                              isBuyerConfirmed
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : hasIssue
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}>
                              {isBuyerConfirmed ? '✓ ผู้ซื้อแจ้งตรวจไอดีผ่าน' :
                               hasIssue ? '⚠ ผู้ซื้อแจ้งปัญหา' : '⏳ รอผู้ซื้อตรวจไอดี 24 ชม.'}
                            </span>
                          </div>
                        </div>

                        {/* Direct Middleman Action: Release Payout */}
                        {isAdmin && onAdminReleasePayout && (
                          <div className="pt-2 border-t border-slate-850 flex flex-wrap items-center justify-between gap-2">
                            <div className="text-[10px] text-slate-400">
                              {isBuyerConfirmed
                                ? 'ผู้ซื้อแจ้งคนกลางแล้ว แอดมินกดส่งเงินให้ผู้ขายได้ทันที'
                                : 'แอดมินคนกลางสามารถส่งเงินให้ผู้ขายได้หลังยืนยัน'}
                            </div>

                            <button
                              onClick={() => handleReleaseEscrow(order.id)}
                              disabled={releasingOrderId === order.id}
                              className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow ${
                                isBuyerConfirmed
                                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 animate-pulse'
                                  : 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                              }`}
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>
                                {releasingOrderId === order.id
                                  ? 'กำลังส่งเงิน...'
                                  : `กดส่งเงินให้ผู้ขาย (฿${order.price.toLocaleString()})`}
                              </span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 1: TOPUP PROMPTPAY */}
          {activeTab === 'topup' && (
            <div className="space-y-5">
              {!generatedTx ? (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">
                      เลือกจำนวนเงินที่ต้องการเติม (บาท)
                    </label>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-3">
                      {presets.map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setTopupAmount(String(amt))}
                          className={`py-2 rounded-lg text-xs font-bold font-mono transition-colors border ${
                            topupAmount === String(amt)
                              ? 'bg-amber-400 text-slate-950 border-amber-400'
                              : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          ฿{amt.toLocaleString()}
                        </button>
                      ))}
                    </div>

                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs text-slate-500">฿</span>
                      <input
                        type="number"
                        min="10"
                        step="1"
                        placeholder="ระบุจำนวนเงินที่ต้องการ (ขั้นต่ำ 10 บาท)"
                        value={topupAmount}
                        onChange={(e) => setTopupAmount(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5 px-1">
                      <span>* ชำระเข้า Stripe (Shenwang Ent.) ขั้นต่ำ ฿10.00 บาท คิวเดียวจบ</span>
                      <span className="text-emerald-400">ไม่มีค่าธรรมเนียม</span>
                    </div>
                  </div>

                  {statusFeedback && (
                    <div className={`p-3 rounded-xl text-xs flex items-start gap-2.5 text-left ${
                      statusFeedback.type === 'error' ? 'bg-rose-500/15 border border-rose-500/40 text-rose-200' :
                      'bg-amber-500/15 border border-amber-500/40 text-amber-200'
                    }`}>
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <div className="flex-1 leading-relaxed">
                        {statusFeedback.message}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleGenerateQR}
                    className="w-full py-3 rounded-xl text-xs font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 flex items-center justify-center gap-2 transition-colors shadow-lg shadow-amber-400/20"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>สร้าง Dynamic QR Code (Stripe Gateway - Shenwang Ent.)</span>
                  </button>

                  <div className="text-[11px] text-slate-500 text-center leading-relaxed">
                    รองรับ Stripe API & PromptPay Webhook · ยอดเงินเข้ากระเป๋าอัตโนมัติทันทีเมื่อชำระเงินสำเร็จ
                  </div>
                </>
              ) : topupSuccessData ? (
                /* Topup Success Screen */
                <div className="py-6 px-4 rounded-2xl bg-slate-900 border border-emerald-500/30 text-center space-y-4 shadow-xl">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center mx-auto text-emerald-400">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                      ทำรายการสำเร็จเรียบร้อย
                    </div>
                    <h3 className="text-xl font-black text-white">
                      เติมเงินเข้ากระเป๋าสำเร็จ
                    </h3>
                    <div className="text-2xl font-black text-emerald-400 font-mono">
                      +฿{topupSuccessData.amount.toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 space-y-1 font-mono">
                    <div className="flex justify-between">
                      <span>รหัสอ้างอิง:</span>
                      <span className="text-white font-bold">{topupSuccessData.referenceCode}</span>
                    </div>
                    {topupSuccessData.newBalance !== undefined && (
                      <div className="flex justify-between pt-1 border-t border-slate-800/80">
                        <span>ยอดคงเหลือในกระเป๋า:</span>
                        <span className="text-amber-400 font-bold">฿{topupSuccessData.newBalance.toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setGeneratedTx(null);
                      setTopupSuccessData(null);
                      setStatusFeedback(null);
                      setActiveTab('history');
                    }}
                    className="w-full py-3 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors shadow-lg shadow-emerald-500/20"
                  >
                    ดูประวัติรายการ / เสร็จสิ้น
                  </button>
                </div>
              ) : (
                /* Generated PromptPay QR view */
                <div className="space-y-4 text-center">
                  <div className="p-4 rounded-2xl bg-white max-w-[280px] mx-auto text-slate-900 shadow-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-center gap-1.5 font-bold text-xs uppercase tracking-wider text-indigo-600">
                      <QrCode className="w-4 h-4" />
                      <span>Stripe PromptPay (Shenwang Ent.)</span>
                    </div>
                    <div className="text-[10px] text-slate-500">
                      กระเป๋าเงินส่วนตัวเฉพาะผู้ใช้: <span className="font-bold text-slate-800">{currentUser?.username}</span>
                    </div>

                    {/* Real Scannable QR Code */}
                    <div className="w-52 h-52 mx-auto bg-white p-2 rounded-xl border border-slate-200 flex items-center justify-center relative shadow-inner">
                      {qrDataUrl ? (
                        <img 
                          src={qrDataUrl} 
                          alt="PromptPay QR Code" 
                          className="w-full h-full object-contain rounded-lg" 
                        />
                      ) : (
                        <div className="text-xs text-slate-400">กำลังสร้าง QR Code จาก Stripe...</div>
                      )}
                    </div>

                    <div className="text-sm font-extrabold text-slate-900 font-mono">
                      ฿{generatedTx.amount.toLocaleString()}
                    </div>
                    
                    <div className="text-[10px] bg-slate-100 p-2 rounded-lg font-mono text-slate-700 space-y-1">
                      {generatedTx.stripePaymentIntentId ? (
                        <>
                          <div className="text-emerald-700 font-bold flex items-center justify-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            <span>Stripe Live: Shenwang Ent.</span>
                          </div>
                          <div className="text-[9px] text-slate-500 truncate">
                            ID: {generatedTx.stripePaymentIntentId}
                          </div>
                        </>
                      ) : (
                        <div>PromptPay: 098-234-9812</div>
                      )}
                      <div>Ref: {generatedTx.referenceCode}</div>
                    </div>

                    {generatedTx.stripeHostedInstructionsUrl && (
                      <a
                        href={generatedTx.stripeHostedInstructionsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold transition-colors border border-indigo-200"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>เปิดหน้าชำระเงิน Stripe (Hosted Page)</span>
                      </a>
                    )}

                    {qrDataUrl && (
                      <a
                        href={qrDataUrl}
                        download={`PromptPay_Shenwang_${generatedTx.referenceCode}.png`}
                        className="inline-flex items-center justify-center gap-1.5 w-full py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors shadow"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>ดาวน์โหลดรูป QR Code (PNG)</span>
                      </a>
                    )}
                  </div>

                  {/* Status Feedback Banner if present */}
                  {statusFeedback && (
                    <div className={`p-3 rounded-xl text-xs flex items-start gap-2.5 text-left ${
                      statusFeedback.type === 'success' ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-200' :
                      statusFeedback.type === 'info' ? 'bg-sky-500/15 border border-sky-500/40 text-sky-200' :
                      statusFeedback.type === 'warning' ? 'bg-amber-500/15 border border-amber-500/40 text-amber-200' :
                      'bg-rose-500/15 border border-rose-500/40 text-rose-200'
                    }`}>
                      {statusFeedback.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : statusFeedback.type === 'info' ? (
                        <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                      ) : statusFeedback.type === 'warning' ? (
                        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 leading-relaxed">
                        {statusFeedback.message}
                      </div>
                    </div>
                  )}

                  <div className="text-xs text-slate-300">
                    สแกนชำระผ่านแอปธนาคารใดก็ได้ แล้วกดปุ่มสีเขียวเพื่อยืนยันยอดเงิน
                  </div>

                  {/* Primary Green Confirmation Button + Secondary Gateway Check Button */}
                  <div className="space-y-2">
                    <button
                      onClick={() => handleConfirmPaid()}
                      disabled={isVerifying}
                      className="w-full py-3 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/30 active:scale-[0.98]"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{isVerifying ? 'กำลังตรวจสอบและปรับยอดเงิน...' : 'ฉันโอนเงินแล้ว (ยืนยันยอดเข้ากระเป๋าทันที)'}</span>
                    </button>

                    <div className="flex gap-2">
                      <button
                        onClick={handleCheckXenditStatus}
                        disabled={isVerifying}
                        className="flex-1 py-2 rounded-lg text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center gap-1.5 transition-colors border border-slate-700"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                        <span>ตรวจสอบสถานะผ่าน Stripe Gateway</span>
                      </button>

                      <button
                        onClick={() => {
                          setGeneratedTx(null);
                          setStatusFeedback(null);
                        }}
                        className="px-3 py-2 rounded-lg text-[11px] text-slate-400 hover:text-white bg-slate-900 border border-slate-800"
                      >
                        ยกเลิก
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: WITHDRAWAL */}
          {activeTab === 'withdraw' && (
            <form onSubmit={handleWithdrawSubmit} className="space-y-4">
              {withdrawSuccess && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>ส่งคำขอถอนเงินเรียบร้อย เจ้าหน้าที่หลังบ้านจะโอนเข้าบัญชีภายใน 1-2 ชั่วโมง</span>
                </div>
              )}

              {withdrawError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{withdrawError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  เลือกธนาคารปลายทาง
                </label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-400"
                >
                  <option value="ธนาคารกสิกรไทย (KBANK)">ธนาคารกสิกรไทย (KBANK)</option>
                  <option value="ธนาคารไทยพาณิชย์ (SCB)">ธนาคารไทยพาณิชย์ (SCB)</option>
                  <option value="ธนาคารกรุงไทย (KTB)">ธนาคารกรุงไทย (KTB)</option>
                  <option value="ธนาคารกรุงเทพ (BBL)">ธนาคารกรุงเทพ (BBL)</option>
                  <option value="พร้อมเพย์ (PromptPay)">พร้อมเพย์ (PromptPay)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  เลขที่บัญชี / เบอร์พร้อมเพย์ *
                </label>
                <input
                  type="text"
                  placeholder="เช่น 098-2-34981-2"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-amber-400"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  ชื่อ-นามสกุลเจ้าของบัญชี (ตรงกับ KYC) *
                </label>
                <input
                  type="text"
                  placeholder="เช่น นาย วรพจน์ กิตติคุณไพศาล"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-400"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  จำนวนเงินที่ต้องการถอน (บาท) *
                </label>
                <input
                  type="number"
                  placeholder={`สูงสุด ฿${currentUser?.balance.toLocaleString()}`}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-amber-400"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-400 text-slate-950 transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-sky-500/20"
              >
                <Building className="w-4 h-4" />
                <span>ยืนยันคำขอถอนเงิน</span>
              </button>
            </form>
          )}

          {/* TAB 3: TRANSACTION HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-3">
              {transactions.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">
                  ไม่มีประวัติการทำรายการ
                </div>
              ) : (
                transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-850 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-white">
                        {tx.type === 'topup' ? 'เติมเงิน PromptPay QR' :
                         tx.type === 'purchase_escrow' ? 'กักเงินคนกลางซื้อไอดี' :
                         tx.type === 'escrow_release' ? 'รับเงินค่าขายไอดีจากคนกลาง' :
                         tx.type === 'withdrawal' ? 'ถอนเงินเข้าบัญชีธนาคาร' :
                         tx.type === 'refund' ? 'รับเงินคืนจากคนกลาง' : tx.type}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {new Date(tx.createdAt).toLocaleString('th-TH')} · {tx.referenceCode}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className={`font-mono font-bold tabular-nums ${
                        tx.type === 'topup' || tx.type === 'escrow_release' || tx.type === 'refund'
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                      }`}>
                        {tx.type === 'topup' || tx.type === 'escrow_release' || tx.type === 'refund' ? '+' : '-'}
                        ฿{tx.amount.toLocaleString()}
                      </div>
                      <div className={`text-[10px] font-semibold mt-0.5 ${
                        tx.status === 'approved' ? 'text-emerald-400' :
                        tx.status === 'pending' ? 'text-amber-400' : 'text-rose-400'
                      }`}>
                        {tx.status === 'approved' ? 'สำเร็จ' :
                         tx.status === 'pending' ? 'รอตรวจสอบ' : 'ปฏิเสธ'}
                      </div>
                      {tx.type === 'topup' && tx.status === 'pending' && (
                        <button
                          onClick={() => {
                            setConfirmingTxId(tx.id);
                            handleConfirmPaid(tx).finally(() => setConfirmingTxId(null));
                          }}
                          disabled={confirmingTxId === tx.id}
                          className="mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center gap-1 transition-colors ml-auto shadow-sm"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{confirmingTxId === tx.id ? 'กำลังปรับยอด...' : 'ยืนยันโอนแล้ว'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
