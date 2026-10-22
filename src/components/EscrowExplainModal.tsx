import React from 'react';
import { X, ShieldCheck, Lock, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

interface EscrowExplainModalProps {
  onClose: () => void;
}

export const EscrowExplainModal: React.FC<EscrowExplainModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-6 my-6">
        
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-amber-400" />
            <div>
              <h3 className="text-base font-bold text-white">ระบบคนกลางคุ้มครองความปลอดภัย 100% (Escrow)</h3>
              <p className="text-xs text-slate-400">ปิดประตูการโกงและดึงไอดีคืนทุกกรณี</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Middleman Identity Callout */}
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 space-y-1.5">
          <div className="font-bold text-amber-300 flex items-center gap-1.5">
            <Lock className="w-4 h-4 text-amber-400" />
            <span>ใครคือคนกลาง? และเงินจะไปถึงผู้ขายได้อย่างไร?</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            <strong>คนกลางคือแพลตฟอร์ม GameVault และเจ้าหน้าที่แอดมินคนกลางของเรา:</strong> เมื่อผู้ซื้อชำระเงิน เงินจะถูกกักไว้ที่คนกลางอย่างปลอดภัย ผู้ขายยังไม่ได้เงินจนกว่าผู้ซื้อจะได้รับไอดีและตรวจสอบเข้าเกมสำเร็จ เมื่อผู้ซื้อแจ้งคนกลางว่าเข้าได้แล้ว หรือกดยืนยัน คนกลางจะทำการโอนเงินเข้ากระเป๋าผู้ขายทันที
          </p>
        </div>

        {/* 4-Step Flow */}
        <div className="space-y-3.5">
          <div className="flex items-start gap-4 p-3.5 rounded-xl bg-slate-950 border border-slate-850">
            <div className="w-7 h-7 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-xs shrink-0">
              1
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">ผู้ซื้อชำระเงินเข้าตู้เซฟคนกลาง</h4>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                ยอดเงินถูกกักไว้ที่คนกลาง เงินยังไม่โอนให้ผู้ขาย
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-3.5 rounded-xl bg-slate-950 border border-slate-850">
            <div className="w-7 h-7 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xs shrink-0">
              2
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">รับรหัสผ่านและวิธีเปลี่ยนอีเมลทันที</h4>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                ระบบเปิดเผย Username / Password และ 2FA Recovery ในหน้ารายการสั่งซื้อ
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-3.5 rounded-xl bg-slate-950 border border-slate-850">
            <div className="w-7 h-7 rounded-full bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 font-bold text-xs shrink-0">
              3
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">ผู้ซื้อเข้าเกมและแจ้งผลให้คนกลางทราบ</h4>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                ผู้ซื้อมีเวลาตรวจไอดี 24 ชม. และกดแจ้งคนกลางได้ 2 แบบ:
                <br />• <strong>เข้าได้ปกติ:</strong> แจ้งคนกลางว่าเข้าได้เรียบร้อย เพื่อให้คนกลางส่งเงินให้ผู้ขาย
                <br />• <strong>ติดปัญหา:</strong> แจ้งคนกลางว่าเข้าไม่ได้ เพื่ออายัดเงินและให้เจ้าหน้าที่เข้าช่วยเหลือ
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-3.5 rounded-xl bg-slate-950 border border-slate-850">
            <div className="w-7 h-7 rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 font-bold text-xs shrink-0">
              4
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">คนกลางโอนเงินให้ผู้ขาย & ผู้ซื้อให้คะแนนรีวิว ⭐</h4>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                เมื่อตรวจสอบผ่าน คนกลางจะโอนเงินให้ผู้ขาย และผู้ซื้อสามารถให้คะแนนดาวและเขียนรีวิวผู้ขายเพื่อสร้างความน่าเชื่อถือในคอมมูนิตี้
              </p>
            </div>
          </div>
        </div>

        {/* Callout */}
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>
            ผู้ขายทุกรายบน GameVault ผ่านการยืนยันตัวตนด้วยบัตรประชาชน (KYC) 
            หากเกิดกรณีดึงไอดีคืน ระบบจะส่งต่อข้อมูลดำเนินคดีตามกฎหมายและชดเชยค่าเสียหายเต็มจำนวน
          </span>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors"
        >
          เข้าใจแล้ว เริ่มต้นใช้งาน
        </button>

      </div>
    </div>
  );
};
