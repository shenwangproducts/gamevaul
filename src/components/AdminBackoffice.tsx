import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  DollarSign, 
  Users, 
  FileText, 
  Activity, 
  Check, 
  Trash2,
  ExternalLink,
  ShieldAlert,
  Clock,
  Settings
} from 'lucide-react';
import { 
  AdminStats, 
  Order, 
  WalletTransaction, 
  User, 
  GameAccountListing, 
  SecurityAuditLog 
} from '../types';

interface AdminBackofficeProps {
  stats: AdminStats | null;
  orders: Order[];
  transactions: WalletTransaction[];
  users: User[];
  listings: GameAccountListing[];
  auditLogs: SecurityAuditLog[];
  onResolveDispute: (orderId: string, resolution: 'refund_buyer' | 'release_seller', adminNotes: string) => Promise<void>;
  onTransactionAction: (txId: string, action: 'approve' | 'reject') => Promise<void>;
  onKycAction: (userId: string, action: 'approve' | 'reject') => Promise<void>;
  onDeleteListing: (listingId: string) => Promise<void>;
  onAdminReleasePayout: (orderId: string) => Promise<void>;
  onRefresh: () => void;
}

export const AdminBackoffice: React.FC<AdminBackofficeProps> = ({
  stats,
  orders,
  transactions,
  users,
  listings,
  auditLogs,
  onResolveDispute,
  onTransactionAction,
  onKycAction,
  onDeleteListing,
  onAdminReleasePayout,
  onRefresh,
}) => {
  const pendingDisputes = orders.filter(o => o.status === 'disputed');
  const inspectingOrders = orders.filter(o => o.status === 'buyer_inspecting' || o.status === 'escrow_held');
  const pendingSlips = transactions.filter(t => t.type === 'topup' && t.status === 'pending');
  const pendingKyc = users.filter(u => u.kycStatus === 'pending');

  const [activeTab, setActiveTab] = useState<'reports' | 'disputes' | 'slips' | 'kyc' | 'listings' | 'audit' | 'settings'>('reports');
  const [adminNotes, setAdminNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [promptPaySetting, setPromptPaySetting] = useState('0982349812');
  const [stripePublishableKey, setStripePublishableKey] = useState('mk_1TIROuK7RYVKA5ApUYPbYl3H');
  const [stripeSecretKey, setStripeSecretKey] = useState('mk_1TISTGK7RYVKA5ApQrMUY1wK');
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  useEffect(() => {
    fetch('/api/admin/merchant-settings')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          if (data.merchantPromptPayNumber) setPromptPaySetting(data.merchantPromptPayNumber);
          if (data.stripePublishableKey) setStripePublishableKey(data.stripePublishableKey);
          if (data.stripeSecretKey) setStripeSecretKey(data.stripeSecretKey);
        }
      })
      .catch(() => {});
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsLoading(true);
    setSettingsSuccess(false);
    try {
      const res = await fetch('/api/admin/merchant-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          promptPayNumber: promptPaySetting, 
          stripePublishableKey, 
          stripeSecretKey,
          xenditSecretKey: stripeSecretKey
        })
      });
      const data = await res.json();
      if (data.success) {
        setSettingsSuccess(true);
      }
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleDispute = async (orderId: string, resolution: 'refund_buyer' | 'release_seller') => {
    setActionLoading(true);
    try {
      await onResolveDispute(orderId, resolution, adminNotes);
      setAdminNotes('');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      
      {/* Backoffice Header */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-rose-900/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-rose-400 uppercase tracking-wide">
            <ShieldAlert className="w-4 h-4" />
            <span>Secure Admin Command Center (หลังบ้าน)</span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1">
            ระบบบริหารจัดการความปลอดภัย & คนกลางกักเงิน
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            ควบคุมการตัดสินข้อพิพาท, อนุมัติสลิปโอนเงิน PromptPay, ตรวจสอบบัตรประชาชน KYC และประวัติความปลอดภัย
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-semibold transition-colors"
        >
          รีเฟรชข้อมูลหลังบ้าน
        </button>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>เงินกักในคนกลาง (Escrow)</span>
            <Lock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-extrabold text-amber-400 font-mono tabular-nums mt-2">
            ฿{stats?.activeEscrowAmount.toLocaleString() ?? '0'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">อยู่ในระหว่างตรวจไอดี 24 ชม.</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>ข้อพิพาทรอตัดสิน</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-xl font-extrabold text-rose-400 font-mono tabular-nums mt-2">
            {pendingDisputes.length} คดี
          </div>
          <div className="text-[11px] text-slate-500 mt-1">ผู้ซื้อแจ้งรหัสมีปัญหา</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>สลิปเติมเงินรอตรวจ</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-extrabold text-emerald-400 font-mono tabular-nums mt-2">
            {pendingSlips.length} รายการ
          </div>
          <div className="text-[11px] text-slate-500 mt-1">PromptPay QR Transfer</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>ผู้ขายรอบัตร ปชช. (KYC)</span>
            <Users className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-xl font-extrabold text-sky-400 font-mono tabular-nums mt-2">
            {pendingKyc.length} ราย
          </div>
          <div className="text-[11px] text-slate-500 mt-1">ตรวจสอบความถูกต้อง</div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-800 overflow-x-auto text-xs font-semibold gap-2">
        <button
          onClick={() => setActiveTab('reports')}
          className={`py-2.5 px-4 rounded-t-lg transition-colors flex items-center gap-2 border-b-2 whitespace-nowrap ${
            activeTab === 'reports'
              ? 'border-emerald-400 text-emerald-400 bg-emerald-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>รายงานตรวจไอดี & โอนเงินผู้ขาย ({inspectingOrders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('disputes')}
          className={`py-2.5 px-4 rounded-t-lg transition-colors flex items-center gap-2 border-b-2 whitespace-nowrap ${
            activeTab === 'disputes'
              ? 'border-rose-400 text-rose-400 bg-rose-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>ตัดสินข้อพิพาทคนกลาง ({pendingDisputes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('slips')}
          className={`py-2.5 px-4 rounded-t-lg transition-colors flex items-center gap-2 border-b-2 whitespace-nowrap ${
            activeTab === 'slips'
              ? 'border-emerald-400 text-emerald-400 bg-emerald-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" />
          <span>ตรวจสลิปเติมเงิน ({pendingSlips.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('kyc')}
          className={`py-2.5 px-4 rounded-t-lg transition-colors flex items-center gap-2 border-b-2 whitespace-nowrap ${
            activeTab === 'kyc'
              ? 'border-sky-400 text-sky-400 bg-sky-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>อนุมัติผู้ขาย KYC ({pendingKyc.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('listings')}
          className={`py-2.5 px-4 rounded-t-lg transition-colors flex items-center gap-2 border-b-2 whitespace-nowrap ${
            activeTab === 'listings'
              ? 'border-amber-400 text-amber-400 bg-amber-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>จัดการรายการไอดี ({listings.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`py-2.5 px-4 rounded-t-lg transition-colors flex items-center gap-2 border-b-2 whitespace-nowrap ${
            activeTab === 'audit'
              ? 'border-purple-400 text-purple-400 bg-purple-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>บันทึกความปลอดภัย Audit Logs ({auditLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`py-2.5 px-4 rounded-t-lg transition-colors flex items-center gap-2 border-b-2 whitespace-nowrap ${
            activeTab === 'settings'
              ? 'border-amber-400 text-amber-400 bg-amber-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          <span>ตั้งค่า PromptPay & Xendit</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div className="space-y-4">
        
        {/* PANEL: BUYER INSPECTION REPORTS & PAYOUTS */}
        {activeTab === 'reports' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
              <div>
                <span className="font-semibold text-white">หน้าที่ของคนกลาง (Escrow Officer):</span>{' '}
                ตรวจสอบว่าผู้ซื้อแจ้งผลการเข้าไอดีมาอย่างไร หากผู้ซื้อแจ้งว่าเข้าได้เรียบร้อย ให้กดปุ่มอนุมัติโอนเงินให้ผู้ขาย
              </div>
            </div>

            {inspectingOrders.length === 0 ? (
              <div className="p-8 rounded-xl bg-slate-900 border border-slate-800 text-center text-xs text-slate-400">
                ไม่มีคำสั่งซื้อที่อยู่ระหว่างตรวจสอบไอดีในขณะนี้
              </div>
            ) : (
              inspectingOrders.map((order) => (
                <div
                  key={order.id}
                  className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-lg"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                    <div>
                      <span className="text-xs font-semibold text-amber-400">
                        คำสั่งซื้อ #{order.id} · {order.game}
                      </span>
                      <h4 className="text-sm font-bold text-white mt-0.5">{order.listingTitle}</h4>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-400">ยอดเงินในตู้นิรภัยคนกลาง</div>
                      <div className="text-lg font-bold text-amber-400 font-mono tabular-nums">
                        ฿{order.price.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-850 space-y-1.5">
                      <span className="text-slate-500 block text-[11px]">ข้อมูลคู่สัญญา:</span>
                      <div>ผู้ซื้อ: <span className="text-white font-medium">{order.buyerName}</span></div>
                      <div>ผู้ขาย: <span className="text-white font-medium">{order.sellerName}</span></div>
                      <div className="text-slate-500 text-[10px]">เวลาสั่งซื้อ: {new Date(order.createdAt).toLocaleString('th-TH')}</div>
                    </div>

                    <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-850 space-y-1.5">
                      <span className="text-slate-500 block text-[11px]">สถานะรายงานจากผู้ซื้อถึงคนกลาง:</span>
                      {order.buyerReportStatus === 'confirmed_working' ? (
                        <div className="space-y-1 text-emerald-300">
                          <div className="font-bold flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span>ผู้ซื้อแจ้งว่า: เข้าไอดีได้แล้ว / เปลี่ยนอีเมลสำเร็จ</span>
                          </div>
                          {order.buyerReportNotes && (
                            <p className="text-[11px] text-slate-300 bg-slate-900 p-2 rounded">
                              &quot;{order.buyerReportNotes}&quot;
                            </p>
                          )}
                        </div>
                      ) : order.buyerReportStatus === 'has_issue' ? (
                        <div className="space-y-1 text-rose-300">
                          <div className="font-bold flex items-center gap-1.5">
                            <AlertTriangle className="w-4 h-4 text-rose-400" />
                            <span>ผู้ซื้อแจ้งว่า: ติดปัญหาเข้าไม่ได้</span>
                          </div>
                          {order.buyerReportNotes && (
                            <p className="text-[11px] text-slate-300 bg-slate-900 p-2 rounded">
                              &quot;{order.buyerReportNotes}&quot;
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="text-amber-400 flex items-center gap-1.5">
                          <Clock className="w-4 h-4" />
                          <span>ยังไม่มีรายงานจากผู้ซื้อ (อยู่ระหว่างทดสอบ 24 ชม.)</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Escrow Release Payout Button for Admin */}
                  <div className="pt-2 flex gap-3">
                    <button
                      onClick={() => onAdminReleasePayout(order.id)}
                      disabled={actionLoading}
                      className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        คนกลางอนุมัติส่งเงิน ฿{order.price.toLocaleString()} ให้ผู้ขาย ({order.sellerName})
                      </span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* PANEL 1: DISPUTES RESOLVER */}
        {activeTab === 'disputes' && (
          <div className="space-y-4">
            {pendingDisputes.length === 0 ? (
              <div className="p-8 rounded-xl bg-slate-900 border border-slate-800 text-center text-xs text-slate-400">
                ไม่มีข้อพิพาทคงค้างในระบบ ทุกรายการซื้อขายดำเนินไปอย่างราบรื่น
              </div>
            ) : (
              pendingDisputes.map((order) => (
                <div
                  key={order.id}
                  className="p-5 rounded-2xl bg-slate-900 border border-rose-900/50 space-y-4 shadow-lg"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                    <div>
                      <span className="text-xs font-semibold text-rose-400">
                        ข้อพิพาทคำสั่งซื้อ #{order.id}
                      </span>
                      <h4 className="text-sm font-bold text-white mt-0.5">{order.listingTitle}</h4>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-400">ยอดเงินที่ถูกอายัด</div>
                      <div className="text-base font-bold text-amber-400 font-mono tabular-nums">
                        ฿{order.price.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 space-y-1">
                      <span className="text-slate-500 block text-[11px]">ข้อมูลคู่สัญญา:</span>
                      <div>ผู้ซื้อ: <span className="text-white font-medium">{order.buyerName}</span></div>
                      <div>ผู้ขาย: <span className="text-white font-medium">{order.sellerName}</span></div>
                    </div>

                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 space-y-1">
                      <span className="text-rose-400 font-semibold block text-[11px]">เหตุผลที่แจ้งอายัด:</span>
                      <div className="text-slate-200">{order.disputeReason}</div>
                      {order.disputeEvidenceUrl && (
                        <div className="pt-1">
                          <a
                            href={order.disputeEvidenceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sky-400 hover:underline flex items-center gap-1"
                          >
                            <span>ดูภาพหลักฐาน</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Admin Adjudication Form */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                    <label className="block text-xs font-semibold text-slate-300">
                      บันทึกคำวินิจฉัยของแอดมินคนกลาง:
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น ตรวจสอบพบรหัสผ่านใช้ไม่ได้จริง คืนเงินเต็มจำนวนให้ผู้ซื้อ..."
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-rose-400"
                    />

                    <div className="flex gap-3 pt-1">
                      <button
                        onClick={() => handleDispute(order.id, 'refund_buyer')}
                        disabled={actionLoading}
                        className="flex-1 py-2 rounded-lg text-xs font-bold bg-rose-500 hover:bg-rose-400 text-white transition-colors flex items-center justify-center gap-1.5"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>ตัดสินคืนเงินให้ผู้ซื้อ (Refund ฿{order.price.toLocaleString()})</span>
                      </button>

                      <button
                        onClick={() => handleDispute(order.id, 'release_seller')}
                        disabled={actionLoading}
                        className="flex-1 py-2 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>ตัดสินโอนเงินให้ผู้ขาย (Release ฿{order.price.toLocaleString()})</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* PANEL 2: TOPUP SLIPS */}
        {activeTab === 'slips' && (
          <div className="space-y-4">
            {pendingSlips.length === 0 ? (
              <div className="p-8 rounded-xl bg-slate-900 border border-slate-800 text-center text-xs text-slate-400">
                ไม่มีสลิปเติมเงินรอตรวจสอบ
              </div>
            ) : (
              pendingSlips.map((tx) => (
                <div
                  key={tx.id}
                  className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs"
                >
                  <div>
                    <div className="font-bold text-white text-sm">
                      เติมเงินพร้อมเพย์ ฿{tx.amount.toLocaleString()}
                    </div>
                    <div className="text-slate-400 mt-0.5">
                      ผู้ใช้: <span className="text-slate-200">{tx.userName}</span> · รหัสอ้างอิง: <span className="font-mono text-amber-400">{tx.referenceCode}</span>
                    </div>
                    <div className="text-slate-500 text-[11px] mt-0.5">
                      เวลาแจ้ง: {new Date(tx.createdAt).toLocaleString('th-TH')}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onTransactionAction(tx.id, 'approve')}
                      className="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center gap-1.5 transition-colors"
                    >
                      <Check className="w-4 h-4" />
                      <span>อนุมัติเติมเงิน</span>
                    </button>
                    <button
                      onClick={() => onTransactionAction(tx.id, 'reject')}
                      className="px-3 py-2 rounded-lg text-xs font-medium bg-rose-950/40 text-rose-300 hover:bg-rose-900/40 border border-rose-900/50 transition-colors"
                    >
                      ปฏิเสธ
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* PANEL 3: KYC APPROVALS */}
        {activeTab === 'kyc' && (
          <div className="space-y-4">
            {pendingKyc.length === 0 ? (
              <div className="p-8 rounded-xl bg-slate-900 border border-slate-800 text-center text-xs text-slate-400">
                ไม่มีเอกสารยืนยันตัวตน KYC รอการตรวจสอบ
              </div>
            ) : (
              pendingKyc.map((u) => (
                <div
                  key={u.id}
                  className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs"
                >
                  <div className="space-y-1">
                    <div className="font-bold text-white text-sm">
                      {u.kycData?.realName || u.username} ({u.username})
                    </div>
                    <div className="text-slate-400">
                      เลขบัตรประชาชน: <span className="font-mono text-slate-200 font-medium">{u.kycData?.idCardNumber}</span>
                    </div>
                    <div className="text-slate-400">
                      ธนาคาร: <span className="text-slate-200">{u.kycData?.bankName}</span> ({u.kycData?.bankAccount})
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onKycAction(u.id, 'approve')}
                      className="px-4 py-2 rounded-lg text-xs font-bold bg-sky-500 hover:bg-sky-400 text-slate-950 flex items-center gap-1.5 transition-colors"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>อนุมัติผู้ขาย KYC</span>
                    </button>
                    <button
                      onClick={() => onKycAction(u.id, 'reject')}
                      className="px-3 py-2 rounded-lg text-xs font-medium bg-rose-950/40 text-rose-300 hover:bg-rose-900/40 border border-rose-900/50 transition-colors"
                    >
                      ไม่อนุมัติ
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* PANEL 4: LISTINGS MODERATION */}
        {activeTab === 'listings' && (
          <div className="space-y-3">
            {listings.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-4 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-slate-950 overflow-hidden shrink-0">
                    <img
                      src={item.images[0] || '/src/assets/images/hero_game_market_1791887028020.jpg'}
                      alt=""
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div>
                    <div className="font-bold text-white line-clamp-1">{item.title}</div>
                    <div className="text-slate-400 mt-0.5">
                      {item.game} · {item.rank} · ผู้ขาย: {item.sellerName}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <span className="font-mono font-bold text-amber-400">
                    ฿{item.price.toLocaleString()}
                  </span>
                  <button
                    onClick={() => onDeleteListing(item.id)}
                    className="p-2 text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors"
                    title="ลบประกาศนี้"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PANEL 5: SECURITY AUDIT LOGS */}
        {activeTab === 'audit' && (
          <div className="space-y-2">
            <div className="text-xs text-slate-400 mb-2">
              บันทึกการกระทำที่สำคัญและระบบความปลอดภัย (Security Audit Trail):
            </div>
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-lg bg-slate-950 border border-slate-850 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-amber-400 font-semibold">[{log.action}]</span>
                    <span className="text-slate-200">{log.details}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    โดย: {log.actor} · หมวดหมู่: {log.category}
                  </div>
                </div>

                <div className="text-right text-[11px] text-slate-500 shrink-0">
                  <div>{new Date(log.timestamp).toLocaleString('th-TH')}</div>
                  <div className="text-[10px] text-slate-600">IP: {log.ipAddress}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PANEL 6: SETTINGS PROMPTPAY & STRIPE */}
        {activeTab === 'settings' && (
          <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 space-y-6">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Settings className="w-4 h-4 text-amber-400" />
                <span>ตั้งค่าระบบชำระเงิน Stripe & พร้อมเพย์ (Shenwang Ent.)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                กำหนดคีย์ Stripe และเบอร์พร้อมเพย์รับเงินสำหรับระบบเติมเงินอัตโนมัติ
              </p>
            </div>

            {settingsSuccess && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>บันทึกการตั้งค่า Stripe & พร้อมเพย์สำเร็จเรียบร้อย!</span>
              </div>
            )}

            <form onSubmit={handleSaveSettings} className="space-y-4 max-w-xl">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  หมายเลขพร้อมเพย์ร้านค้า (เบอร์โทร 10 หลัก หรือ เลขเสียภาษี 13 หลัก)
                </label>
                <input
                  type="text"
                  value={promptPaySetting}
                  onChange={(e) => setPromptPaySetting(e.target.value)}
                  placeholder="เช่น 0982349812 หรือ 0812345678"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-amber-400"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  * เบอร์ที่ผูกพร้อมเพย์กับบัญชีธนาคารจริงของร้าน สำหรับรับยอดเงินโอนเข้าบัญชีทันที
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Stripe Key 1 (Publishable / Public Key หรือ Key ID)
                </label>
                <input
                  type="text"
                  value={stripePublishableKey}
                  onChange={(e) => setStripePublishableKey(e.target.value)}
                  placeholder="mk_1TIROuK7RYVKA5ApUYPbYl3H หรือ pk_live_..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-amber-400"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  * กำหนดค่าเริ่มต้นเป็น: <span className="font-mono text-amber-400">mk_1TIROuK7RYVKA5ApUYPbYl3H</span>
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Stripe Key 2 (Secret / Restricted Key หรือ Key ID)
                </label>
                <input
                  type="text"
                  value={stripeSecretKey}
                  onChange={(e) => setStripeSecretKey(e.target.value)}
                  placeholder="mk_1TISTGK7RYVKA5ApQrMUY1wK หรือ sk_live_..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-amber-400"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  * กำหนดค่าเริ่มต้นเป็น: <span className="font-mono text-amber-400">mk_1TISTGK7RYVKA5ApQrMUY1wK</span>
                </p>
              </div>

              <button
                type="submit"
                disabled={settingsLoading}
                className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition-colors shadow"
              >
                {settingsLoading ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า Stripe & PromptPay'}
              </button>
            </form>

            <div className="pt-6 border-t border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-white">คำแนะนำการตั้งค่า Stripe Dashboard</h4>
              <div className="space-y-1.5 text-xs text-slate-400 leading-relaxed">
                <div>1. ระบบเชื่อมต่อ Stripe ด้วย Key ID: <strong className="text-amber-400 font-mono">mk_1TIROuK7RYVKA5ApUYPbYl3H</strong> และ <strong className="text-amber-400 font-mono">mk_1TISTGK7RYVKA5ApQrMUY1wK</strong> เรียบร้อยแล้ว</div>
                <div>2. สามารถตรวจสอบรายละเอียดหรือสร้าง API Key เพิ่มเติมได้ที่ <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noreferrer" className="text-amber-400 underline">dashboard.stripe.com/apikeys</a></div>
                <div>3. หากต้องการให้เซิร์ฟเวอร์ยิง API ตรวจสอบตรงกับ Stripe สามารถนำ Secret Key ที่ขึ้นต้นด้วย <strong className="text-white font-mono">sk_live_...</strong> หรือ <strong className="text-white font-mono">rk_live_...</strong> มาใส่ในช่อง Stripe Key 2 ได้ทุกเมื่อ</div>
                <div>4. ระบบ Webhook ของเว็บไซต์นี้รองรับสัญญาณอัตโนมัติจาก Stripe ผ่าน <code className="text-white bg-slate-950 px-1.5 py-0.5 rounded font-mono">/api/stripe/webhook</code></div>
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
};
