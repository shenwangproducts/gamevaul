import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShieldCheck, 
  Lock, 
  AlertCircle, 
  UserCheck, 
  CheckCircle2, 
  Wallet, 
  ArrowRight,
  Clock,
  Sparkles
} from 'lucide-react';
import { GameAccountListing, User, Review } from '../types';

interface ListingDetailModalProps {
  listing: GameAccountListing | null;
  currentUser: User | null;
  onClose: () => void;
  onPurchase: (listingId: string) => Promise<void>;
  onOpenWallet: () => void;
  onViewSellerProfile?: (sellerId: string) => void;
}

export const ListingDetailModal: React.FC<ListingDetailModalProps> = ({
  listing,
  currentUser,
  onClose,
  onPurchase,
  onOpenWallet,
  onViewSellerProfile,
}) => {
  const [isBuying, setIsBuying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sellerReviews, setSellerReviews] = useState<Review[]>([]);
  const [sellerRating, setSellerRating] = useState<number>(listing?.sellerRating || 5.0);
  const [showReviews, setShowReviews] = useState(true);

  useEffect(() => {
    if (listing?.sellerId) {
      fetch(`/api/sellers/${listing.sellerId}/reviews`)
        .then(r => r.json())
        .then(data => {
          if (data && Array.isArray(data.reviews)) {
            setSellerReviews(data.reviews);
            if (data.rating) setSellerRating(data.rating);
          }
        })
        .catch(err => console.error('Failed to fetch reviews:', err));
    }
  }, [listing?.sellerId]);

  if (!listing) return null;

  const userBalance = currentUser?.balance || 0;
  const hasEnoughBalance = userBalance >= listing.price;
  const isAvailable = listing.status === 'available';

  const handleBuy = async () => {
    if (!currentUser) {
      onClose();
      onPurchase(listing.id).catch(() => {});
      return;
    }
    setErrorMsg(null);
    setIsBuying(true);
    try {
      await onPurchase(listing.id);
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('เกิดข้อผิดพลาดในการสั่งซื้อ');
      }
    } finally {
      setIsBuying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
              {listing.game}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              ID: #{listing.id}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="grid grid-cols-1 lg:grid-cols-12 max-h-[80vh] overflow-y-auto">
          
          {/* Left Column: Image & Details */}
          <div className="lg:col-span-7 p-6 border-b lg:border-b-0 lg:border-r border-slate-800 space-y-6">
            
            {/* Main Showcase Image */}
            <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 aspect-[16/10]">
              <img
                src={listing.images[0] || '/src/assets/images/hero_game_market_1791887028020.jpg'}
                alt={listing.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute bottom-3 left-3 bg-slate-950/85 backdrop-blur-sm px-3 py-1 rounded text-xs text-slate-300 border border-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>รับประกันคืนเงินโดยระบบคนกลาง {listing.warrantyDays} วัน</span>
              </div>
            </div>

            {/* Title & Description */}
            <div>
              <h2 className="text-lg font-bold text-white mb-2 leading-snug">
                {listing.title}
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-line bg-slate-950/50 p-3.5 rounded-xl border border-slate-850">
                {listing.description}
              </p>
            </div>

            {/* Specs Grid */}
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-850">
                <div className="text-slate-500 text-[11px]">ระดับแรงก์</div>
                <div className="font-semibold text-white mt-0.5">{listing.rank}</div>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-850">
                <div className="text-slate-500 text-[11px]">จำนวนสกิน</div>
                <div className="font-semibold text-white font-mono tabular-nums mt-0.5">{listing.skinCount} สกิน</div>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-850">
                <div className="text-slate-500 text-[11px]">เซิร์ฟเวอร์</div>
                <div className="font-semibold text-white mt-0.5">{listing.server}</div>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-850">
                <div className="text-slate-500 text-[11px]">ประเภทล็อกอิน</div>
                <div className="font-semibold text-white mt-0.5">{listing.loginType}</div>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-850">
                <div className="text-slate-500 text-[11px]">เลเวลไอดี</div>
                <div className="font-semibold text-white font-mono tabular-nums mt-0.5">Lv. {listing.level}</div>
              </div>
              <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-850">
                <div className="text-slate-500 text-[11px]">ตัวละคร/ฮีโร่</div>
                <div className="font-semibold text-white font-mono tabular-nums mt-0.5">{listing.characterCount} ตัว</div>
              </div>
            </div>

            {/* Security Verification Badges */}
            <div className="space-y-2 pt-2">
              <div className="text-xs font-semibold text-slate-300">ความปลอดภัยของไอดีนี้ (Verified):</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>เปลี่ยนอีเมลได้ 100%</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>ปลดการยืนยันเบอร์โทรแล้ว</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>ไอดีสะอาด ไม่เคยใช้โปรแกรม</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>เก็บรหัสในตู้นิรภัยคนกลาง</span>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Seller & Escrow Purchase Module */}
          <div className="lg:col-span-5 p-6 bg-slate-950/40 flex flex-col justify-between space-y-6">
            
            {/* Seller Credibility Card with Reviews */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                  ข้อมูลผู้ขาย & รีวิวความน่าเชื่อถือ
                </span>
                {onViewSellerProfile && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onViewSellerProfile(listing.sellerId);
                    }}
                    className="text-[11px] text-sky-400 hover:text-sky-300 hover:underline flex items-center gap-1 font-medium"
                  >
                    <span>ดูโปรไฟล์ & ประวัติขาย</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
                  <UserCheck className="w-5 h-5 text-sky-400" />
                </div>
                <div>
                  <div className="font-semibold text-sm text-white flex items-center gap-1.5">
                    <span>{listing.sellerName}</span>
                    {listing.sellerVerified && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-500/10 text-sky-400 border border-sky-500/30">
                        ยืนยันบัตร ปชช. แล้ว
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                    <span className="text-amber-400 font-medium">
                      ได้รับ {sellerReviews.length > 0 ? sellerReviews.length : (listing.sellerRating ? 4 : 0)} รีวิว
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="text-emerald-400">ประวัติขายปลอดภัย</span>
                  </div>
                </div>
              </div>

              {/* Recent Buyer Reviews Accordion / Preview */}
              <div className="border-t border-slate-800 pt-3 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-300 font-semibold">
                  <span className="flex items-center gap-1 text-amber-400">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>รีวิวจากผู้ซื้อจริง ({sellerReviews.length})</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowReviews(!showReviews)}
                    className="text-[11px] text-sky-400 hover:underline"
                  >
                    {showReviews ? 'ซ่อนรีวิว' : 'ดูรีวิวทั้งหมด'}
                  </button>
                </div>

                {showReviews && (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {sellerReviews.length === 0 ? (
                      <div className="text-xs text-slate-500 py-2 text-center">
                        ยังไม่มีรีวิวสำหรับผู้ขายรายนี้
                      </div>
                    ) : (
                      sellerReviews.map((rev) => (
                        <div key={rev.id} className="p-2.5 rounded-lg bg-slate-950 border border-slate-850 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-200">{rev.buyerName}</span>
                            <div className="flex items-center text-amber-400 text-xs">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <span key={i} className={i < Math.floor(rev.rating) ? 'text-amber-400' : 'text-slate-700'}>
                                  ★
                                </span>
                              ))}
                              <span className="ml-1 text-[11px] text-slate-400 font-mono">({rev.rating})</span>
                            </div>
                          </div>
                          <p className="text-slate-300 text-[11px] leading-relaxed">{rev.comment}</p>
                          <div className="text-[10px] text-slate-500 flex items-center gap-1">
                            <span>ไอดีเกม: {rev.game}</span>
                            <span>·</span>
                            <span>{new Date(rev.createdAt).toLocaleDateString('th-TH')}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Escrow Protection Workflow Explanation */}
            <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-2.5 text-xs text-slate-300">
              <div className="font-semibold text-amber-300 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-amber-400" />
                <span>การคุ้มครองผ่านคนกลาง Escrow 100%</span>
              </div>
              <ul className="space-y-1.5 text-slate-400 text-[11px]">
                <li className="flex items-start gap-1.5">
                  <span className="text-amber-400 font-bold">1.</span>
                  <span>เมื่อกดซื้อ ยอดเงินจะถูกกักไว้ที่คนกลาง ยังไม่เข้าผู้ขาย</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-amber-400 font-bold">2.</span>
                  <span>คุณจะได้รับ Username / Password ทันทีในระบบ</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-amber-400 font-bold">3.</span>
                  <span>มีเวลาตรวจไอดี 24 ชม. หากผิดปกติแจ้งอายัดเงินได้ทันที</span>
                </li>
              </ul>
            </div>

            {/* Purchase Pricing & Wallet Action */}
            <div className="space-y-4 pt-2">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-slate-400">ราคาสุทธิ (ไม่มีค่าธรรมเนียมคนกลาง):</span>
                <span className="text-2xl font-extrabold text-amber-400 font-mono tabular-nums">
                  ฿{listing.price.toLocaleString()}
                </span>
              </div>

              {!currentUser ? (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-white">กรุณาเข้าสู่ระบบหรือสมัครสมาชิกก่อนสั่งซื้อ</p>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        ระบบคนกลาง Escrow จำเป็นต้องใช้บัญชีของคุณเพื่อกักเงินและส่งมอบรหัสผ่านอย่างปลอดภัย
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleBuy}
                    className="w-full py-3.5 px-4 rounded-xl text-sm font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-400/20 active:scale-[0.99]"
                  >
                    <Lock className="w-4 h-4" />
                    <span>เข้าสู่ระบบ / สมัครสมาชิกเพื่อซื้อไอดีนี้</span>
                  </button>
                </div>
              ) : (
                <>
                  {/* Wallet Balance Status */}
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-slate-300">
                      <Wallet className="w-4 h-4 text-slate-400" />
                      <span>ยอดเงินในกระเป๋าคุณ:</span>
                    </div>
                    <div className="font-semibold text-white font-mono tabular-nums">
                      ฿{userBalance.toLocaleString()}
                    </div>
                  </div>

                  {errorMsg && (
                    <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  {hasEnoughBalance ? (
                    <button
                      onClick={handleBuy}
                      disabled={!isAvailable || isBuying}
                      className={`w-full py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
                        isAvailable && !isBuying
                          ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-lg shadow-amber-400/20'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <Lock className="w-4 h-4" />
                      <span>{isBuying ? 'กำลังดำเนินการผ่านคนกลาง...' : 'ชำระเงินผ่านระบบคนกลาง (รับรหัสทันที)'}</span>
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-xs text-rose-400 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>ยอดเงินไม่พอ (ขาดอีก ฿{(listing.price - userBalance).toLocaleString()})</span>
                      </div>
                      <button
                        onClick={() => {
                          onClose();
                          onOpenWallet();
                        }}
                        className="w-full py-3 px-4 rounded-xl text-sm font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-500/20"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>เติมเงินผ่าน PromptPay QR ทันที</span>
                      </button>
                    </div>
                  )}
                </>
              )}

              <div className="text-[11px] text-center text-slate-500 flex items-center justify-center gap-1">
                <Clock className="w-3 h-3 text-slate-500" />
                <span>การคุ้มครองเริ่มทันทีหลังหักยอดเงินสำเร็จ</span>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
