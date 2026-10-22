import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Wallet, 
  PlusCircle, 
  UserCheck, 
  ShieldAlert, 
  ChevronDown, 
  Menu, 
  X,
  Lock,
  Layers,
  HelpCircle,
  Activity,
  LogOut,
  LogIn
} from 'lucide-react';
import { User } from '../types';

interface NavbarProps {
  currentUser: User | null;
  allUsers?: User[];
  activeTab: 'marketplace' | 'escrow-orders' | 'blacklist' | 'admin';
  activeEscrowAmount?: number;
  setActiveTab: (tab: 'marketplace' | 'escrow-orders' | 'blacklist' | 'admin') => void;
  onOpenSellModal: () => void;
  onOpenWalletModal: () => void;
  onOpenEscrowInfo: () => void;
  onSwitchUser?: (userId: string) => void;
  onOpenProfile: (userId: string) => void;
  onLogout?: () => void;
  onLoginRequest?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  allUsers,
  activeTab,
  activeEscrowAmount = 0,
  setActiveTab,
  onOpenSellModal,
  onOpenWalletModal,
  onOpenEscrowInfo,
  onSwitchUser,
  onOpenProfile,
  onLogout,
  onLoginRequest,
}) => {
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAdmin = currentUser?.role === 'admin';

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3 sm:gap-6">
          
          {/* Zone 1: Brand Wordmark */}
          <button
            onClick={() => {
              setActiveTab('marketplace');
              setMobileMenuOpen(false);
            }}
            className="flex items-center gap-2 sm:gap-2.5 text-left group focus:outline-none shrink-0"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:border-amber-400 transition-colors">
              <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-['Outfit'] font-bold text-base sm:text-lg tracking-tight text-white whitespace-nowrap">
                GameVault<span className="text-amber-400">.TH</span>
              </span>
            </div>
          </button>

          {/* Zone 2: Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-300">
            <button
              onClick={() => setActiveTab('marketplace')}
              className={`whitespace-nowrap transition-colors hover:text-white ${
                activeTab === 'marketplace' ? 'text-amber-400 font-semibold' : ''
              }`}
            >
              ตลาดไอดีเกม
            </button>
            <button
              onClick={() => setActiveTab('escrow-orders')}
              className={`whitespace-nowrap transition-colors hover:text-white flex items-center gap-1.5 ${
                activeTab === 'escrow-orders' ? 'text-amber-400 font-semibold' : ''
              }`}
            >
              <span>รายการคนกลาง Escrow</span>
            </button>
            <button
              onClick={() => setActiveTab('blacklist')}
              className={`whitespace-nowrap transition-colors hover:text-white flex items-center gap-1.5 ${
                activeTab === 'blacklist' ? 'text-amber-400 font-semibold' : ''
              }`}
            >
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span>เช็คบัญชีคนโกง</span>
            </button>
            <button
              onClick={onOpenEscrowInfo}
              className="whitespace-nowrap transition-colors text-slate-400 hover:text-slate-200"
            >
              ระบบคุ้มครอง 100%
            </button>
            {isAdmin && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`whitespace-nowrap px-2.5 py-1 rounded border text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                  activeTab === 'admin'
                    ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                    : 'border-rose-900/50 bg-rose-950/40 text-rose-400 hover:bg-rose-900/40'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>แดชบอร์ดหลังบ้าน (Admin)</span>
              </button>
            )}
          </nav>

          {/* Zone 3: Actions & Controls */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            
            {/* Wallet Button (Shows User Balance or Admin Escrow Vault Balance) */}
            <button
              onClick={onOpenWalletModal}
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-750 transition-colors text-xs"
              title={isAdmin ? `กระเป๋าคนกลาง (Escrow Vault): ฿${activeEscrowAmount.toLocaleString()}` : 'กระเป๋าเงิน GameVault Wallet'}
            >
              <Wallet className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-white font-mono tabular-nums">
                  ฿{(isAdmin ? activeEscrowAmount : (currentUser?.balance ?? 0)).toLocaleString()}
                </span>

                {/* Show Escrow Vault badge for admin */}
                {isAdmin && (
                  <span className="hidden sm:inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 font-bold font-mono">
                    <Lock className="w-2.5 h-2.5" />
                    <span>Escrow Vault</span>
                  </span>
                )}
              </div>
            </button>


            {/* User Profile or Login/Register Button */}
            {!currentUser ? (
              <button
                onClick={() => {
                  if (onLoginRequest) onLoginRequest();
                  else if (onOpenWalletModal) onOpenWalletModal();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs transition-colors shadow-sm whitespace-nowrap active:scale-95"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>เข้าสู่ระบบ / สมัครสมาชิก</span>
              </button>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setShowRoleMenu(!showRoleMenu)}
                  className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-750 text-xs transition-colors"
                >
                  <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 shrink-0">
                    <UserCheck className="w-3 h-3 text-emerald-400" />
                  </div>
                  <span className="text-slate-200 font-medium max-w-[70px] sm:max-w-[100px] truncate hidden md:inline">
                    {currentUser.username}
                  </span>
                  <span className={`text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded uppercase font-semibold ${
                    currentUser.role === 'admin' ? 'bg-rose-500/20 text-rose-300' :
                    currentUser.role === 'seller' ? 'bg-blue-500/20 text-blue-300' :
                    'bg-emerald-500/20 text-emerald-300'
                  }`}>
                    {currentUser.role}
                  </span>
                  <ChevronDown className="w-3 h-3 text-slate-400 hidden sm:inline" />
                </button>

                {showRoleMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95">
                    <div className="p-1 border-b border-slate-800 pb-2">
                      <button
                        onClick={() => {
                          if (currentUser) onOpenProfile(currentUser.id);
                          setShowRoleMenu(false);
                        }}
                        className="w-full py-2 px-2.5 rounded-lg bg-amber-400/10 border border-amber-400/30 hover:bg-amber-400/20 text-xs text-amber-300 font-semibold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>ดูโปรไฟล์ & ความน่าเชื่อถือของฉัน</span>
                      </button>
                    </div>
                    {onLogout && (
                      <div className="pt-2 mt-2 border-t border-slate-800">
                        <button
                          onClick={() => {
                            setShowRoleMenu(false);
                            onLogout();
                          }}
                          className="w-full py-2 px-3 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-xs text-rose-300 font-semibold flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>ออกจากระบบ (Logout)</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Sell Account CTA (Desktop and Tablet) */}
            <button
              onClick={onOpenSellModal}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg shadow-sm transition-colors whitespace-nowrap"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>ลงขายไอดี</span>
            </button>

            {/* Mobile Hamburger Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-amber-400" /> : <Menu className="w-5 h-5" />}
            </button>

          </div>
        </div>

        {/* Mobile Navigation Drawer / Dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-800 bg-slate-950/98 px-4 py-4 space-y-3 animate-in slide-in-from-top-2">
            
            {/* Mobile Nav Links */}
            <div className="grid grid-cols-2 gap-2 text-xs font-medium">
              <button
                onClick={() => {
                  setActiveTab('marketplace');
                  setMobileMenuOpen(false);
                }}
                className={`p-2.5 rounded-lg border text-left transition-colors flex items-center gap-2 ${
                  activeTab === 'marketplace'
                    ? 'border-amber-400 bg-amber-500/10 text-amber-300 font-bold'
                    : 'border-slate-850 bg-slate-900 text-slate-300'
                }`}
              >
                <Layers className="w-4 h-4 text-amber-400 shrink-0" />
                <span>ตลาดไอดีเกม</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('escrow-orders');
                  setMobileMenuOpen(false);
                }}
                className={`p-2.5 rounded-lg border text-left transition-colors flex items-center gap-2 ${
                  activeTab === 'escrow-orders'
                    ? 'border-amber-400 bg-amber-500/10 text-amber-300 font-bold'
                    : 'border-slate-850 bg-slate-900 text-slate-300'
                }`}
              >
                <Lock className="w-4 h-4 text-sky-400 shrink-0" />
                <span>คนกลาง Escrow</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('blacklist');
                  setMobileMenuOpen(false);
                }}
                className={`p-2.5 rounded-lg border text-left transition-colors flex items-center gap-2 ${
                  activeTab === 'blacklist'
                    ? 'border-rose-400 bg-rose-500/10 text-rose-300 font-bold'
                    : 'border-slate-850 bg-slate-900 text-slate-300'
                }`}
              >
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                <span>เช็คบัญชีคนโกง</span>
              </button>

              <button
                onClick={() => {
                  onOpenEscrowInfo();
                  setMobileMenuOpen(false);
                }}
                className="p-2.5 rounded-lg border border-slate-850 bg-slate-900 text-slate-300 text-left flex items-center gap-2"
              >
                <HelpCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>ระบบคุ้มครอง 100%</span>
              </button>
            </div>

            {/* Admin Command Link for Mobile */}
            {isAdmin && (
              <button
                onClick={() => {
                  setActiveTab('admin');
                  setMobileMenuOpen(false);
                }}
                className={`w-full p-2.5 rounded-lg border text-xs font-bold transition-colors flex items-center justify-between ${
                  activeTab === 'admin'
                    ? 'border-rose-400 bg-rose-500/20 text-rose-300'
                    : 'border-rose-900/60 bg-rose-950/40 text-rose-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-rose-400" />
                  <span>แดชบอร์ดหลังบ้านคนกลาง (Admin Command)</span>
                </div>
                {activeEscrowAmount > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                    กัก ฿{activeEscrowAmount.toLocaleString()}
                  </span>
                )}
              </button>
            )}

            {/* Mobile Actions: Sell & Profile */}
            <div className="pt-2 border-t border-slate-850 grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  onOpenSellModal();
                  setMobileMenuOpen(false);
                }}
                className="py-2.5 px-3 rounded-lg bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow"
              >
                <PlusCircle className="w-4 h-4" />
                <span>ลงขายไอดีเกม</span>
              </button>

              <button
                onClick={() => {
                  if (currentUser) onOpenProfile(currentUser.id);
                  setMobileMenuOpen(false);
                }}
                className="py-2.5 px-3 rounded-lg bg-slate-900 border border-slate-800 text-white font-medium text-xs flex items-center justify-center gap-1.5"
              >
                <UserCheck className="w-4 h-4 text-sky-400" />
                <span>โปรไฟล์ของฉัน</span>
              </button>
            </div>
          </div>
        )}
      </header>
    </>
  );
};
