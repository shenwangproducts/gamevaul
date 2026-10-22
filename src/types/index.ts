export type UserRole = 'buyer' | 'seller' | 'admin';

export type KycStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

export interface Review {
  id: string;
  orderId: string;
  buyerId: string;
  buyerName: string;
  buyerAvatar?: string;
  sellerId: string;
  rating: number; // 1 to 5
  comment: string;
  game: string;
  createdAt: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  balance: number;
  kycStatus: KycStatus;
  kycData?: {
    realName: string;
    idCardNumber: string;
    bankName: string;
    bankAccount: string;
    submittedAt: string;
  };
  phone: string;
  rating: number;
  totalSales: number;
  reviewsCount: number;
  reviews: Review[];
  avatar: string;
  memberSince?: string;
  responseRate?: string;
  escrowBalance?: number;
  vaultPoints?: number;
}

export type GameCategory = 
  | 'Valorant'
  | 'RoV'
  | 'Genshin Impact'
  | 'Free Fire'
  | 'Roblox'
  | 'FC Online'
  | 'Honkai: Star Rail';

export interface AccountCredentials {
  usernameOrEmail: string;
  password: string;
  twoFactorOrRecovery: string;
  changeEmailGuide: string;
}

export type ListingStatus = 'available' | 'in_escrow' | 'completed' | 'cancelled';

export interface GameAccountListing {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerRating: number;
  sellerVerified: boolean;
  game: GameCategory;
  title: string;
  description: string;
  price: number;
  rank: string;
  skinCount: number;
  characterCount: number;
  level: number;
  server: string;
  loginType: string;
  warrantyDays: number;
  images: string[];
  status: ListingStatus;
  credentials: AccountCredentials;
  emailChangeable: boolean;
  twoFactorDisabled: boolean;
  firstOwnerClean: boolean;
  createdAt: string;
}

export type OrderStatus = 'escrow_held' | 'buyer_inspecting' | 'disputed' | 'completed' | 'refunded';

export interface Order {
  id: string;
  listingId: string;
  listingTitle: string;
  game: GameCategory;
  price: number;
  buyerId: string;
  buyerName: string;
  sellerId: string;
  sellerName: string;
  status: OrderStatus;
  credentialsRevealed: boolean;
  credentials: AccountCredentials;
  createdAt: string;
  autoReleaseDeadline: string; // ISO timestamp (24h after purchase)
  disputeReason?: string;
  disputeEvidenceUrl?: string;
  disputeStatus?: 'none' | 'opened' | 'admin_reviewing' | 'resolved_seller' | 'resolved_buyer';
  adminNotes?: string;
  buyerReportStatus?: 'pending_inspection' | 'confirmed_working' | 'has_issue';
  buyerReportNotes?: string;
  buyerReportedAt?: string;
  reviewSubmitted?: boolean;
  review?: Review;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  userName: string;
  type: 'topup' | 'purchase_escrow' | 'escrow_release' | 'withdrawal' | 'refund';
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  referenceCode: string;
  paymentMethod: 'promptpay_qr' | 'bank_transfer' | 'system';
  slipUrl?: string;
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    accountName: string;
  };
  stripePaymentIntentId?: string;
  stripeHostedInstructionsUrl?: string;
  stripeImageUrl?: string;
  createdAt: string;
}

export interface BlacklistEntry {
  id: string;
  name: string;
  bankAccount: string;
  bankName: string;
  phoneNumber: string;
  scamGame: string;
  scamAmount: number;
  scamDetails: string;
  reportedCount: number;
  addedAt: string;
  evidenceCount: number;
}

export interface SecurityAuditLog {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  category: 'auth' | 'escrow' | 'credential_access' | 'financial' | 'admin';
  details: string;
  ipAddress: string;
}

export interface AdminStats {
  totalGmv: number;
  activeEscrowAmount: number;
  activeListingsCount: number;
  completedDealsCount: number;
  pendingDisputesCount: number;
  pendingSlipsCount: number;
  pendingKycCount: number;
  totalUsersCount: number;
}
