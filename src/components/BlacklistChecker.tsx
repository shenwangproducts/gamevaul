import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  FileWarning, 
  PlusCircle, 
  Lock
} from 'lucide-react';
import { BlacklistEntry } from '../types';

interface BlacklistCheckerProps {
  blacklistEntries: BlacklistEntry[];
  onSearch: (query: string) => Promise<BlacklistEntry[]>;
  onReportScammer: (data: any) => Promise<void>;
  onGoToMarketplace: () => void;
}

export const BlacklistChecker: React.FC<BlacklistCheckerProps> = ({
  blacklistEntries,
  onSearch,
  onReportScammer,
  onGoToMarketplace,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<BlacklistEntry[]>(blacklistEntries);
  const [hasSearched, setHasSearched] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  // Report Form State
  const [name, setName] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [bankName, setBankName] = useState('ธนาคารกสิกรไทย');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [scamGame, setScamGame] = useState('Valorant');
  const [scamAmount, setScamAmount] = useState('');
  const [scamDetails, setScamDetails] = useState('');
  const [reportSuccess, setReportSuccess] = useState(false);

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) {
      setResults(blacklistEntries);
      setHasSearched(false);
      return;
    }
    const res = await onSearch(query.trim());
    setResults(res);
    setHasSearched(true);
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onReportScammer({
      name,
      bankAccount,
      bankName,
      phoneNumber,
      scamGame,
      scamAmount: Number(scamAmount) || 0,
      scamDetails,
    });
    setReportSuccess(true);
    setTimeout(() => {
      setReportSuccess(false);
      setShowReportModal(false);
      setName('');
      setBankAccount('');
      setPhoneNumber('');
      setScamDetails('');
    }, 2000);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      
      {/* Hero Header */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 text-center max-w-3xl mx-auto">
        <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>

        <h2 className="text-2xl font-bold text-white">
          ศูนย์ตรวจสอบบัญชีมิจฉาชีพและคนโกงไอดีเกม
        </h2>

        <p className="text-xs text-slate-400 max-w-xl mx-auto leading-relaxed">
          ค้นหาประวัติมิจฉาชีพด้วยเลขบัญชีธนาคาร, เบอร์โทรศัพท์, หรือชื่อ-นามสกุล 
          ก่อนโอนเงินภายนอก หรือเลือกใช้ <span className="text-amber-400 font-semibold">ระบบคนกลาง Escrow ของเรา</span> เพื่อป้องกันการถูกโกง 100%
        </p>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2 max-w-xl mx-auto pt-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="ค้นหาด้วยเลขบัญชีธนาคาร, เบอร์พร้อมเพย์, หรือชื่อผู้ขาย..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-rose-400"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-500 hover:bg-rose-400 text-white transition-colors"
          >
            ค้นหาข้อมูล
          </button>
        </form>

        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => setShowReportModal(true)}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5 text-rose-400" />
            <span>แจ้งเบาะแสมิจฉาชีพคนโกงใหม่</span>
          </button>
        </div>
      </div>

      {/* Search Results / Blacklist Database List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <FileWarning className="w-4 h-4 text-rose-400" />
            <span>
              {hasSearched ? `ผลการค้นหา (${results.length} รายการ)` : `รายชื่อมิจฉาชีพล่าสุดที่ถูกรายงาน (${results.length})`}
            </span>
          </h3>

          {hasSearched && results.length === 0 && (
            <button
              onClick={() => {
                setQuery('');
                setResults(blacklistEntries);
                setHasSearched(false);
              }}
              className="text-xs text-slate-400 hover:text-white"
            >
              ล้างการค้นหา
            </button>
          )}
        </div>

        {hasSearched && results.length === 0 ? (
          <div className="p-8 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
            <h4 className="text-base font-bold text-emerald-300">
              ไม่พบประวัติบัญชีคนโกงในฐานข้อมูลนี้
            </h4>
            <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
              อย่างไรก็ตาม ผู้ขายใหม่อาจยังไม่เคยถูกบันทึกประวัติ 
              เพื่อความปลอดภัยสูงสุด กรุณาซื้อขายผ่านระบบคนกลาง GameVault Escrow ทุกครั้ง
            </p>
            <button
              onClick={onGoToMarketplace}
              className="mt-2 px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold inline-flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>เลือกซื้อไอดีผ่านระบบคนกลาง</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((entry) => (
              <div
                key={entry.id}
                className="p-4 rounded-xl bg-slate-900 border border-rose-900/40 space-y-3 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-2 h-full bg-rose-500" />
                
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] text-rose-400 font-semibold uppercase tracking-wider block">
                      เตือนภัยมิจฉาชีพ
                    </span>
                    <h4 className="text-sm font-bold text-white mt-0.5">{entry.name}</h4>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-semibold">
                    แจ้งโกง {entry.reportedCount} ครั้ง
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>ธนาคาร:</span>
                    <span className="text-slate-200 font-medium">{entry.bankName}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>เลขที่บัญชี:</span>
                    <span className="text-rose-300 font-mono font-bold select-all">{entry.bankAccount}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>เบอร์โทร:</span>
                    <span className="text-slate-200 font-mono select-all">{entry.phoneNumber}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>เกมที่ถูกหลอก:</span>
                    <span className="text-amber-400 font-medium">{entry.scamGame}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>ยอดความเสียหาย:</span>
                    <span className="text-rose-400 font-mono font-bold tabular-nums">฿{entry.scamAmount.toLocaleString()}</span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 bg-slate-950 p-2.5 rounded-lg border border-slate-850 line-clamp-3">
                  {entry.scamDetails}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Community Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
                <span>แจ้งเตือนภัยคนโกง / บัญชีมิจฉาชีพ</span>
              </h3>
              <button
                onClick={() => setShowReportModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {reportSuccess ? (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs text-center">
                บันทึกข้อมูลเตือนภัยเรียบร้อย ขอบคุณที่ช่วยปกป้องชุมชนเกมเมอร์
              </div>
            ) : (
              <form onSubmit={handleReportSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-300 mb-1">ชื่อ-นามสกุล คนโกง *</label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น นาย สมชาย นามสกุล"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-rose-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-300 mb-1">ธนาคาร *</label>
                    <input
                      type="text"
                      required
                      placeholder="เช่น ธนาคารกสิกรไทย"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-rose-400"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1">เลขบัญชี *</label>
                    <input
                      type="text"
                      required
                      placeholder="เช่น 098-x-xxxxx-x"
                      value={bankAccount}
                      onChange={(e) => setBankAccount(e.target.value)}
                      className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-rose-400 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-300 mb-1">เบอร์โทรศัพท์ *</label>
                    <input
                      type="text"
                      required
                      placeholder="เช่น 089-xxx-xxxx"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-rose-400 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 mb-1">เกมที่โกง & มูลค่า (บาท)</label>
                    <div className="flex gap-1">
                      <input
                        type="text"
                        placeholder="Valorant"
                        value={scamGame}
                        onChange={(e) => setScamGame(e.target.value)}
                        className="w-1/2 p-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-rose-400"
                      />
                      <input
                        type="number"
                        placeholder="1500"
                        value={scamAmount}
                        onChange={(e) => setScamAmount(e.target.value)}
                        className="w-1/2 p-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-rose-400 font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1">พฤติกรรมการโกง / รายละเอียด *</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="อธิบายวิธีการโกง เช่น โอนเงินแล้วบล็อก, ส่งรหัสผ่านปลอม..."
                    value={scamDetails}
                    onChange={(e) => setScamDetails(e.target.value)}
                    className="w-full p-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-rose-400"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 py-2 rounded-lg bg-rose-500 hover:bg-rose-400 text-white font-bold transition-colors"
                  >
                    บันทึกข้อมูลแจ้งเตือน
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowReportModal(false)}
                    className="px-3 py-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                  >
                    ยกเลิก
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
