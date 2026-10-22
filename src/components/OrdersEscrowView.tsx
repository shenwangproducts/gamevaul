import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Copy, 
  Check, 
  AlertTriangle, 
  Clock, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  RefreshCw,
  Sparkles,
  Send,
  HelpCircle,
  MessageSquare
} from 'lucide-react';
import { Order, User } from '../types';

interface OrdersEscrowViewProps {
  orders: Order[];
  currentUser: User | null;
  onConfirmRelease: (orderId: string) => Promise<void>;
  onOpenDispute: (orderId: string, reason: string, evidenceUrl?: string) => Promise<void>;
  onReportInspection: (orderId: string, status: 'confirmed_working' | 'has_issue', notes: string) => Promise<void>;
  onSubmitReview: (orderId: string, rating: number, comment: string) => Promise<void>;
  onAdminReleasePayout?: (orderId: string) => Promise<void>;
  onRefresh: () => void;
}

export const OrdersEscrowView: React.FC<OrdersEscrowViewProps> = ({
  orders,
  currentUser,
  onConfirmRelease,
  onOpenDispute,
  onReportInspection,
  onSubmitReview,
  onAdminReleasePayout,
  onRefresh,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [activeDisputeOrderId, setActiveDisputeOrderId] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeEvidence, setDisputeEvidence] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Inspection check-in state
  const [activeReportOrderId, setActiveReportOrderId] = useState<string | null>(null);
  const [reportNotes, setReportNotes] = useState('');

  // Review states per order
  const [activeReviewOrderId, setActiveReviewOrderId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const togglePasswordVisibility = (orderId: string) => {
    setRevealedPasswords(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  const submitDispute = async (orderId: string) => {
    if (!disputeReason) return;
    setActionLoading(true);
    try {
      await onOpenDispute(orderId, disputeReason, disputeEvidence);
      setActiveDisputeOrderId(null);
      setDisputeReason('');
      setDisputeEvidence('');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendReport = async (orderId: string, status: 'confirmed_working' | 'has_issue') => {
    setActionLoading(true);
    try {
      await onReportInspection(orderId, status, reportNotes);
      setActiveReportOrderId(null);
      setReportNotes('');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReviewSubmit = async (orderId: string) => {
    setReviewSubmitting(true);
    try {
      await onSubmitReview(orderId, reviewRating, reviewComment);
      setActiveReviewOrderId(null);
      setReviewComment('');
    } finally {
      setReviewSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      
      {/* Header Banner & Who is the Escrow (คนกลางคือใคร) */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wide">
              <ShieldCheck className="w-4 h-4" />
              <span>Escrow Vault & Middleman Communication Center</span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1">
              ศูนย์จัดการคำสั่งซื้อและระบบคนกลางกักเงิน
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              ตรวจดูรหัสผ่านไอดี แจ้งผลการเข้าเกมให้คนกลางทราบ และให้คะแนนรีวิวผู้ขาย
            </p>
          </div>

          <button
            onClick={onRefresh}
            className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-medium flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>รีเฟรชสถานะ</span>
          </button>
        </div>

        {/* Middleman Protocol Clarification */}
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-slate-300 flex items-start gap-3">
          <HelpCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold text-amber-300">
              ใครคือคนกลาง? และเงินจะไปถึงผู้ขายได้อย่างไร?
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              <strong>คนกลางคือระบบ GameVault และเจ้าหน้าที่แอดมินกลาง (Escrow Officer):</strong> เมื่อผู้ซื้อชำระเงิน ยอดเงินจะถูกกักไว้ในตู้นิรภัยคนกลาง ผู้ขายยังไม่ได้รับเงินจนกว่าผู้ซื้อจะได้รับไอดีและตรวจสอบเข้าเกม 
              เมื่อผู้ซื้อเข้าเกมและเปลี่ยนอีเมลได้เรียบร้อย ให้กดปุ่ม <strong>&quot;แจ้งคนกลางว่าเข้าไอดีได้แล้ว&quot;</strong> หรือกดยืนยันปล่อยเงิน ระบบคนกลางจะทำการส่งมอบเงินเข้ากระเป๋าผู้ขายอย่างปลอดภัย 100%
            </p>
          </div>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
            <Lock className="w-6 h-6 text-slate-500" />
          </div>
          <h3 className="text-base font-semibold text-white">ยังไม่มีรายการคำสั่งซื้อผ่านคนกลาง</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            เมื่อคุณสั่งซื้อไอดีเกมจากตลาด ระบบจะนำข้อมูลการส่งมอบและสถานะกักเงินมาแสดงที่นี่โดยอัตโนมัติ
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {orders.map((order) => {
            const isBuyer = order.buyerId === currentUser?.id;
            const isSeller = order.sellerId === currentUser?.id;
            const isInspecting = order.status === 'buyer_inspecting';
            const isDisputed = order.status === 'disputed';
            const isCompleted = order.status === 'completed';
            const isRefunded = order.status === 'refunded';

            return (
              <div
                key={order.id}
                className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-lg"
              >
                {/* Order Top Bar */}
                <div className="px-5 py-3.5 bg-slate-950/70 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-white">
                      คำสั่งซื้อ #{order.id}
                    </span>
                    <span className="text-slate-400 font-mono">
                      {new Date(order.createdAt).toLocaleString('th-TH')}
                    </span>
                    <span className="text-slate-400">·</span>
                    <span className="text-amber-400 font-semibold">{order.game}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">
                      {isBuyer ? `ผู้ขาย: ${order.sellerName}` : `ผู้ซื้อ: ${order.buyerName}`}
                    </span>
                    
                    {/* Status Badge */}
                    <span className={`px-2.5 py-0.5 rounded text-xs font-semibold ${
                      isInspecting ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                      isDisputed ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30' :
                      isCompleted ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                      'bg-slate-800 text-slate-400'
                    }`}>
                      {isInspecting ? 'อยู่ระหว่างตรวจสอบไอดี (เงินกักในคนกลาง)' :
                       isDisputed ? 'เปิดข้อพิพาท (เงินถูกอายัด)' :
                       isCompleted ? 'สำเร็จเรียบร้อย (โอนเงินให้ผู้ขายแล้ว)' :
                       isRefunded ? 'คืนเงินให้ผู้ซื้อแล้ว' : order.status}
                    </span>
                  </div>
                </div>

                {/* Order Main Content */}
                <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-6">
                  
                  {/* Left Column: Account Credentials */}
                  <div className="lg:col-span-7 space-y-4">
                    <div>
                      <h4 className="text-sm font-bold text-white">{order.listingTitle}</h4>
                      <div className="text-xs text-slate-400 mt-1">
                        ยอดเงินคนกลาง: <span className="font-bold text-amber-400 font-mono tabular-nums">฿{order.price.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Encrypted Credentials Box */}
                    {order.credentialsRevealed ? (
                      <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/30 space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-amber-400 flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5" />
                            <span>ข้อมูลเข้าใช้งานไอดีเกม (ส่งมอบปลอดภัย)</span>
                          </span>
                          <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>ถอดรหัสจากตู้นิรภัยคนกลางแล้ว</span>
                          </span>
                        </div>

                        {/* Username Field */}
                        <div className="flex items-center justify-between bg-slate-900 px-3 py-2 rounded-lg border border-slate-800 text-xs">
                          <div>
                            <span className="text-slate-500 block text-[10px]">Username / Email:</span>
                            <span className="font-mono text-white font-medium select-all">
                              {order.credentials.usernameOrEmail}
                            </span>
                          </div>
                          <button
                            onClick={() => handleCopy(order.credentials.usernameOrEmail, `user_${order.id}`)}
                            className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800"
                            title="คัดลอก"
                          >
                            {copiedField === `user_${order.id}` ? (
                              <Check className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>

                        {/* Password Field */}
                        <div className="flex items-center justify-between bg-slate-900 px-3 py-2 rounded-lg border border-slate-800 text-xs">
                          <div>
                            <span className="text-slate-500 block text-[10px]">Password (รหัสผ่าน):</span>
                            <span className="font-mono text-white font-medium select-all">
                              {revealedPasswords[order.id] ? order.credentials.password : '••••••••••••••••'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => togglePasswordVisibility(order.id)}
                              className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800"
                              title="ดูรหัสผ่าน"
                            >
                              {revealedPasswords[order.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => handleCopy(order.credentials.password, `pass_${order.id}`)}
                              className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-800"
                              title="คัดลอกรหัสผ่าน"
                            >
                              {copiedField === `pass_${order.id}` ? (
                                <Check className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Recovery / Notes */}
                        {order.credentials.twoFactorOrRecovery && (
                          <div className="text-xs bg-slate-900/60 p-2.5 rounded-lg border border-slate-850">
                            <span className="text-slate-500 block text-[10px]">2FA / รหัสกู้คืน:</span>
                            <span className="text-slate-300 font-mono text-[11px]">
                              {order.credentials.twoFactorOrRecovery}
                            </span>
                          </div>
                        )}

                        {/* Instructions */}
                        {order.credentials.changeEmailGuide && (
                          <div className="text-xs bg-slate-900/60 p-2.5 rounded-lg border border-slate-850">
                            <span className="text-slate-500 block text-[10px]">คำแนะนำการเปลี่ยนอีเมล:</span>
                            <span className="text-slate-300 text-[11px]">
                              {order.credentials.changeEmailGuide}
                            </span>
                          </div>
                        )}

                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400">
                        ข้อมูลรหัสผ่านจะเปิดเผยเมื่อผู้ซื้อชำระเงินเรียบร้อย
                      </div>
                    )}
                  </div>

                  {/* Right Column: Escrow Actions, Report to Escrow & Review */}
                  <div className="lg:col-span-5 p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between space-y-4">
                    
                    {/* Inspection Clock Notice */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-xs text-slate-300">
                        <Clock className="w-4 h-4 text-amber-400" />
                        <span className="font-semibold">เวลารับประกันตรวจสอบไอดี (24 ชม.)</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        โปรดเข้าเกมและเปลี่ยนอีเมลให้เรียบร้อย หากเข้าได้ให้แจ้งคนกลางเพื่อปล่อยเงินให้ผู้ขาย หรือหากติดปัญหาให้แจ้งคนกลางทันที
                      </p>
                    </div>

                    {/* Buyer Inspection Report Status */}
                    {order.buyerReportStatus && (
                      <div className={`p-3 rounded-xl border text-xs space-y-1 ${
                        order.buyerReportStatus === 'confirmed_working'
                          ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                          : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                      }`}>
                        <div className="font-bold flex items-center gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>
                            {order.buyerReportStatus === 'confirmed_working'
                              ? 'คุณได้แจ้งคนกลางแล้ว: เข้าไอดีได้เรียบร้อย'
                              : 'คุณได้แจ้งคนกลางแล้ว: พบปัญหาเข้าไม่ได้'}
                          </span>
                        </div>
                        {order.buyerReportNotes && (
                          <div className="text-[11px] text-slate-300 bg-slate-950/70 p-2 rounded mt-1">
                            {order.buyerReportNotes}
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400 mt-1">
                          แจ้งเมื่อ: {order.buyerReportedAt ? new Date(order.buyerReportedAt).toLocaleString('th-TH') : 'ล่าสุด'}
                        </div>
                      </div>
                    )}

                    {/* Dispute Info if already disputed */}
                    {isDisputed && (
                      <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs space-y-1.5">
                        <div className="font-semibold text-rose-300 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>ข้อพิพาทกำลังอยู่ในการตรวจสอบของเจ้าหน้าที่คนกลาง</span>
                        </div>
                        <div className="text-[11px] text-slate-300">
                          สาเหตุ: {order.disputeReason}
                        </div>
                        {order.adminNotes && (
                          <div className="text-[11px] text-amber-300 mt-1 border-t border-rose-500/20 pt-1">
                            ความเห็นคนกลาง: {order.adminNotes}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action 1: Buyer Inspection Report Form to Middleman */}
                    {isBuyer && isInspecting && (
                      <div className="space-y-2 pt-2">
                        
                        {/* Notify Middleman options */}
                        <div className="space-y-2">
                          <button
                            onClick={() => setActiveReportOrderId(activeReportOrderId === order.id ? null : order.id)}
                            className="w-full py-2 px-3 rounded-lg text-xs font-semibold bg-amber-400/10 text-amber-300 border border-amber-400/30 hover:bg-amber-400/20 transition-colors flex items-center justify-center gap-1.5"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>แจ้งผลการเข้าไอดีให้คนกลางทราบ</span>
                          </button>

                          {activeReportOrderId === order.id && (
                            <div className="p-3 rounded-xl bg-slate-900 border border-slate-750 space-y-2 text-xs">
                              <label className="block text-slate-300 font-semibold">
                                ข้อความแจ้งคนกลาง (เข้าได้ไหม ติดปัญหาอะไร):
                              </label>
                              <textarea
                                rows={2}
                                placeholder="เช่น เข้าเกมได้ปกติ เปลี่ยนอีเมลแล้ว คนกลางส่งเงินให้ผู้ขายได้เลยครับ..."
                                value={reportNotes}
                                onChange={(e) => setReportNotes(e.target.value)}
                                className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-400"
                              />

                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  onClick={() => handleSendReport(order.id, 'confirmed_working')}
                                  disabled={actionLoading}
                                  className="py-2 px-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[11px] transition-colors"
                                >
                                  เข้าได้ (แจ้งคนกลางส่งเงิน)
                                </button>
                                <button
                                  onClick={() => handleSendReport(order.id, 'has_issue')}
                                  disabled={actionLoading}
                                  className="py-2 px-2 rounded-lg bg-rose-500 hover:bg-rose-400 text-white font-bold text-[11px] transition-colors"
                                >
                                  ติดปัญหา (แจ้งอายัดเงิน)
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Confirm inspection: sends request to Admin middleman to release funds */}
                          {order.buyerReportStatus === 'confirmed_working' ? (
                            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs text-center font-medium">
                              ✓ คุณยืนยันตรวจสอบผ่านแล้ว รอแอดมินคนกลางกดอนุมัติส่งเงินเข้าบัญชีผู้ขาย
                            </div>
                          ) : (
                            <button
                              onClick={() => onConfirmRelease(order.id)}
                              className="w-full py-2.5 px-3 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors flex items-center justify-center gap-2 shadow"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>ไอดีถูกต้องเรียบร้อย (แจ้งแอดมินคนกลางให้ส่งเงินให้ผู้ขาย)</span>
                            </button>
                          )}

                          <button
                            onClick={() => setActiveDisputeOrderId(activeDisputeOrderId === order.id ? null : order.id)}
                            className="w-full py-1.5 px-3 rounded-lg text-xs font-medium bg-rose-950/40 hover:bg-rose-900/40 text-rose-300 border border-rose-900/60 transition-colors flex items-center justify-center gap-1.5"
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>เปิดข้อพิพาท / อายัดเงิน</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Action: Admin Middleman Direct Payout Release */}
                    {currentUser?.role === 'admin' && isInspecting && (
                      <div className="p-3 rounded-xl bg-slate-900 border border-rose-500/30 space-y-2.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-rose-300 flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-rose-400" />
                            <span>สิทธิ์คนกลาง (Admin Escrow Control)</span>
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 font-mono">
                            OFFICER
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-300">
                          {order.buyerReportStatus === 'confirmed_working' ? (
                            <span className="text-emerald-300 font-semibold">
                              ✓ ผู้ซื้อแจ้งว่าเข้าไอดีได้แล้ว คุณสามารถกดส่งเงินให้ผู้ขายได้ทันที
                            </span>
                          ) : (
                            <span>
                              เงินกักในคนกลาง ฿{order.price.toLocaleString()} รอแอดมินตรวจสอบและกดส่งเงินให้ผู้ขาย
                            </span>
                          )}
                        </div>

                        {onAdminReleasePayout && (
                          <button
                            onClick={() => onAdminReleasePayout(order.id)}
                            className="w-full py-2.5 px-3 rounded-lg text-xs font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 transition-colors flex items-center justify-center gap-1.5 shadow"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>กดส่งเงินให้ผู้ขาย (฿{order.price.toLocaleString()})</span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* Dispute Form Drawer */}
                    {activeDisputeOrderId === order.id && (
                      <div className="p-3 rounded-xl bg-slate-900 border border-rose-500/40 space-y-3">
                        <div className="text-xs font-semibold text-rose-300">
                          ระบุปัญหาเพื่ออายัดเงินคนกลาง:
                        </div>
                        <textarea
                          rows={2}
                          placeholder="เช่น รหัสผ่านผิด, ติด 2FA เบอร์เดิม, สกินไม่ตรงตามที่ประกาศ..."
                          value={disputeReason}
                          onChange={(e) => setDisputeReason(e.target.value)}
                          className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-rose-400"
                        />
                        <input
                          type="text"
                          placeholder="ลิงก์รูปภาพหลักฐาน (ถ้ามี)"
                          value={disputeEvidence}
                          onChange={(e) => setDisputeEvidence(e.target.value)}
                          className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-rose-400"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => submitDispute(order.id)}
                            disabled={actionLoading || !disputeReason}
                            className="flex-1 py-1.5 rounded-lg text-xs font-bold bg-rose-500 hover:bg-rose-400 text-white transition-colors"
                          >
                            ส่งเรื่องอายัดเงิน
                          </button>
                          <button
                            onClick={() => setActiveDisputeOrderId(null)}
                            className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
                          >
                            ยกเลิก
                          </button>
                        </div>
                      </div>
                    )}

                    {/* RATING & REVIEW SECTION (When Order Completed) */}
                    {isCompleted && (
                      <div className="space-y-3 pt-2 border-t border-slate-800">
                        <div className="text-xs text-emerald-400 flex items-center gap-1.5 justify-center py-1">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>ธุรกรรมคนกลางเสร็จสิ้นเรียบร้อยแล้ว</span>
                        </div>

                        {/* If Buyer hasn't reviewed yet */}
                        {isBuyer && !order.reviewSubmitted && (
                          <div className="p-3.5 rounded-xl bg-slate-900 border border-amber-500/30 space-y-2.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-amber-300 flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>ให้คะแนน & รีวิวผู้ขาย ({order.sellerName})</span>
                              </span>
                            </div>

                            {/* Stars selector */}
                            <div className="flex items-center gap-1 justify-center py-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  type="button"
                                  onClick={() => setReviewRating(star)}
                                  className="text-xl transition-transform hover:scale-125 focus:outline-none"
                                >
                                  <span className={star <= reviewRating ? 'text-amber-400' : 'text-slate-600'}>
                                    ★
                                  </span>
                                </button>
                              ))}
                              <span className="text-xs text-amber-400 font-mono font-bold ml-2">
                                {reviewRating} ดาว
                              </span>
                            </div>

                            <textarea
                              rows={2}
                              placeholder="เขียนรีวิว เช่น ได้รับไอดีตรงปก รหัสเปลี่ยนได้ทันที คนกลางปล่อยเงินไวมาก..."
                              value={reviewComment}
                              onChange={(e) => setReviewComment(e.target.value)}
                              className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-400"
                            />

                            <button
                              onClick={() => handleReviewSubmit(order.id)}
                              disabled={reviewSubmitting}
                              className="w-full py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>{reviewSubmitting ? 'กำลังบันทึกรีวิว...' : 'บันทึกรีวิวสร้างความน่าเชื่อถือ'}</span>
                            </button>
                          </div>
                        )}

                        {/* If Review already exists */}
                        {order.reviewSubmitted && order.review && (
                          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1.5">
                            <div className="flex items-center justify-between text-slate-400">
                              <span>รีวิวของคุณสำหรับผู้ขายนี้:</span>
                              <div className="flex text-amber-400 text-xs">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <span key={i} className={i < order.review!.rating ? 'text-amber-400' : 'text-slate-700'}>
                                    ★
                                  </span>
                                ))}
                              </div>
                            </div>
                            <p className="text-slate-200 text-[11px] italic bg-slate-900 p-2 rounded">
                              &quot;{order.review.comment}&quot;
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
