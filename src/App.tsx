import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Search, 
  SlidersHorizontal, 
  Lock, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  Gamepad2,
  Sparkles,
  RefreshCw,
  Wallet,
  ShieldAlert,
  UserCheck
} from 'lucide-react';
import { 
  User, 
  UserRole,
  GameAccountListing, 
  Order, 
  WalletTransaction, 
  BlacklistEntry, 
  SecurityAuditLog, 
  AdminStats,
  GameCategory 
} from './types';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { ListingCard } from './components/ListingCard';
import { ListingDetailModal } from './components/ListingDetailModal';
import { SellListingModal } from './components/SellListingModal';
import { OrdersEscrowView } from './components/OrdersEscrowView';
import { WalletModal } from './components/WalletModal';
import { BlacklistChecker } from './components/BlacklistChecker';
import { AdminBackoffice } from './components/AdminBackoffice';
import { EscrowExplainModal } from './components/EscrowExplainModal';
import { UserProfileModal } from './components/UserProfileModal';
import { OnboardingModal } from './components/OnboardingModal';


const GAME_TABS: (GameCategory | 'All')[] = [
  'All',
  'Valorant',
  'RoV',
  'Genshin Impact',
  'Free Fire',
  'Roblox',
  'FC Online',
  'Honkai: Star Rail',
];

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [listings, setListings] = useState<GameAccountListing[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [blacklist, setBlacklist] = useState<BlacklistEntry[]>([]);
  const [auditLogs, setAuditLogs] = useState<SecurityAuditLog[]>([]);
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);

  // Navigation & Filter States
  const [activeTab, setActiveTab] = useState<'marketplace' | 'escrow-orders' | 'blacklist' | 'admin'>('marketplace');
  const [selectedGame, setSelectedGame] = useState<GameCategory | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [maxPriceFilter, setMaxPriceFilter] = useState<number>(10000);

  // Modals
  const [selectedListing, setSelectedListing] = useState<GameAccountListing | null>(null);
  const [showSellModal, setShowSellModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showEscrowModal, setShowEscrowModal] = useState(false);
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(() => !localStorage.getItem('gamevault_registered'));

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleRegister = async (userData: { username: string; role: UserRole; phone: string; email: string }) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    setCurrentUser(data.user);
    setAllUsers(data.allUsers || []);
    localStorage.setItem('gamevault_registered', 'true');
    setShowOnboarding(false);
    showToast(`ลงทะเบียนสำเร็จ ยินดีต้อนรับคุณ ${data.user.username} (${data.user.role.toUpperCase()})`, 'success');
    fetchInitialData();
  };

  const handleLogin = async (credentials: { email: string; password?: string }) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    setCurrentUser(data.user);
    setAllUsers(data.allUsers || []);
    localStorage.setItem('gamevault_registered', 'true');
    setShowOnboarding(false);
    showToast(`เข้าสู่ระบบสำเร็จ ยินดีต้อนรับคุณ ${data.user.username} (${data.user.role.toUpperCase()})`, 'success');
    fetchInitialData();
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error(e);
    }
    localStorage.removeItem('gamevault_registered');
    setCurrentUser(null);
    setShowOnboarding(true);
    showToast('ออกจากระบบเรียบร้อยแล้ว กรุณาสมัครบัญชีหรือเข้าสู่ระบบก่อนทำรายการ', 'info');
  };

  const requireAuth = (actionName: string): boolean => {
    if (!currentUser) {
      setShowOnboarding(true);
      showToast(`กรุณาสมัครบัญชีหรือเข้าสู่ระบบก่อน${actionName}`, 'error');
      return false;
    }
    return true;
  };

  const handleOpenSell = () => {
    if (!requireAuth('ลงขายไอดีเกม')) return;
    setShowSellModal(true);
  };

  const handleOpenWallet = () => {
    if (!requireAuth('ใช้งานกระเป๋าเงิน')) return;
    setShowWalletModal(true);
  };

  const handleTabChange = (tab: 'marketplace' | 'escrow-orders' | 'blacklist' | 'admin') => {
    if ((tab === 'escrow-orders' || tab === 'admin') && !currentUser) {
      setShowOnboarding(true);
      showToast('กรุณาสมัครบัญชีหรือเข้าสู่ระบบก่อนเข้าถึงระบบคนกลางและหลังบ้าน', 'error');
      return;
    }
    setActiveTab(tab);
  };


  // --- Initial Data Fetching ---
  const fetchInitialData = async () => {
    try {
      const [authRes, listRes, ordRes, txRes, blRes] = await Promise.all([
        fetch('/api/auth/me').then(r => r.json()),
        fetch('/api/listings').then(r => r.json()),
        fetch('/api/orders').then(r => r.json()),
        fetch('/api/wallet/transactions').then(r => r.json()),
        fetch('/api/blacklist').then(r => r.json()),
      ]);

      if (authRes.user) {
        setCurrentUser(authRes.user);
        setAllUsers(authRes.allUsers || []);
      } else {
        setCurrentUser(null);
        setAllUsers(authRes.allUsers || []);
      }
      if (Array.isArray(listRes)) setListings(listRes);
      if (Array.isArray(ordRes)) setOrders(ordRes);
      if (Array.isArray(txRes)) setTransactions(txRes);
      if (Array.isArray(blRes)) setBlacklist(blRes);

      // If current user is admin, fetch admin data
      if (authRes.user?.role === 'admin') {
        fetchAdminData();
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }
  };

  const fetchAdminData = async () => {
    try {
      const [statsRes, logsRes] = await Promise.all([
        fetch('/api/admin/stats').then(r => r.json()),
        fetch('/api/admin/audit-logs').then(r => r.json()),
      ]);
      if (statsRes && !statsRes.error) setAdminStats(statsRes);
      if (Array.isArray(logsRes)) setAuditLogs(logsRes);
    } catch (err) {
      console.error('Failed to load admin stats:', err);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  // --- User Switching ---
  const handleSwitchUser = async (userId: string) => {
    try {
      const res = await fetch('/api/auth/switch-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      }).then(r => r.json());

      if (res.success) {
        setCurrentUser(res.user);
        showToast(`สลับใช้งานเป็น ${res.user.username} (${res.user.role}) เรียบร้อย`, 'info');
        fetchInitialData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // --- Purchase Flow with Escrow ---
  const handlePurchase = async (listingId: string) => {
    if (!requireAuth('ทำการซื้อไอดีเกม')) throw new Error('กรุณาสมัครบัญชีหรือเข้าสู่ระบบ');

    const res = await fetch('/api/orders/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listingId }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'การสั่งซื้อไม่สำเร็จ');
    }

    showToast('สั่งซื้อสำเร็จ! ยอดเงินถูกกักในคนกลางแล้ว สามารถดูรหัสผ่านได้ทันที', 'success');
    fetchInitialData();
    setActiveTab('escrow-orders');
  };

  // --- Confirm Release to Seller ---
  const handleConfirmRelease = async (orderId: string) => {
    const res = await fetch(`/api/orders/${orderId}/confirm-release`, {
      method: 'POST',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    showToast('ยืนยันรับไอดีเรียบร้อย โอนเงินให้ผู้ขายแล้ว ธุรกรรมเสร็จสิ้น', 'success');
    fetchInitialData();
  };

  // --- Dispute Order ---
  const handleOpenDispute = async (orderId: string, reason: string, evidenceUrl?: string) => {
    const res = await fetch(`/api/orders/${orderId}/dispute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason, evidenceUrl }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    showToast('ส่งเรื่องอายัดเงินคนกลางเรียบร้อย เจ้าหน้าที่กำลังตรวจสอบ', 'info');
    fetchInitialData();
  };

  // --- Report Inspection Status to Escrow ---
  const handleReportInspection = async (
    orderId: string, 
    status: 'confirmed_working' | 'has_issue', 
    notes: string
  ) => {
    const res = await fetch(`/api/orders/${orderId}/report-inspection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, notes }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    if (status === 'confirmed_working') {
      showToast('แจ้งคนกลางเรียบร้อย: เข้าไอดีได้แล้ว ระบบเตรียมส่งเงินให้ผู้ขาย', 'success');
    } else {
      showToast('แจ้งคนกลางเรียบร้อย: อายัดเงินทันที เจ้าหน้าที่กำลังเข้าช่วยเหลือ', 'error');
    }
    fetchInitialData();
  };

  // --- Submit Seller Review & Rating ---
  const handleSubmitReview = async (orderId: string, rating: number, comment: string) => {
    const res = await fetch(`/api/orders/${orderId}/submit-review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating, comment }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    showToast(`บันทึกรีวิว ${rating} ดาวเรียบร้อย ขอบคุณที่ร่วมสร้างคอมมูนิตี้ที่น่าเชื่อถือ`, 'success');
    fetchInitialData();
  };

  // --- Admin Escrow Payout Release ---
  const handleAdminReleasePayout = async (orderId: string) => {
    const res = await fetch(`/api/orders/${orderId}/admin-release-payout`, {
      method: 'POST',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    showToast('คนกลางโอนเงินเข้ากระเป๋าผู้ขายเรียบร้อยแล้ว', 'success');
    fetchInitialData();
  };

  // --- Sell Account Listing ---
  const handleCreateListing = async (listingData: any) => {
    if (!requireAuth('ลงประกาศขายไอดีเกม')) throw new Error('กรุณาสมัครบัญชีหรือเข้าสู่ระบบ');

    const res = await fetch('/api/listings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(listingData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    showToast('ลงขายไอดีเกมเรียบร้อย รหัสผ่านถูกเข้ารหัสในตู้เซฟคนกลางแล้ว', 'success');
    fetchInitialData();
  };

  // --- Top-up & Wallet Actions ---
  const handleTopupRequest = async (amount: number, slipUrl?: string): Promise<WalletTransaction> => {
    const res = await fetch('/api/wallet/topup-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, slipUrl }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    fetchInitialData();
    return data.transaction;
  };

  const handleAutoVerifyTopup = async (transactionId: string) => {
    const res = await fetch('/api/wallet/simulate-auto-verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactionId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    showToast(`เติมเงินสำเร็จ ฿${data.transaction.amount.toLocaleString()} ยอดเงินเข้ากระเป๋าเรียบร้อย`, 'success');
    fetchInitialData();
  };

  const handleWithdrawRequest = async (
    amount: number, 
    bankName: string, 
    accountNumber: string, 
    accountName: string
  ) => {
    const res = await fetch('/api/wallet/withdraw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, bankName, accountNumber, accountName }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    showToast(`ส่งคำขอถอนเงิน ฿${amount.toLocaleString()} เรียบร้อยแล้ว`, 'success');
    fetchInitialData();
  };

  // --- Admin Backoffice Actions ---
  const handleResolveDispute = async (
    orderId: string, 
    resolution: 'refund_buyer' | 'release_seller', 
    adminNotes: string
  ) => {
    const res = await fetch(`/api/orders/${orderId}/admin-resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolution, adminNotes }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    showToast('ตัดสินข้อพิพาทเรียบร้อย ระบบได้จัดการโอนเงินตามคำสั่ง', 'success');
    fetchInitialData();
  };

  const handleTransactionAction = async (txId: string, action: 'approve' | 'reject') => {
    const res = await fetch(`/api/admin/transactions/${txId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    showToast(`ดำเนินการธุรกรรม [${action}] เรียบร้อย`, 'success');
    fetchInitialData();
  };

  const handleKycAction = async (userId: string, action: 'approve' | 'reject') => {
    const res = await fetch(`/api/admin/kyc/${userId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    showToast(`ดำเนินการ KYC [${action}] เรียบร้อย`, 'success');
    fetchInitialData();
  };

  const handleDeleteListing = async (listingId: string) => {
    const res = await fetch(`/api/listings/${listingId}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    showToast('ลบรายการประกาศเรียบร้อย', 'info');
    fetchInitialData();
  };

  // --- Blacklist Actions ---
  const handleSearchBlacklist = async (query: string): Promise<BlacklistEntry[]> => {
    const res = await fetch(`/api/blacklist?q=${encodeURIComponent(query)}`);
    return await res.json();
  };

  const handleReportScammer = async (reportData: any) => {
    const res = await fetch('/api/blacklist/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reportData),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);

    showToast('บันทึกรายงานมิจฉาชีพเรียบร้อย', 'success');
    fetchInitialData();
  };

  // --- Filtered Listings Calculation ---
  const filteredListings = listings.filter((item) => {
    if (selectedGame !== 'All' && item.game !== selectedGame) return false;
    if (verifiedOnly && !item.sellerVerified) return false;
    if (item.price > maxPriceFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchDesc = item.description.toLowerCase().includes(q);
      const matchRank = item.rank.toLowerCase().includes(q);
      const matchGame = item.game.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchRank && !matchGame) return false;
    }
    return true;
  });

  // Calculate total escrow held in system
  const activeEscrowAmount = orders
    .filter(o => o.status === 'buyer_inspecting' || o.status === 'escrow_held' || o.status === 'disputed')
    .reduce((sum, o) => sum + o.price, 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-['Prompt',sans-serif]">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce duration-300">
          <div className={`px-4 py-3 rounded-xl shadow-2xl border text-xs font-semibold flex items-center gap-2 ${
            toastMessage.type === 'success' ? 'bg-emerald-950 border-emerald-500 text-emerald-200' :
            toastMessage.type === 'error' ? 'bg-rose-950 border-rose-500 text-rose-200' :
            'bg-slate-900 border-amber-500 text-amber-200'
          }`}>
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        allUsers={allUsers}
        activeTab={activeTab}
        activeEscrowAmount={activeEscrowAmount}
        setActiveTab={handleTabChange}
        onOpenSellModal={handleOpenSell}
        onOpenWalletModal={handleOpenWallet}
        onOpenEscrowInfo={() => setShowEscrowModal(true)}
        onSwitchUser={handleSwitchUser}
        onOpenProfile={(id) => setViewingUserId(id)}
        onLogout={handleLogout}
        onLoginRequest={() => setShowOnboarding(true)}
      />

      {/* Main Content Areas */}
      <main className="flex-1">
        
        {/* VIEW 1: MARKETPLACE */}
        {activeTab === 'marketplace' && (
          <div>
            {/* Hero Banner */}
            <HeroSection
              onExploreClick={() => {
                const el = document.getElementById('marketplace-grid');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              onHowItWorksClick={() => setShowEscrowModal(true)}
              onCheckBlacklistClick={() => setActiveTab('blacklist')}
            />

            {/* Marketplace Explorer */}
            <div id="marketplace-grid" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
              
              {/* Filter & Search Bar */}
              <div className="space-y-4">
                
                {/* Game Tabs (Interactive segmented buttons allowed by skill) */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
                  {GAME_TABS.map((g) => (
                    <button
                      key={g}
                      onClick={() => setSelectedGame(g)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                        selectedGame === g
                          ? 'bg-amber-400 text-slate-950 shadow-sm'
                          : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-850 border border-slate-800'
                      }`}
                    >
                      {g === 'All' ? 'ทุกเกม' : g}
                    </button>
                  ))}
                </div>

                {/* Search & Extra Filters Strip */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="ค้นหาชื่อไอดี, สกิน, แรงก์ หรือเซิร์ฟเวอร์..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div className="flex items-center gap-4 text-xs shrink-0">
                    {/* Verified Seller Toggle */}
                    <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                      <input
                        type="checkbox"
                        checked={verifiedOnly}
                        onChange={(e) => setVerifiedOnly(e.target.checked)}
                        className="rounded bg-slate-950 border-slate-800 text-amber-400 focus:ring-0"
                      />
                      <span>เฉพาะผู้ขายยืนยันบัตร ปชช.</span>
                    </label>

                    {/* Price Slider */}
                    <div className="flex items-center gap-2 text-slate-400">
                      <span>งบไม่เกิน:</span>
                      <span className="font-mono text-white font-bold tabular-nums">฿{maxPriceFilter.toLocaleString()}</span>
                      <input
                        type="range"
                        min="500"
                        max="10000"
                        step="500"
                        value={maxPriceFilter}
                        onChange={(e) => setMaxPriceFilter(Number(e.target.value))}
                        className="w-24 accent-amber-400"
                      />
                    </div>
                  </div>
                </div>

              </div>

              {/* Items Grid Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white">
                    ไอดีเกมพร้อมส่งมอบผ่านคนกลาง
                  </h2>
                  <div className="text-xs text-slate-400 mt-0.5">
                    พบทั้งหมด <span className="font-mono font-bold text-amber-400">{filteredListings.length}</span> รายการ
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>รับประกันความปลอดภัย 100% ทุกรายการ</span>
                </div>
              </div>

              {/* Items Grid */}
              {filteredListings.length === 0 ? (
                <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800 space-y-3">
                  <Gamepad2 className="w-10 h-10 text-slate-600 mx-auto" />
                  <h3 className="text-sm font-semibold text-white">ไม่พบรายการไอดีตรงกับเงื่อนไขค้นหา</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    ลองปรับช่วงราคา ล้างคำค้นหา หรือเลือกหมวดหมู่อื่นเพื่อดูไอดีเกมเพิ่มเติม
                  </p>
                  <button
                    onClick={() => {
                      setSelectedGame('All');
                      setSearchQuery('');
                      setVerifiedOnly(false);
                      setMaxPriceFilter(10000);
                    }}
                    className="px-4 py-2 rounded-lg bg-slate-800 text-xs text-amber-400 hover:bg-slate-700"
                  >
                    ล้างตัวกรองทั้งหมด
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredListings.map((listing) => (
                    <ListingCard
                      key={listing.id}
                      listing={listing}
                      onSelect={(item) => setSelectedListing(item)}
                      onViewSellerProfile={(id) => setViewingUserId(id)}
                    />
                  ))}
                </div>
              )}

            </div>
          </div>
        )}

        {/* VIEW 2: ORDERS & ESCROW PROTECTION CENTER */}
        {activeTab === 'escrow-orders' && (
          <OrdersEscrowView
            orders={orders}
            currentUser={currentUser}
            onConfirmRelease={handleConfirmRelease}
            onOpenDispute={handleOpenDispute}
            onReportInspection={handleReportInspection}
            onSubmitReview={handleSubmitReview}
            onAdminReleasePayout={handleAdminReleasePayout}
            onRefresh={fetchInitialData}
          />
        )}

        {/* VIEW 3: FRAUD BLACKLIST CHECKER */}
        {activeTab === 'blacklist' && (
          <BlacklistChecker
            blacklistEntries={blacklist}
            onSearch={handleSearchBlacklist}
            onReportScammer={handleReportScammer}
            onGoToMarketplace={() => setActiveTab('marketplace')}
          />
        )}

        {/* VIEW 4: ADMIN BACKOFFICE (หลังบ้าน) */}
        {activeTab === 'admin' && currentUser?.role === 'admin' && (
          <AdminBackoffice
            stats={adminStats}
            orders={orders}
            transactions={transactions}
            users={allUsers}
            listings={listings}
            auditLogs={auditLogs}
            onResolveDispute={handleResolveDispute}
            onTransactionAction={handleTransactionAction}
            onKycAction={handleKycAction}
            onDeleteListing={handleDeleteListing}
            onAdminReleasePayout={handleAdminReleasePayout}
            onRefresh={fetchInitialData}
          />
        )}

      </main>

      {/* Mobile Bottom Navigation Bar (Dock widget สำหรับมือถือทุกรุ่น) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 px-2 py-2 flex items-center justify-around text-[10px] shadow-2xl">
        <button
          onClick={() => setActiveTab('marketplace')}
          className={`flex flex-col items-center gap-1 transition-colors ${
            activeTab === 'marketplace' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Gamepad2 className="w-4 h-4" />
          <span>ตลาดไอดี</span>
        </button>

        <button
          onClick={() => setActiveTab('escrow-orders')}
          className={`relative flex flex-col items-center gap-1 transition-colors ${
            activeTab === 'escrow-orders' ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>คนกลาง</span>
          {orders.filter(o => o.status === 'buyer_inspecting' || o.status === 'escrow_held').length > 0 && (
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('blacklist')}
          className={`flex flex-col items-center gap-1 transition-colors ${
            activeTab === 'blacklist' ? 'text-rose-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>เช็กคนโกง</span>
        </button>

        <button
          onClick={() => setShowWalletModal(true)}
          className="flex flex-col items-center gap-1 text-slate-300 hover:text-white transition-colors"
        >
          <Wallet className="w-4 h-4 text-amber-400" />
          <span className="font-mono tabular-nums">
            ฿{(currentUser?.role === 'admin' ? activeEscrowAmount : (currentUser?.balance ?? 0)).toLocaleString()}
          </span>
        </button>


        {currentUser?.role === 'admin' ? (
          <button
            onClick={() => setActiveTab('admin')}
            className={`flex flex-col items-center gap-1 transition-colors ${
              activeTab === 'admin' ? 'text-rose-400 font-bold' : 'text-rose-400/80 hover:text-rose-300'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>หลังบ้าน</span>
          </button>
        ) : (
          <button
            onClick={() => {
              if (currentUser) setViewingUserId(currentUser.id);
            }}
            className="flex flex-col items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <UserCheck className="w-4 h-4 text-sky-400" />
            <span>โปรไฟล์</span>
          </button>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-10 mt-16 text-xs text-slate-500 pb-24 md:pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span className="font-['Outfit'] font-bold text-slate-300">GameVault TH</span>
            <span>· ระบบตลาดซื้อขายไอดีเกมพร้อมคนกลาง Escrow 100%</span>
          </div>

          <div className="flex items-center gap-6">
            <button onClick={() => setShowEscrowModal(true)} className="hover:text-slate-300">
              ข้อกำหนดระบบคนกลาง
            </button>
            <button onClick={() => setActiveTab('blacklist')} className="hover:text-slate-300">
              ฐานข้อมูลคนโกง
            </button>
            {currentUser?.role === 'admin' && (
              <button onClick={() => setActiveTab('admin')} className="text-rose-400 hover:text-rose-300">
                หลังบ้านผู้ดูแล (Admin)
              </button>
            )}
          </div>
        </div>
      </footer>

      {/* Modals */}
      {selectedListing && (
        <ListingDetailModal
          listing={selectedListing}
          currentUser={currentUser}
          onClose={() => setSelectedListing(null)}
          onPurchase={handlePurchase}
          onOpenWallet={handleOpenWallet}
          onViewSellerProfile={(id) => setViewingUserId(id)}
        />
      )}

      {showSellModal && (
        <SellListingModal
          currentUser={currentUser}
          onClose={() => setShowSellModal(false)}
          onSubmit={handleCreateListing}
        />
      )}

      {showWalletModal && (
        <WalletModal
          currentUser={currentUser}
          transactions={transactions}
          orders={orders}
          activeEscrowAmount={activeEscrowAmount}
          onClose={() => setShowWalletModal(false)}
          onTopupRequest={handleTopupRequest}
          onAutoVerifyTopup={handleAutoVerifyTopup}
          onWithdrawRequest={handleWithdrawRequest}
          onAdminReleasePayout={handleAdminReleasePayout}
          onGoToEscrowOrders={() => setActiveTab('escrow-orders')}
          showToast={showToast}
        />
      )}

      {showEscrowModal && (
        <EscrowExplainModal
          onClose={() => setShowEscrowModal(false)}
        />
      )}

      {/* User Profile & Trust Modal */}
      {viewingUserId && (
        <UserProfileModal
          userId={viewingUserId}
          onClose={() => setViewingUserId(null)}
          onSelectListing={(item) => {
            setViewingUserId(null);
            setSelectedListing(item);
          }}
          onLogout={handleLogout}
        />
      )}

      {/* First-time Onboarding & Registration Modal */}
      {showOnboarding && (
        <OnboardingModal
          onComplete={handleRegister}
          onLogin={handleLogin}
          onClose={() => setShowOnboarding(false)}
          allowClose={true}
          showToast={showToast}
        />
      )}

    </div>
  );
}

