import React, { useState } from 'react';
import { X, Lock, ShieldCheck, Image as ImageIcon, Sparkles, AlertCircle } from 'lucide-react';
import { GameCategory, User } from '../types';

interface SellListingModalProps {
  currentUser: User | null;
  onClose: () => void;
  onSubmit: (listingData: any) => Promise<void>;
}

const GAMES: GameCategory[] = [
  'Valorant',
  'RoV',
  'Genshin Impact',
  'Free Fire',
  'Roblox',
  'FC Online',
  'Honkai: Star Rail',
];

export const SellListingModal: React.FC<SellListingModalProps> = ({
  currentUser,
  onClose,
  onSubmit,
}) => {
  const [game, setGame] = useState<GameCategory>('Valorant');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [rank, setRank] = useState('');
  const [skinCount, setSkinCount] = useState('');
  const [characterCount, setCharacterCount] = useState('');
  const [level, setLevel] = useState('1');
  const [server, setServer] = useState('Thailand / Asia');
  const [loginType, setLoginType] = useState('Riot ID (Clean Mail)');
  const [warrantyDays, setWarrantyDays] = useState('30');
  
  // Credentials
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorOrRecovery, setTwoFactorOrRecovery] = useState('');
  const [changeEmailGuide, setChangeEmailGuide] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!title || !price || !usernameOrEmail || !password) {
      setErrorMsg('กรุณากรอกข้อมูลสำคัญ: หัวข้อ, ราคา, และข้อมูลรหัสผ่านเพื่อเก็บในตู้นิรภัยคนกลาง');
      return;
    }

    setIsSubmitting(true);
    try {
      // Pick image according to game
      let defaultImage = '/src/assets/images/hero_game_market_1791887028020.jpg';
      if (game === 'Valorant') defaultImage = '/src/assets/images/account_valorant_skins_1791887029302.jpg';
      if (game === 'Genshin Impact' || game === 'Honkai: Star Rail') defaultImage = '/src/assets/images/account_fantasy_rpg_1791887029482.jpg';
      if (game === 'RoV' || game === 'Free Fire' || game === 'FC Online') defaultImage = '/src/assets/images/account_moba_champions_1791887028274.jpg';

      await onSubmit({
        game,
        title,
        description,
        price: Number(price),
        rank: rank || 'Standard',
        skinCount: Number(skinCount) || 0,
        characterCount: Number(characterCount) || 0,
        level: Number(level) || 1,
        server,
        loginType,
        warrantyDays: Number(warrantyDays) || 30,
        images: [defaultImage],
        credentials: {
          usernameOrEmail,
          password,
          twoFactorOrRecovery: twoFactorOrRecovery || 'Clean ID / No 2FA',
          changeEmailGuide: changeEmailGuide || 'เปลี่ยนรหัสผ่านและอีเมลได้ทันที',
        },
      });
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('เกิดข้อผิดพลาดในการลงขายไอดี');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-6">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-white">ลงขายไอดีเกม (ฝากผ่านคนกลาง Escrow)</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Basic Game Details */}
          <div className="space-y-4">
            <div className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
              1. ข้อมูลไอดีเกมทั่วไป
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">เลือกเกม *</label>
                <select
                  value={game}
                  onChange={(e) => setGame(e.target.value as GameCategory)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:border-amber-400 focus:outline-none"
                >
                  {GAMES.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">ราคาขาย (บาท) *</label>
                <input
                  type="number"
                  placeholder="เช่น 1500"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-amber-400 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">หัวข้อประกาศ *</label>
              <input
                type="text"
                placeholder="เช่น Valorant Immortal 3 สกินมีด Kuronami + Vandal Prime"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:border-amber-400 focus:outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">ระดับแรงก์</label>
                <input
                  type="text"
                  placeholder="เช่น Diamond 2"
                  value={rank}
                  onChange={(e) => setRank(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:border-amber-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">จำนวนสกิน</label>
                <input
                  type="number"
                  placeholder="เช่น 35"
                  value={skinCount}
                  onChange={(e) => setSkinCount(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-amber-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">ระยะเวลารับประกัน</label>
                <select
                  value={warrantyDays}
                  onChange={(e) => setWarrantyDays(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:border-amber-400 focus:outline-none"
                >
                  <option value="7">7 วัน</option>
                  <option value="15">15 วัน</option>
                  <option value="30">30 วัน (แนะนำ)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">รายละเอียดเพิ่มเติม</label>
              <textarea
                rows={2}
                placeholder="ระบุสกินเด่น ข้อมูลการผูกบัญชี ประวัติการเล่น..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white text-xs focus:border-amber-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Section 2: Vault Credentials (Encrypted for Escrow) */}
          <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/30 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
              <Lock className="w-4 h-4" />
              <span>2. ข้อมูลรหัสผ่านสำหรับส่งมอบ (เก็บในตู้นิรภัยคนกลาง)</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-normal">
              ข้อมูลนี้จะถูกเก็บเป็นความลับ ปลอดภัย ไม่แสดงให้ใครเห็น 
              และจะถูกส่งมอบให้ผู้ซื้ออัตโนมัติเฉพาะเมื่อผู้ซื้อชำระเงินเข้าสู่ระบบคนกลางเรียบร้อยเท่านั้น
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Username / Email เข้าเกม *</label>
                <input
                  type="text"
                  placeholder="เช่น account_clean@email.com"
                  value={usernameOrEmail}
                  onChange={(e) => setUsernameOrEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs focus:border-amber-400 focus:outline-none font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Password รหัสผ่าน *</label>
                <input
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs focus:border-amber-400 focus:outline-none font-mono"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">รหัสกู้คืน / 2FA Recovery หรือหมายเหตุ</label>
              <input
                type="text"
                placeholder="เช่น Recovery code: 8941-8821... หรือ 'ไม่มีเบอร์ผูก ปลด 2FA เรียบร้อย'"
                value={twoFactorOrRecovery}
                onChange={(e) => setTwoFactorOrRecovery(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs focus:border-amber-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">คำแนะนำการเปลี่ยนอีเมลสำหรับผู้ซื้อ</label>
              <input
                type="text"
                placeholder="เช่น ให้เข้าที่ account.riotgames.com เพื่อเปลี่ยนอีเมลเป็นของตนเอง"
                value={changeEmailGuide}
                onChange={(e) => setChangeEmailGuide(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs focus:border-amber-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl text-sm font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-amber-400/20"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isSubmitting ? 'กำลังบันทึกรายการ...' : 'ยืนยันลงขายไอดีเกม (พร้อมระบบคนกลาง)'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
