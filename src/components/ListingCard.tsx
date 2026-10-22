import React from 'react';
import { ShieldCheck, Award, Eye } from 'lucide-react';
import { GameAccountListing } from '../types';

interface ListingCardProps {
  listing: GameAccountListing;
  onSelect: (listing: GameAccountListing) => void;
  onViewSellerProfile?: (sellerId: string) => void;
}

export const ListingCard: React.FC<ListingCardProps> = ({ 
  listing, 
  onSelect,
  onViewSellerProfile 
}) => {
  const isAvailable = listing.status === 'available';

  return (
    <div 
      onClick={() => onSelect(listing)}
      className="group flex flex-col rounded-xl overflow-hidden border border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900 transition-all duration-200 cursor-pointer"
    >
      {/* Visual Thumbnail */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-950">
        <img
          src={listing.images[0] || '/src/assets/images/hero_game_market_1791887028020.jpg'}
          alt={listing.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />

        {/* Quiet Top Overlay: Game Name & Warranty */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between text-xs text-slate-200">
          <span className="bg-slate-950/80 backdrop-blur-sm px-2 py-0.5 rounded text-[11px] font-semibold text-amber-300 border border-slate-800">
            {listing.game}
          </span>
          <span className="bg-slate-950/80 backdrop-blur-sm px-2 py-0.5 rounded text-[11px] text-slate-300 border border-slate-800 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>ประกัน {listing.warrantyDays} วัน</span>
          </span>
        </div>

        {/* Status indicator if not available */}
        {!isAvailable && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-[2px] flex items-center justify-center">
            <span className="text-sm font-semibold text-amber-400 border border-amber-500/40 px-3 py-1 rounded-md bg-slate-900/90">
              {listing.status === 'in_escrow' ? 'กำลังอยู่ในระบบคนกลาง' : 'ขายแล้วเรียบร้อย'}
            </span>
          </div>
        )}
      </div>

      {/* Content Body */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div>
          {/* Unboxed Metadata (Zero-Pill discipline) */}
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1.5">
            <span>{listing.server}</span>
            <span aria-hidden="true">·</span>
            <span>{listing.rank}</span>
            <span aria-hidden="true">·</span>
            <span>{listing.loginType}</span>
          </div>

          {/* Account Title */}
          <h3 className="text-sm font-semibold text-white line-clamp-2 leading-snug group-hover:text-amber-300 transition-colors">
            {listing.title}
          </h3>
        </div>

        {/* Account Inventory Highlights */}
        <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-slate-850">
          <div>
            <span className="text-slate-500">จำนวนสกิน: </span>
            <span className="font-semibold text-slate-200 font-mono tabular-nums">{listing.skinCount} สกิน</span>
          </div>
          <div>
            <span className="text-slate-500">ตัวละคร: </span>
            <span className="font-semibold text-slate-200 font-mono tabular-nums">{listing.characterCount} ตัว</span>
          </div>
        </div>

        {/* Seller Info & Escrow Price Strip */}
        <div className="pt-1 flex items-center justify-between">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onViewSellerProfile?.(listing.sellerId);
            }}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors group/seller text-left"
            title="คลิกเพื่อดูโปรไฟล์, ประวัติการขาย และรีวิวของผู้ขาย"
          >
            <Award className="w-3.5 h-3.5 text-sky-400" />
            <span className="truncate max-w-[100px] text-slate-300 font-medium group-hover/seller:text-amber-300 underline-offset-2 hover:underline">
              {listing.sellerName}
            </span>
            {listing.sellerVerified && (
              <span className="text-[10px] text-sky-400 font-semibold" title="ผู้ขายผ่านการยืนยันตัวตนด้วยบัตรประชาชน">
                [KYC]
              </span>
            )}
          </button>

          <div className="text-right">
            <div className="text-[11px] text-slate-500">ราคาซื้อขาย</div>
            <div className="text-lg font-bold text-amber-400 font-mono tabular-nums">
              ฿{listing.price.toLocaleString()}
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect(listing);
          }}
          disabled={!isAvailable}
          className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
            isAvailable
              ? 'bg-slate-800 hover:bg-amber-400 hover:text-slate-950 text-white'
              : 'bg-slate-800/50 text-slate-500 cursor-not-allowed'
          }`}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>{isAvailable ? 'ดูรายละเอียด & ซื้อผ่านคนกลาง' : 'ปิดการขาย'}</span>
        </button>
      </div>
    </div>
  );
};
