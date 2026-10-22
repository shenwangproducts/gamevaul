import React from 'react';
import { ShieldCheck, Lock, RefreshCw, AlertTriangle, ArrowRight } from 'lucide-react';

interface HeroSectionProps {
  onExploreClick: () => void;
  onHowItWorksClick: () => void;
  onCheckBlacklistClick: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onExploreClick,
  onHowItWorksClick,
  onCheckBlacklistClick,
}) => {
  return (
    <section className="relative overflow-hidden border-b border-slate-800 bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Column: Headline and Trust Points */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 text-xs text-amber-400 font-medium tracking-wide uppercase">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Official Escrow Protected Trading Platform</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
              ตลาดซื้อขายไอดีเกมปลอดภัย
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-200">
                มั่นใจด้วยระบบคนกลางกักเงิน 100%
              </span>
            </h1>

            <p className="text-base text-slate-400 max-w-xl leading-relaxed">
              ป้องกันการโกงและดึงไอดีคืนทุกรูปแบบ เงินของผู้ซื้อถูกกักไว้อย่างปลอดภัยในระบบคนกลาง 
              รับรหัสผ่านทันที มีเวลารับประกันตรวจสอบไอดี 24 ชั่วโมง 
              ตรวจสอบตัวตนผู้ขายด้วยบัตรประชาชนทุกบัญชี
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <button
                onClick={onExploreClick}
                className="px-5 py-3 rounded-lg text-sm font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <span>เลือกดูไอดีเกมทั้งหมด</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={onHowItWorksClick}
                className="px-4 py-3 rounded-lg text-sm font-medium text-slate-300 bg-slate-900 border border-slate-800 hover:bg-slate-850 hover:text-white transition-colors text-center"
              >
                ระบบคนกลางทำงานอย่างไร?
              </button>

              <button
                onClick={onCheckBlacklistClick}
                className="px-4 py-3 rounded-lg text-sm font-medium text-rose-400 bg-rose-950/30 border border-rose-900/50 hover:bg-rose-900/40 transition-colors flex items-center justify-center gap-1.5"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>ตรวจสอบประวัติคนโกง</span>
              </button>
            </div>

            {/* Security Guarantee Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-slate-850 text-xs">
              <div className="flex items-start gap-2 text-slate-300">
                <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white">ตู้เซฟเก็บรหัส</div>
                  <div className="text-slate-500 text-[11px]">รหัสผ่านส่งมอบอัตโนมัติ</div>
                </div>
              </div>
              <div className="flex items-start gap-2 text-slate-300">
                <RefreshCw className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white">ตรวจไอดี 24 ชม.</div>
                  <div className="text-slate-500 text-[11px]">เคลมได้หากเข้าไม่ได้</div>
                </div>
              </div>
              <div className="flex items-start gap-2 text-slate-300">
                <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white">ยืนยัน KYC บัตร ปชช.</div>
                  <div className="text-slate-500 text-[11px]">รู้ตัวตนผู้ขายชัดเจน</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Hero Visual Showcase */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 shadow-2xl group">
              <img
                src="/src/assets/images/hero_game_market_1791887028020.jpg"
                alt="GameVault Escrow Marketplace Arena"
                className="w-full h-80 object-cover transform group-hover:scale-105 transition-transform duration-700"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent pointer-events-none" />

              <div className="absolute bottom-4 left-4 right-4 p-3 rounded-xl bg-slate-900/85 backdrop-blur-md border border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <div className="text-slate-400">ระบบรักษาความปลอดภัย</div>
                  <div className="font-semibold text-white">Smart Escrow Vault Protocol</div>
                </div>
                <div className="text-right">
                  <div className="text-slate-400">คุ้มครองยอดซื้อขาย</div>
                  <div className="font-bold text-amber-400 font-mono tabular-nums">฿100,000+</div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
