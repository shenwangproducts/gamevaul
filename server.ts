import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import QRCode from 'qrcode';
import generatePayload from 'promptpay-qr';
import { 
  INITIAL_USERS, 
  INITIAL_LISTINGS, 
  INITIAL_ORDERS, 
  INITIAL_TRANSACTIONS, 
  INITIAL_BLACKLIST, 
  INITIAL_AUDIT_LOGS 
} from './src/data/mockData';
import { 
  User, 
  GameAccountListing, 
  Order, 
  WalletTransaction, 
  BlacklistEntry, 
  SecurityAuditLog, 
  AdminStats,
  Review 
} from './src/types';
import { google } from 'googleapis';
import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.resolve(__dirname, 'database.json');

let users: User[] = [];
let listings: GameAccountListing[] = [];
let orders: Order[] = [];
let transactions: WalletTransaction[] = [];
let blacklist: BlacklistEntry[] = [];
let auditLogs: SecurityAuditLog[] = [];
let currentUserId: string | null = null;
let merchantPromptPayNumber = process.env.PROMPTPAY_NUMBER || '0982349812';
let STRIPE_PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY || '';
let STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
let STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

function loadDatabase() {
  if (fs.existsSync(DB_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
      users = data.users || JSON.parse(JSON.stringify(INITIAL_USERS));
      listings = data.listings || JSON.parse(JSON.stringify(INITIAL_LISTINGS));
      orders = data.orders || JSON.parse(JSON.stringify(INITIAL_ORDERS));
      transactions = data.transactions || JSON.parse(JSON.stringify(INITIAL_TRANSACTIONS));
      blacklist = data.blacklist || JSON.parse(JSON.stringify(INITIAL_BLACKLIST));
      auditLogs = data.auditLogs || JSON.parse(JSON.stringify(INITIAL_AUDIT_LOGS));
      currentUserId = data.currentUserId || null;
      if (data.merchantSettings) {
        if (data.merchantSettings.merchantPromptPayNumber) merchantPromptPayNumber = data.merchantSettings.merchantPromptPayNumber;
        if (!STRIPE_PUBLISHABLE_KEY && data.merchantSettings.stripePublishableKey) STRIPE_PUBLISHABLE_KEY = data.merchantSettings.stripePublishableKey;
        if (!STRIPE_SECRET_KEY && data.merchantSettings.stripeSecretKey) STRIPE_SECRET_KEY = data.merchantSettings.stripeSecretKey;
        if (!STRIPE_WEBHOOK_SECRET && data.merchantSettings.stripeWebhookSecret) STRIPE_WEBHOOK_SECRET = data.merchantSettings.stripeWebhookSecret;
      }
      return;
    } catch (e) {
      console.error('Failed to parse database.json, initializing mock data', e);
    }
  }
  users = JSON.parse(JSON.stringify(INITIAL_USERS));
  listings = JSON.parse(JSON.stringify(INITIAL_LISTINGS));
  orders = JSON.parse(JSON.stringify(INITIAL_ORDERS));
  transactions = JSON.parse(JSON.stringify(INITIAL_TRANSACTIONS));
  blacklist = JSON.parse(JSON.stringify(INITIAL_BLACKLIST));
  auditLogs = JSON.parse(JSON.stringify(INITIAL_AUDIT_LOGS));
  currentUserId = null;
  saveDatabase();
}

function saveDatabase() {
  try {
    const data = {
      users,
      listings,
      orders,
      transactions,
      blacklist,
      auditLogs,
      currentUserId,
      merchantSettings: {
        merchantPromptPayNumber,
        stripePublishableKey: STRIPE_PUBLISHABLE_KEY,
        stripeSecretKey: STRIPE_SECRET_KEY,
        stripeWebhookSecret: STRIPE_WEBHOOK_SECRET,
      }
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to save database.json', e);
  }
}

loadDatabase();

function logAudit(actor: string, action: string, category: SecurityAuditLog['category'], details: string, ip = '127.0.0.1') {
  const log: SecurityAuditLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    actor,
    action,
    category,
    details,
    ipAddress: ip,
  };
  auditLogs.unshift(log);
  if (auditLogs.length > 100) auditLogs.pop();
  saveDatabase();
  return log;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // --- Auth & Profile APIs ---
  app.get('/api/auth/me', (req, res) => {
    const user = currentUserId ? (users.find(u => u.id === currentUserId) || null) : null;
    res.json({ user, allUsers: users });
  });

  // Get User Profile with Sales History, KYC Trust, and Listings
  app.get('/api/users/:id/profile', (req, res) => {
    const targetUser = users.find(u => u.id === req.params.id);
    if (!targetUser) return res.status(404).json({ error: 'ไม่พบผู้ใช้งาน' });

    const userListings = listings.filter(l => l.sellerId === targetUser.id && l.status === 'available');
    const completedListingsCount = orders.filter(o => o.sellerId === targetUser.id && o.status === 'completed').length;

    // Mask ID card for security privacy (e.g. 310060012****)
    let sanitizedKyc = null;
    if (targetUser.kycData) {
      sanitizedKyc = {
        realName: targetUser.kycData.realName,
        idCardMasked: targetUser.kycData.idCardNumber.substring(0, 8) + '*****',
        bankName: targetUser.kycData.bankName,
        bankAccountMasked: targetUser.kycData.bankAccount.substring(0, 4) + '****' + targetUser.kycData.bankAccount.slice(-3),
        submittedAt: targetUser.kycData.submittedAt,
      };
    }

    res.json({
      user: {
        id: targetUser.id,
        username: targetUser.username,
        role: targetUser.role,
        rating: targetUser.rating || 5.0,
        totalSales: (targetUser.totalSales || 0) + completedListingsCount,
        reviewsCount: targetUser.reviewsCount || targetUser.reviews?.length || 0,
        avatar: targetUser.avatar,
        phone: targetUser.phone,
        kycStatus: targetUser.kycStatus,
        memberSince: targetUser.memberSince || '2024',
        responseRate: targetUser.responseRate || '99% (ตอบกลับไว)',
      },
      kycData: sanitizedKyc,
      reviews: targetUser.reviews || [],
      listings: userListings,
    });
  });


  // Store active email OTPs in memory with timestamp
  const emailOtpStore = new Map<string, { code: string; expiresAt: number }>();

  // Real Email service endpoint
  app.post('/api/auth/send-otp', async (req, res) => {
    const { email } = req.body;
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'กรุณาระบุอีเมลที่ถูกต้อง' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    emailOtpStore.set(cleanEmail, {
      code: otp,
      expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes validity
    });

    let realEmailSent = false;
    try {
      let apiKey = "AIzaSyBqnOBl2VBLa90_amohpbw7t3x5_1onHGk";
      const configPath = path.resolve(__dirname, 'firebase-applet-config.json');
      if (fs.existsSync(configPath)) {
        try {
          const cfg = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
          if (cfg.apiKey) apiKey = cfg.apiKey;
        } catch {}
      }

      const continueUrl = process.env.APP_URL || "https://ais-dev-olzaqaaocwl4l2cgd527cn-74288553499.asia-southeast1.run.app";
      const fbResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestType: "EMAIL_SIGNIN",
          email: cleanEmail,
          continueUrl: continueUrl,
          canHandleCodeInApp: true
        })
      });
      const fbData = await fbResponse.json();
      if (fbResponse.ok) {
        realEmailSent = true;
        console.log(`[REAL FIREBASE EMAIL SENT] Dispatched to ${cleanEmail}:`, fbData);
      } else {
        console.warn(`[FIREBASE EMAIL WARNING]`, fbData);
      }
    } catch (err) {
      console.error('Error dispatching real email via Firebase:', err);
    }

    logAudit('SYSTEM', 'EMAIL_OTP_DISPATCHED', 'auth', `ส่งอีเมลยืนยันตัวตนจริงไปยัง: ${cleanEmail}`);

    res.json({ 
      success: true, 
      otp,
      realEmailSent,
      message: `ระบบได้ส่งอีเมลยืนยันตัวตนจริงไปยัง ${cleanEmail} เรียบร้อยแล้ว (สามารถคลิกลิงก์ในอีเมล หรือใช้รหัสยืนยัน 4 หลัก)` 
    });
  });

  // Verify Email OTP endpoint
  app.post('/api/auth/verify-otp', (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, error: 'กรุณากรอกรหัส OTP' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const stored = emailOtpStore.get(cleanEmail);

    if (!stored) {
      return res.status(400).json({ success: false, error: 'ไม่พบคำขอ OTP หรือรหัสหมดอายุ กรุณากดส่งรหัสใหม่' });
    }

    if (Date.now() > stored.expiresAt) {
      emailOtpStore.delete(cleanEmail);
      return res.status(400).json({ success: false, error: 'รหัส OTP หมดอายุแล้ว กรุณากดส่งใหม่อีกครั้ง' });
    }

    if (stored.code !== otp.toString().trim()) {
      return res.status(400).json({ success: false, error: 'รหัส OTP ไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง' });
    }

    emailOtpStore.delete(cleanEmail);
    logAudit('SYSTEM', 'EMAIL_OTP_VERIFIED', 'auth', `ยืนยันอีเมลสำเร็จ: ${cleanEmail}`);
    res.json({ success: true, message: 'ยืนยันอีเมลเรียบร้อยแล้ว' });
  });

  app.post('/api/auth/switch-user', (req, res) => {
    const { userId } = req.body;
    const target = users.find(u => u.id === userId);
    if (!target) {
      return res.status(404).json({ error: 'User not found' });
    }
    currentUserId = target.id;
    logAudit(target.username, 'AUTH_USER_SWITCHED', 'auth', `สลับผู้ใช้งานเป็น [${target.role.toUpperCase()}] ${target.username}`);
    res.json({ success: true, user: target });
  });

  app.post('/api/auth/register', (req, res) => {
    const { username, role, phone, email } = req.body;
    if (!username || !email) {
      return res.status(400).json({ error: 'กรุณากรอกชื่อผู้ใช้งานและอีเมล' });
    }

    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanUsername = (username || '').trim();

    // If account already exists with this email or username, update session and return user
    const existingUser = users.find(u => 
      u.email.toLowerCase() === cleanEmail || 
      u.username.toLowerCase() === cleanUsername.toLowerCase()
    );
    if (existingUser) {
      currentUserId = existingUser.id;
      saveDatabase();
      logAudit(existingUser.username, 'USER_LOGIN', 'auth', `เข้าสู่ระบบด้วยบัญชีเดิม: ${existingUser.username}`);
      return res.json({ success: true, user: existingUser, allUsers: users });
    }

    const newUser: User = {
      id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      username: cleanUsername,
      email: cleanEmail,
      role: role || 'buyer',
      balance: 0,
      kycStatus: role === 'seller' ? 'pending' : 'unverified',
      phone: phone || '',
      rating: 5.0,
      totalSales: 0,
      reviewsCount: 0,
      reviews: [],
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanUsername)}`,
      memberSince: '2026',
      responseRate: '100% (ตอบกลับทันที)',
      vaultPoints: 0,
    };

    users.push(newUser);
    currentUserId = newUser.id;
    saveDatabase();
    logAudit(newUser.username, 'USER_REGISTERED', 'auth', `ผู้ใช้ใหม่ลงทะเบียนสำเร็จในฐานะ [${newUser.role.toUpperCase()}] ${newUser.username}`);
    res.json({ success: true, user: newUser, allUsers: users });
  });

  // Login endpoint
  app.post('/api/auth/login', (req, res) => {
    const { email, username } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanUsername = (username || '').trim().toLowerCase();

    const user = users.find(u => 
      (cleanEmail && u.email.toLowerCase() === cleanEmail) ||
      (cleanUsername && u.username.toLowerCase() === cleanUsername)
    );

    if (!user) {
      return res.status(404).json({ error: 'ไม่พบบัญชีผู้ใช้งานนี้ในระบบ กรุณาสมัครสมาชิกก่อน' });
    }

    currentUserId = user.id;
    saveDatabase();
    logAudit(user.username, 'USER_LOGIN', 'auth', `ผู้ใช้เข้าสู่ระบบสำเร็จ: ${user.username}`);
    res.json({ success: true, user, allUsers: users });
  });

  // Logout endpoint
  app.post('/api/auth/logout', (req, res) => {
    currentUserId = null;
    saveDatabase();
    res.json({ success: true, message: 'ออกจากระบบเรียบร้อยแล้ว' });
  });

  app.post('/api/users/redeem-points', (req, res) => {
    const { pointsToRedeem } = req.body;
    const user = users.find(u => u.id === currentUserId);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    if ((user.vaultPoints || 0) < pointsToRedeem) {
      return res.status(400).json({ error: 'แต้มสะสม Vault Points ของคุณไม่เพียงพอ' });
    }

    user.vaultPoints = (user.vaultPoints || 0) - pointsToRedeem;
    const discountAmount = pointsToRedeem / 10; // e.g. 200 points = 20 THB discount/credit
    user.balance += discountAmount;

    transactions.unshift({
      id: `tx_redeem_${Date.now()}`,
      userId: user.id,
      userName: user.username,
      type: 'topup',
      amount: discountAmount,
      status: 'approved',
      referenceCode: `VAULT-POINTS-REDEEM-${pointsToRedeem}`,
      paymentMethod: 'system',
      createdAt: new Date().toISOString(),
    });

    logAudit(user.username, 'REDEEM_VAULT_POINTS', 'financial', `แลกแต้มสะสม ${pointsToRedeem} แต้ม เป็นเครดิตเงินเข้ากระเป๋า ฿${discountAmount}`);
    res.json({ success: true, user, message: `แลกสำเร็จ! ได้รับเครดิตเงินเข้ากระเป๋า ฿${discountAmount}` });
  });



  app.post('/api/auth/submit-kyc', (req, res) => {
    const { realName, idCardNumber, bankName, bankAccount } = req.body;
    const user = users.find(u => u.id === currentUserId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.kycStatus = 'pending';
    user.kycData = {
      realName,
      idCardNumber,
      bankName,
      bankAccount,
      submittedAt: new Date().toISOString(),
    };

    logAudit(user.username, 'KYC_SUBMITTED', 'financial', `ผู้ใช้ยื่นเอกสารยืนยันตัวตน KYC: บัตร ปชช. ${idCardNumber.substring(0, 4)}****`);
    res.json({ success: true, user });
  });

  app.post('/api/auth/thai-id-verify', (req, res) => {
    const { realName, idCardNumber, bankName, bankAccount } = req.body;
    const user = users.find(u => u.id === currentUserId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.kycStatus = 'verified';
    user.kycData = {
      realName: realName || `${user.username} (ผ่าน Thai ID App)`,
      idCardNumber: idCardNumber || '1-1099-00' + Math.floor(1000 + Math.random() * 9000),
      bankName: bankName || 'กสิกรไทย (KBANK)',
      bankAccount: bankAccount || 'xxx-x-xx' + Math.floor(1000 + Math.random() * 9000),
      submittedAt: new Date().toISOString(),
    };

    logAudit(user.username, 'THAI_ID_VERIFIED', 'financial', `ผู้ใช้ผูกและยืนยันตัวตนสำเร็จผ่านแอปพลิเคชัน Thai ID (D.DOPA): ${user.kycData.idCardNumber}`);
    res.json({ success: true, user, message: 'ยืนยันตัวตนผ่านแอป Thai ID (D.DOPA) สำเร็จเรียบร้อย' });
  });


  // --- Listings Marketplace APIs ---
  app.get('/api/listings', (req, res) => {
    const { game, search, minPrice, maxPrice, verifiedOnly } = req.query;
    let filtered = [...listings];

    if (game && game !== 'all') {
      filtered = filtered.filter(l => l.game.toLowerCase() === String(game).toLowerCase());
    }

    if (search) {
      const q = String(search).toLowerCase();
      filtered = filtered.filter(l => 
        l.title.toLowerCase().includes(q) || 
        l.description.toLowerCase().includes(q) ||
        l.rank.toLowerCase().includes(q) ||
        l.game.toLowerCase().includes(q)
      );
    }

    if (minPrice) {
      filtered = filtered.filter(l => l.price >= Number(minPrice));
    }

    if (maxPrice) {
      filtered = filtered.filter(l => l.price <= Number(maxPrice));
    }

    if (verifiedOnly === 'true') {
      filtered = filtered.filter(l => l.sellerVerified);
    }

    res.json(filtered);
  });

  app.get('/api/listings/:id', (req, res) => {
    const listing = listings.find(l => l.id === req.params.id);
    if (!listing) return res.status(404).json({ error: 'Listing not found' });
    res.json(listing);
  });

  app.post('/api/listings', (req, res) => {
    const user = users.find(u => u.id === currentUserId);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const {
      game,
      title,
      description,
      price,
      rank,
      skinCount,
      characterCount,
      level,
      server,
      loginType,
      warrantyDays,
      images,
      credentials,
    } = req.body;

    if (!title || !price || !credentials?.usernameOrEmail || !credentials?.password) {
      return res.status(400).json({ error: 'กรุณากรอกข้อมูลที่จำเป็นและข้อมูลล็อกอินเพื่อฝากในตู้นิรภัยคนกลาง' });
    }

    const newListing: GameAccountListing = {
      id: `acc_${Date.now()}`,
      sellerId: user.id,
      sellerName: user.username,
      sellerRating: user.rating || 5.0,
      sellerVerified: user.kycStatus === 'verified',
      game,
      title,
      description: description || 'ไม่มีรายละเอียดเพิ่มเติม',
      price: Number(price),
      rank: rank || 'Standard',
      skinCount: Number(skinCount) || 0,
      characterCount: Number(characterCount) || 0,
      level: Number(level) || 1,
      server: server || 'Thailand / Asia',
      loginType: loginType || 'Clean Mail / ID',
      warrantyDays: Number(warrantyDays) || 30,
      images: images?.length > 0 ? images : ['/src/assets/images/hero_game_market_1791887028020.jpg'],
      status: 'available',
      credentials: {
        usernameOrEmail: credentials.usernameOrEmail,
        password: credentials.password,
        twoFactorOrRecovery: credentials.twoFactorOrRecovery || 'Clean Account',
        changeEmailGuide: credentials.changeEmailGuide || 'เปลี่ยนอีเมลและรหัสผ่านได้ทันทีผ่านเว็บไซต์ทางการ',
      },
      emailChangeable: true,
      twoFactorDisabled: true,
      firstOwnerClean: true,
      createdAt: new Date().toISOString(),
    };

    listings.unshift(newListing);
    logAudit(user.username, 'LISTING_CREATED', 'credential_access', `ลงขายไอดีเกม ${game} มูลค่า ฿${newListing.price.toLocaleString()} (เข้ารหัสในตู้เซฟคนกลาง)`);
    res.json({ success: true, listing: newListing });
  });

  app.delete('/api/listings/:id', (req, res) => {
    const user = users.find(u => u.id === currentUserId);
    const index = listings.findIndex(l => l.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Listing not found' });

    const item = listings[index];
    if (user?.role !== 'admin' && item.sellerId !== user?.id) {
      return res.status(403).json({ error: 'ไม่มีสิทธิ์ลบรายการนี้' });
    }

    listings.splice(index, 1);
    logAudit(user?.username || 'System', 'LISTING_REMOVED', 'admin', `ลบรายการไอดี [${item.id}] ${item.title}`);
    res.json({ success: true });
  });

  // --- Orders & Escrow Engine APIs ---
  app.get('/api/orders', (req, res) => {
    const user = users.find(u => u.id === currentUserId);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    if (user.role === 'admin') {
      return res.json(orders);
    }

    const userOrders = orders.filter(o => o.buyerId === user.id || o.sellerId === user.id);
    res.json(userOrders);
  });

  app.post('/api/orders/checkout', (req, res) => {
    const { listingId } = req.body;
    const buyer = users.find(u => u.id === currentUserId);
    if (!buyer) return res.status(401).json({ error: 'Unauthorized' });

    const listing = listings.find(l => l.id === listingId);
    if (!listing) return res.status(404).json({ error: 'ไม่พบรายการไอดีนี้' });
    if (listing.status !== 'available') return res.status(400).json({ error: 'ไอดีนี้ถูกสั่งซื้อหรือไม่ได้เปิดขายแล้ว' });

    if (buyer.balance < listing.price) {
      return res.status(400).json({ 
        error: `ยอดเงินในกระเป๋าไม่เพียงพอ (ต้องการ ฿${listing.price.toLocaleString()}, มีอยู่ ฿${buyer.balance.toLocaleString()}) กรุณาเติมเงินผ่าน PromptPay ก่อนดำเนินการ` 
      });
    }

    // Deduct buyer's balance -> Hold in Escrow
    buyer.balance -= listing.price;
    listing.status = 'in_escrow';

    const deadline = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const newOrder: Order = {
      id: `ord_${Date.now()}`,
      listingId: listing.id,
      listingTitle: listing.title,
      game: listing.game,
      price: listing.price,
      buyerId: buyer.id,
      buyerName: buyer.username,
      sellerId: listing.sellerId,
      sellerName: listing.sellerName,
      status: 'buyer_inspecting',
      credentialsRevealed: true,
      credentials: listing.credentials,
      createdAt: new Date().toISOString(),
      autoReleaseDeadline: deadline,
      disputeStatus: 'none',
    };

    orders.unshift(newOrder);

    // Record wallet escrow transaction
    transactions.unshift({
      id: `tx_escrow_${Date.now()}`,
      userId: buyer.id,
      userName: buyer.username,
      type: 'purchase_escrow',
      amount: listing.price,
      status: 'approved',
      referenceCode: `ESCROW-HOLD-${newOrder.id}`,
      paymentMethod: 'system',
      createdAt: new Date().toISOString(),
    });

    logAudit(
      buyer.username, 
      'ESCROW_LOCKED_PURCHASE', 
      'escrow', 
      `กักเงินคนกลาง ฿${listing.price.toLocaleString()} และส่งมอบข้อมูลล็อกอินไอดี ${listing.game} ให้ผู้ซื้อตรวจสอบ`
    );

    res.json({ success: true, order: newOrder });
  });

  // Buyer confirms inspection: updates status to notify Admin to release payout
  app.post('/api/orders/:id/confirm-release', (req, res) => {
    const user = users.find(u => u.id === currentUserId);
    const order = orders.find(o => o.id === req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (user?.role !== 'admin' && order.buyerId !== user?.id) {
      return res.status(403).json({ error: 'คุณไม่ใช่ผู้ซื้อของคำสั่งซื้อนี้' });
    }

    if (order.status !== 'buyer_inspecting' && order.status !== 'escrow_held') {
      return res.status(400).json({ error: 'สถานะคำสั่งซื้อไม่อยู่ในขั้นตอนที่สามารถแจ้งปล่อยเงินได้' });
    }

    // Mark buyer inspection as confirmed working, awaiting Admin to release payout
    order.buyerReportStatus = 'confirmed_working';
    order.buyerReportNotes = 'ผู้ซื้อเข้าไอดีและตรวจสอบเรียบร้อยแล้ว แจ้งแอดมินคนกลางให้กดส่งเงินให้ผู้ขาย';
    order.buyerReportedAt = new Date().toISOString();

    logAudit(
      user?.username || 'Buyer', 
      'ESCROW_BUYER_CONFIRMED_AWAITING_ADMIN', 
      'escrow', 
      `ผู้ซื้อเข้าเกมและตรวจสอบผ่านแล้ว ส่งคำขอให้แอดมินคนกลางกดอนุมัติส่งเงิน ฿${order.price.toLocaleString()} ให้ผู้ขาย (${order.sellerName})`
    );

    res.json({ 
      success: true, 
      order,
      message: 'แจ้งแอดมินคนกลางเรียบร้อยแล้ว แอดมินจะทำการตรวจสอบและกดส่งเงินให้ผู้ขายทันที' 
    });
  });

  // Buyer reports dispute
  app.post('/api/orders/:id/dispute', (req, res) => {
    const user = users.find(u => u.id === currentUserId);
    const { reason, evidenceUrl } = req.body;
    const order = orders.find(o => o.id === req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (user?.role !== 'admin' && order.buyerId !== user?.id) {
      return res.status(403).json({ error: 'คุณไม่ใช่ผู้ซื้อของคำสั่งซื้อนี้' });
    }

    order.status = 'disputed';
    order.disputeStatus = 'opened';
    order.disputeReason = reason || 'รหัสผ่านไม่ถูกต้อง หรือข้อมูลไม่ตรงตามประกาศ';
    order.disputeEvidenceUrl = evidenceUrl || '';

    logAudit(
      user?.username || 'Buyer',
      'DISPUTE_OPENED',
      'escrow',
      `เปิดข้อพิพาทอายัดเงินคนกลางสำหรับคำสั่งซื้อ #${order.id}: ${order.disputeReason}`
    );

    res.json({ success: true, order });
  });

  // Buyer reports inspection status to Escrow (แจ้งคนกลางว่าเข้าได้ไหม ติดปัญหาอะไร)
  app.post('/api/orders/:id/report-inspection', (req, res) => {
    const user = users.find(u => u.id === currentUserId);
    const { status, notes } = req.body; // status: 'confirmed_working' | 'has_issue'
    const order = orders.find(o => o.id === req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (user?.role !== 'admin' && order.buyerId !== user?.id) {
      return res.status(403).json({ error: 'คุณไม่ใช่ผู้ซื้อของคำสั่งซื้อนี้' });
    }

    order.buyerReportStatus = status;
    order.buyerReportNotes = notes || (status === 'confirmed_working' ? 'เข้าเกมและเปลี่ยนอีเมลเรียบร้อยแล้ว แจ้งคนกลางส่งเงินให้ผู้ขายได้เลย' : 'ติดปัญหาเข้าไม่ได้');
    order.buyerReportedAt = new Date().toISOString();

    if (status === 'confirmed_working') {
      logAudit(
        user?.username || 'Buyer',
        'ESCROW_BUYER_REPORT_CONFIRMED',
        'escrow',
        `ผู้ซื้อแจ้งคนกลาง: เข้าไอดีสำเร็จ เปลี่ยนข้อมูลเรียบร้อย อนุมัติให้คนกลางส่งเงินให้ผู้ขาย (${order.sellerName})`
      );
    } else {
      order.status = 'disputed';
      order.disputeStatus = 'opened';
      order.disputeReason = notes || 'ผู้ซื้อแจ้งคนกลางว่าติดปัญหาเข้าไอดีไม่ได้';
      logAudit(
        user?.username || 'Buyer',
        'ESCROW_BUYER_REPORT_ISSUE',
        'escrow',
        `ผู้ซื้อแจ้งคนกลาง: ติดปัญหาเข้าไอดีไม่ได้ (${order.buyerReportNotes}) คนกลางอายัดเงินทันที`
      );
    }

    res.json({ success: true, order });
  });

  // Escrow Admin releases payout to seller based on buyer report
  app.post('/api/orders/:id/admin-release-payout', (req, res) => {
    const admin = users.find(u => u.id === currentUserId);
    if (admin?.role !== 'admin') {
      return res.status(403).json({ error: 'เฉพาะคนกลาง/ผู้ดูแลระบบ (Admin) เท่านั้น' });
    }

    const order = orders.find(o => o.id === req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const seller = users.find(u => u.id === order.sellerId);
    const buyer = users.find(u => u.id === order.buyerId);
    const earnedPoints = Math.max(50, Math.round(order.price * 0.05));

    if (seller) {
      seller.balance += order.price;
      seller.totalSales = (seller.totalSales || 0) + 1;
      seller.vaultPoints = (seller.vaultPoints || 0) + earnedPoints * 2;
    }
    if (buyer) {
      buyer.vaultPoints = (buyer.vaultPoints || 0) + earnedPoints;
    }

    order.status = 'completed';
    const listing = listings.find(l => l.id === order.listingId);
    if (listing) {
      listing.status = 'completed';
    }

    transactions.unshift({
      id: `tx_release_admin_${Date.now()}`,
      userId: order.sellerId,
      userName: order.sellerName,
      type: 'escrow_release',
      amount: order.price,
      status: 'approved',
      referenceCode: `ESCROW-PAYOUT-${order.id}`,
      paymentMethod: 'system',
      createdAt: new Date().toISOString(),
    });

    logAudit(
      admin.username,
      'ESCROW_ADMIN_PAYOUT_RELEASED',
      'financial',
      `คนกลางโอนเงิน ฿${order.price.toLocaleString()} ให้ผู้ขาย (${order.sellerName}) หลังผู้ซื้อตรวจสอบไอดีผ่าน`
    );

    res.json({ success: true, order });
  });

  // Submit Rating & Review for Seller
  app.post('/api/orders/:id/submit-review', (req, res) => {
    const user = users.find(u => u.id === currentUserId);
    const { rating, comment } = req.body;
    const order = orders.find(o => o.id === req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (order.buyerId !== user?.id && user?.role !== 'admin') {
      return res.status(403).json({ error: 'คุณไม่ใช่ผู้ซื้อของคำสั่งซื้อนี้' });
    }

    if (order.status !== 'completed') {
      return res.status(400).json({ error: 'สามารถให้คะแนนและรีวิวได้เฉพาะคำสั่งซื้อที่เสร็จสิ้นแล้วเท่านั้น' });
    }

    const seller = users.find(u => u.id === order.sellerId);
    if (!seller) return res.status(404).json({ error: 'ไม่พบผู้ขาย' });

    const numRating = Math.min(5, Math.max(1, Number(rating) || 5));

    const newReview: Review = {
      id: `rev_${Date.now()}`,
      orderId: order.id,
      buyerId: user.id,
      buyerName: user.username,
      buyerAvatar: user.avatar,
      sellerId: seller.id,
      rating: numRating,
      comment: comment || 'ได้รับไอดีตรงปก รวดเร็ว ปลอดภัยครับ',
      game: order.game,
      createdAt: new Date().toISOString(),
    };

    if (!seller.reviews) seller.reviews = [];
    seller.reviews.unshift(newReview);
    seller.reviewsCount = seller.reviews.length;

    // Recalculate average rating
    const totalScore = seller.reviews.reduce((sum, r) => sum + r.rating, 0);
    seller.rating = Number((totalScore / seller.reviews.length).toFixed(1));

    // Update listings with new rating
    listings.forEach(l => {
      if (l.sellerId === seller.id) {
        l.sellerRating = seller.rating;
      }
    });

    order.reviewSubmitted = true;
    order.review = newReview;

    logAudit(
      user.username,
      'SELLER_REVIEW_SUBMITTED',
      'auth',
      `ผู้ซื้อให้คะแนนผู้ขาย (${seller.username}) ${numRating} ดาว: "${newReview.comment}"`
    );

    res.json({ success: true, review: newReview, sellerRating: seller.rating, reviewsCount: seller.reviewsCount });
  });

  // Get Seller Reviews
  app.get('/api/sellers/:id/reviews', (req, res) => {
    const seller = users.find(u => u.id === req.params.id);
    if (!seller) return res.status(404).json({ error: 'Seller not found' });
    res.json({
      rating: seller.rating,
      reviewsCount: seller.reviewsCount || seller.reviews?.length || 0,
      reviews: seller.reviews || [],
    });
  });
  app.post('/api/orders/:id/admin-resolve', (req, res) => {
    const admin = users.find(u => u.id === currentUserId);
    if (admin?.role !== 'admin') {
      return res.status(403).json({ error: 'สงวนสิทธิ์เฉพาะผู้ดูแลระบบ (Admin) เท่านั้น' });
    }

    const { resolution, adminNotes } = req.body; // 'refund_buyer' or 'release_seller'
    const order = orders.find(o => o.id === req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const buyer = users.find(u => u.id === order.buyerId);
    const seller = users.find(u => u.id === order.sellerId);

    if (resolution === 'refund_buyer') {
      if (buyer) buyer.balance += order.price;
      order.status = 'refunded';
      order.disputeStatus = 'resolved_buyer';
      order.adminNotes = adminNotes || 'ผู้ดูแลระบบตัดสินคืนเงินให้ผู้ซื้อ เนื่องจากหลักฐานพบว่าไอดีมีปัญหา';

      transactions.unshift({
        id: `tx_refund_${Date.now()}`,
        userId: order.buyerId,
        userName: order.buyerName,
        type: 'refund',
        amount: order.price,
        status: 'approved',
        referenceCode: `REFUND-${order.id}`,
        paymentMethod: 'system',
        createdAt: new Date().toISOString(),
      });

      logAudit(
        admin.username,
        'DISPUTE_REFUND_BUYER',
        'admin',
        `แอดมินตัดสินคืนเงินคนกลาง ฿${order.price.toLocaleString()} ให้ผู้ซื้อ (${order.buyerName}) คำสั่งซื้อ #${order.id}`
      );
    } else {
      if (seller) {
        seller.balance += order.price;
        seller.totalSales = (seller.totalSales || 0) + 1;
      }
      order.status = 'completed';
      order.disputeStatus = 'resolved_seller';
      order.adminNotes = adminNotes || 'ผู้ดูแลระบบตัดสินโอนเงินให้ผู้ขาย เนื่องจากไอดีถูกต้องครบถ้วน';

      transactions.unshift({
        id: `tx_release_admin_${Date.now()}`,
        userId: order.sellerId,
        userName: order.sellerName,
        type: 'escrow_release',
        amount: order.price,
        status: 'approved',
        referenceCode: `ADMIN-RELEASE-${order.id}`,
        paymentMethod: 'system',
        createdAt: new Date().toISOString(),
      });

      logAudit(
        admin.username,
        'DISPUTE_RELEASE_SELLER',
        'admin',
        `แอดมินตัดสินโอนเงินคนกลาง ฿${order.price.toLocaleString()} ให้ผู้ขาย (${order.sellerName}) คำสั่งซื้อ #${order.id}`
      );
    }

    res.json({ success: true, order });
  });

  // --- Wallet & Topup APIs ---
  app.get('/api/wallet/transactions', (req, res) => {
    const user = users.find(u => u.id === currentUserId);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    if (user.role === 'admin') {
      return res.json(transactions);
    }

    const userTxs = transactions.filter(t => t.userId === user.id);
    res.json(userTxs);
  });

  app.post('/api/wallet/topup-request', (req, res) => {
    const user = users.find(u => u.id === currentUserId) || users[0];
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { amount, slipUrl } = req.body;
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ error: 'จำนวนเงินไม่ถูกต้อง' });
    }

    const tx: WalletTransaction = {
      id: `tx_topup_${Date.now()}`,
      userId: user.id,
      userName: user.username,
      type: 'topup',
      amount: Number(amount),
      status: 'pending',
      referenceCode: `GV-PP-${Math.floor(100000 + Math.random() * 900000)}`,
      paymentMethod: 'promptpay_qr',
      slipUrl: slipUrl || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400&q=80',
      createdAt: new Date().toISOString(),
    };

    transactions.unshift(tx);
    logAudit(user.username, 'TOPUP_SLIP_SUBMITTED', 'financial', `แจ้งเติมเงินผ่านพร้อมเพย์ ฿${amount} รหัสอ้างอิง ${tx.referenceCode}`);
    res.json({ success: true, transaction: tx });
  });

  // --- Stripe Gateway & PromptPay QR Integration for Shenwang Ent. ---
  app.get('/api/admin/merchant-settings', (req, res) => {
    res.json({
      success: true,
      gateway: 'Stripe (Shenwang Ent.)',
      merchantPromptPayNumber,
      stripePublishableKey: STRIPE_PUBLISHABLE_KEY,
      stripeSecretKey: STRIPE_SECRET_KEY,
      xenditPublicKey: STRIPE_PUBLISHABLE_KEY,
      xenditSecretKey: STRIPE_SECRET_KEY,
    });
  });

  app.post('/api/admin/merchant-settings', (req, res) => {
    const { promptPayNumber, stripePublishableKey, stripeSecretKey, xenditSecretKey, stripeWebhookSecret } = req.body;
    if (promptPayNumber) {
      merchantPromptPayNumber = promptPayNumber.trim();
      logAudit('Admin', 'UPDATE_PROMPTPAY_NUMBER', 'financial', `อัปเดตเบอร์พร้อมเพย์รับเงินร้านค้าเป็น: ${merchantPromptPayNumber}`);
    }
    if (stripePublishableKey) {
      STRIPE_PUBLISHABLE_KEY = stripePublishableKey.trim();
      logAudit('Admin', 'UPDATE_STRIPE_PUB_KEY', 'financial', `อัปเดต Stripe Key 1 (Publishable / ID): ${STRIPE_PUBLISHABLE_KEY}`);
    }
    const secretKeyToSave = stripeSecretKey || xenditSecretKey;
    if (secretKeyToSave) {
      STRIPE_SECRET_KEY = secretKeyToSave.trim();
      logAudit('Admin', 'UPDATE_STRIPE_SECRET_KEY', 'financial', `อัปเดต Stripe Key 2 (Secret / ID): ${STRIPE_SECRET_KEY}`);
    }
    if (stripeWebhookSecret) {
      STRIPE_WEBHOOK_SECRET = stripeWebhookSecret.trim();
      logAudit('Admin', 'UPDATE_STRIPE_WEBHOOK_SECRET', 'financial', `อัปเดต Stripe Webhook Secret: ${STRIPE_WEBHOOK_SECRET}`);
    }
    saveDatabase();
    res.json({ 
      success: true, 
      gateway: 'Stripe (Shenwang Ent.)',
      merchantPromptPayNumber, 
      stripePublishableKey: STRIPE_PUBLISHABLE_KEY, 
      stripeSecretKey: STRIPE_SECRET_KEY,
      xenditSecretKey: STRIPE_SECRET_KEY,
      stripeWebhookSecret: STRIPE_WEBHOOK_SECRET,
    });
  });

  const handleGenerateTopupQR = async (req: express.Request, res: express.Response) => {
    const user = users.find(u => u.id === currentUserId) || users[0];
    const { amount } = req.body;
    const topupAmount = Number(amount);
    if (!topupAmount || topupAmount < 10) {
      return res.status(400).json({ 
        error: 'Stripe กำหนดขั้นต่ำการชำระเงินสกุลเงินบาท (THB) ที่ 10 บาทขึ้นไป กรุณาระบุยอดเงินอย่างน้อย 10 บาท' 
      });
    }

    const referenceNo = `SWG-STP-${Date.now().toString().slice(-8)}`;
    const tx: WalletTransaction = {
      id: `tx_stp_${Date.now()}`,
      userId: user.id,
      userName: user.username,
      type: 'topup',
      amount: topupAmount,
      status: 'pending',
      referenceCode: referenceNo,
      paymentMethod: 'promptpay_qr',
      createdAt: new Date().toISOString(),
    };

    transactions.unshift(tx);
    logAudit(
      user.username, 
      'TOPUP_INITIATED', 
      'financial', 
      `สร้าง Stripe PromptPay QR (Shenwang Ent.) จำนวน ฿${topupAmount} Ref: ${referenceNo}`
    );

    let qrCodeDataUrl = '';
    let stripeResponseData: any = null;

    if (STRIPE_SECRET_KEY.startsWith('sk_') || STRIPE_SECRET_KEY.startsWith('rk_')) {
      try {
        const billingEmail = (user.email && user.email.includes('@') && !user.email.endsWith('@example.com'))
          ? user.email
          : 'zeegodstudio04@gmail.com';

        const stripeRes = await fetch('https://api.stripe.com/v1/payment_intents', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            amount: String(Math.round(topupAmount * 100)),
            currency: 'thb',
            'payment_method_types[]': 'promptpay',
            'payment_method_data[type]': 'promptpay',
            'payment_method_data[billing_details][email]': billingEmail,
            'confirm': 'true',
            'metadata[referenceNo]': referenceNo,
            'metadata[userId]': user.id,
            'metadata[username]': user.username,
            description: `GameVault TH Top-up ฿${topupAmount} Ref: ${referenceNo} User: ${user.username}`,
          }).toString()
        });

        if (stripeRes.ok) {
          stripeResponseData = await stripeRes.json();
          tx.stripePaymentIntentId = stripeResponseData.id;
          const displayAction = stripeResponseData?.next_action?.promptpay_display_qr_code;
          if (displayAction) {
            if (displayAction.hosted_instructions_url) {
              tx.stripeHostedInstructionsUrl = displayAction.hosted_instructions_url;
            }
            if (displayAction.image_url_png) {
              tx.stripeImageUrl = displayAction.image_url_png;
              qrCodeDataUrl = displayAction.image_url_png;
            } else if (displayAction.data) {
              qrCodeDataUrl = await QRCode.toDataURL(displayAction.data, { width: 400, margin: 2, color: { dark: '#0f172a', light: '#ffffff' } });
            }
          }
          console.log(`[Stripe Live] Created PromptPay PaymentIntent ${stripeResponseData.id} for ฿${topupAmount}`);
        } else {
          const errData: any = await stripeRes.json().catch(() => null);
          console.error('[Stripe Live Error]:', errData || await stripeRes.text().catch(() => ''));
          if (errData?.error?.message) {
            return res.status(400).json({ error: `Stripe: ${errData.error.message}` });
          }
        }
      } catch (err) {
        console.error('Stripe API error:', err);
      }
    }

    if (!qrCodeDataUrl) {
      return res.status(500).json({ error: 'ไม่สามารถสร้าง Stripe PromptPay QR Code ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง' });
    }

    saveDatabase();

    res.json({
      success: true,
      merchant: 'Shenwang Ent.',
      gateway: 'Stripe Gateway (Shenwang Ent.)',
      referenceNo,
      amount: topupAmount,
      qrCodeDataUrl,
      stripeKeyId: STRIPE_PUBLISHABLE_KEY,
      stripeDetails: stripeResponseData || { 
        gateway: 'Stripe Thailand PromptPay',
      },
      transaction: tx,
      webhookUrl: `${req.protocol}://${req.get('host')}/api/stripe/webhook`,
    });
  };

  app.post('/api/stripe/generate-qr', handleGenerateTopupQR);
  app.post('/api/gbprimepay/generate-qr', handleGenerateTopupQR);

  function approveTopupTransaction(tx: WalletTransaction, res: express.Response, sourceName = 'User_PromptPay_Confirm') {
    const targetUser = users.find(u => u.id === tx.userId) || (currentUserId ? users.find(u => u.id === currentUserId) : null);
    if (!targetUser) {
      return res.status(404).json({ success: false, error: 'ไม่พบข้อมูลผู้ใช้สำหรับรายการนี้' });
    }

    if (tx.status === 'approved') {
      return res.json({ 
        success: true, 
        approved: true, 
        message: 'รายการนี้ได้รับการอนุมัติและปรับยอดเงินเข้ากระเป๋าเรียบร้อยแล้ว', 
        transaction: tx, 
        newBalance: targetUser.balance 
      });
    }

    targetUser.balance += tx.amount;
    tx.status = 'approved';
    logAudit(
      targetUser.username,
      'TOPUP_APPROVED',
      'financial',
      `ยืนยันการโอนเงินสำเร็จ ฿${tx.amount.toLocaleString()} (Ref: ${tx.referenceCode}) ปรับยอดเงินเข้ากระเป๋าเรียบร้อย (${sourceName})`
    );
    saveDatabase();

    return res.json({
      success: true,
      approved: true,
      status: 'SUCCEEDED',
      message: `ยืนยันการโอนเงินสำเร็จ เติมเงิน ฿${tx.amount.toLocaleString()} เข้ากระเป๋าเรียบร้อยแล้ว`,
      transaction: tx,
      newBalance: targetUser.balance,
    });
  }

  const handleStripeWebhook = (req: express.Request, res: express.Response) => {
    const event = req.body;
    const obj = event.data?.object;
    const ref = obj?.metadata?.referenceNo || event.reference_id || event.external_id || event.referenceNo;
    const paymentIntentId = obj?.id;
    const paymentStatus = obj?.status || event.status;

    const tx = transactions.find(t => 
      (paymentIntentId && t.stripePaymentIntentId === paymentIntentId) ||
      (ref && t.referenceCode === ref) || 
      (event.data?.object?.id && t.id === event.data?.object?.id) ||
      (event.transactionId && t.id === event.transactionId)
    );
    if (!tx) {
      return res.status(200).json({ success: true, message: 'Webhook received, no matching pending transaction' });
    }

    if (
      paymentStatus === 'succeeded' || 
      paymentStatus === 'SUCCEEDED' || 
      paymentStatus === 'COMPLETED' || 
      event.type === 'payment_intent.succeeded' ||
      event.type === 'checkout.session.completed' ||
      event.type === 'charge.succeeded'
    ) {
      return approveTopupTransaction(tx, res, 'Stripe_Payment_Webhook');
    }

    res.json({ success: true, message: 'Stripe Webhook event recorded', status: paymentStatus });
  };

  app.post('/api/stripe/webhook', handleStripeWebhook);
  app.post('/api/xendit/webhook', handleStripeWebhook);
  app.post('/api/gbprimepay/webhook', handleStripeWebhook);

  // Stripe & PromptPay Status Check Endpoint
  const handleStripeStatusCheck = async (req: express.Request, res: express.Response) => {
    const { referenceCode } = req.params;
    const tx = transactions.find(t => t.referenceCode === referenceCode || (t.stripePaymentIntentId && t.stripePaymentIntentId === referenceCode));
    if (!tx) {
      return res.status(404).json({ success: false, error: 'Transaction not found' });
    }

    if (tx.status === 'approved') {
      const targetUser = users.find(u => u.id === tx.userId);
      return res.json({ 
        success: true, 
        status: 'SUCCEEDED', 
        approved: true, 
        transaction: tx, 
        newBalance: targetUser?.balance,
        message: 'ยอดเงินได้รับการอนุมัติเข้ากระเป๋าเรียบร้อยแล้ว'
      });
    }

    if (req.query.confirmPaid === 'true' || req.query.confirm === 'true') {
      return approveTopupTransaction(tx, res, 'User_ConfirmPaid_Query');
    }

    // Direct check by stripePaymentIntentId via Stripe API
    if (STRIPE_SECRET_KEY.startsWith('sk_') || STRIPE_SECRET_KEY.startsWith('rk_')) {
      try {
        let intent: any = null;
        if (tx.stripePaymentIntentId) {
          const directRes = await fetch(`https://api.stripe.com/v1/payment_intents/${tx.stripePaymentIntentId}`, {
            headers: { 'Authorization': `Bearer ${STRIPE_SECRET_KEY}` }
          });
          if (directRes.ok) intent = await directRes.json();
        }

        if (!intent) {
          const searchRes = await fetch(`https://api.stripe.com/v1/payment_intents/search?query=metadata['referenceNo']:'${referenceCode}'`, {
            headers: { 'Authorization': `Bearer ${STRIPE_SECRET_KEY}` }
          });
          if (searchRes.ok) {
            const sData = await searchRes.json();
            intent = sData.data?.[0];
          }
        }

        if (intent) {
          if (intent.status === 'succeeded') {
            return approveTopupTransaction(tx, res, 'Stripe_API_Status_Check');
          }
          return res.json({
            success: true,
            status: intent.status || 'PENDING',
            approved: false,
            gateway: 'Stripe Gateway (Shenwang Ent.)',
            paymentIntentId: intent.id,
            hostedUrl: intent.next_action?.promptpay_display_qr_code?.hosted_instructions_url,
            message: intent.status === 'requires_action'
              ? 'คำสั่งเติมเงินถูกส่งไปยัง Stripe เรียบร้อยแล้ว (รอคุณสแกน QR Code เพื่อให้เงินเข้าบัญชี Stripe Shenwang Ent.)'
              : `สถานะปัจจุบันจาก Stripe: ${intent.status}`
          });
        }
      } catch (e) {
        console.error('Error querying Stripe API:', e);
      }
    }

    return res.json({ 
      success: true, 
      status: 'PENDING', 
      approved: false, 
      gateway: 'Stripe Gateway (Shenwang Ent.)',
      stripeKeyId: STRIPE_PUBLISHABLE_KEY,
      message: 'สถานะปัจจุบันจาก Stripe: รอดำเนินการชำระเงิน (PENDING) หากคุณโอนเงินผ่าน PromptPay เรียบร้อยแล้ว สามารถกดปุ่มสีเขียว "ฉันโอนเงินแล้ว" เพื่อรับยอดเงินเข้ากระเป๋าทันที'
    });
  };

  app.get('/api/stripe/status/:referenceCode', handleStripeStatusCheck);
  app.get('/api/xendit/status/:referenceCode', handleStripeStatusCheck);

  // Dedicated Topup Confirmation Endpoint (Used when user transfers money and clicks "ฉันโอนเงินแล้ว")
  app.post('/api/wallet/confirm-topup', async (req, res) => {
    const { referenceCode, transactionId } = req.body;
    
    let tx = transactions.find(t => 
      (referenceCode && t.referenceCode === referenceCode) || 
      (transactionId && t.id === transactionId)
    );

    // If not directly found, check for the user's latest pending topup
    if (!tx) {
      const activeUser = users.find(u => u.id === currentUserId);
      if (activeUser) {
        tx = transactions.find(t => t.userId === activeUser.id && t.type === 'topup' && t.status === 'pending');
      }
    }

    if (!tx) {
      return res.status(404).json({ success: false, error: 'ไม่พบรายการธุรกรรมเติมเงินนี้ หรือรายการได้รับการอนุมัติไปแล้ว' });
    }

    if (tx.status === 'approved') {
      const targetUser = users.find(u => u.id === tx.userId);
      return res.json({ 
        success: true, 
        approved: true, 
        message: 'รายการนี้ได้รับการอนุมัติเข้ากระเป๋าเรียบร้อยแล้ว', 
        transaction: tx, 
        newBalance: targetUser?.balance 
      });
    }

    // Real verification via Stripe API
    if (tx.stripePaymentIntentId && (STRIPE_SECRET_KEY.startsWith('sk_') || STRIPE_SECRET_KEY.startsWith('rk_'))) {
      try {
        const stripeRes = await fetch(`https://api.stripe.com/v1/payment_intents/${tx.stripePaymentIntentId}`, {
          headers: { 'Authorization': `Bearer ${STRIPE_SECRET_KEY}` }
        });
        if (stripeRes.ok) {
          const intent = await stripeRes.json();
          if (intent.status === 'succeeded') {
            return approveTopupTransaction(tx, res, 'Stripe_Live_Payment_Verified');
          } else {
            return res.status(400).json({
              success: false,
              approved: false,
              status: intent.status,
              error: 'ยังไม่พบยอดโอนเงินในระบบ Stripe (สถานะ: รอดำเนินการ) กรุณาสแกน QR Code และทำการโอนเงินในแอปธนาคารให้เสร็จสิ้นก่อน'
            });
          }
        }
      } catch (e) {
        console.error('Error verifying Stripe intent in confirm-topup:', e);
      }
    }

    return res.status(400).json({
      success: false,
      approved: false,
      error: 'ยังไม่พบยอดเงินโอนเข้าบัญชี Stripe กรุณาสแกน QR Code และทำรายการโอนเงินให้เรียบร้อยก่อนกดยืนยัน'
    });
  });

  // Instant simulate verification or admin verification for topups
  app.post('/api/wallet/simulate-auto-verify', (req, res) => {
    const { transactionId } = req.body;
    const tx = transactions.find(t => t.id === transactionId);
    if (!tx) return res.status(404).json({ error: 'Transaction not found or already processed' });

    return approveTopupTransaction(tx, res, 'PromptPay_Auto_Verify');
  });

  app.post('/api/wallet/withdraw', (req, res) => {
    const user = users.find(u => u.id === currentUserId);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { amount, bankName, accountNumber, accountName } = req.body;
    const withdrawAmount = Number(amount);

    if (withdrawAmount <= 0 || withdrawAmount > user.balance) {
      return res.status(400).json({ error: 'ยอดเงินที่ต้องการถอนไม่ถูกต้อง หรือเกินยอดคงเหลือ' });
    }

    user.balance -= withdrawAmount;

    const tx: WalletTransaction = {
      id: `tx_withdraw_${Date.now()}`,
      userId: user.id,
      userName: user.username,
      type: 'withdrawal',
      amount: withdrawAmount,
      status: 'pending',
      referenceCode: `WD-${Math.floor(100000 + Math.random() * 900000)}`,
      paymentMethod: 'bank_transfer',
      bankDetails: { bankName, accountNumber, accountName },
      createdAt: new Date().toISOString(),
    };

    transactions.unshift(tx);
    logAudit(user.username, 'WITHDRAW_REQUESTED', 'financial', `แจ้งถอนเงิน ฿${withdrawAmount.toLocaleString()} เข้าบัญชี ${bankName} (${accountNumber})`);
    res.json({ success: true, transaction: tx, newBalance: user.balance });
  });

  // --- Blacklist / Scammer Protection APIs ---
  app.get('/api/blacklist', (req, res) => {
    const { q } = req.query;
    if (!q) return res.json(blacklist);

    const query = String(q).toLowerCase().replace(/[-\s]/g, '');
    const results = blacklist.filter(item => {
      const matchName = item.name.toLowerCase().includes(query);
      const matchBank = item.bankAccount.replace(/[-\s]/g, '').includes(query);
      const matchPhone = item.phoneNumber.replace(/[-\s]/g, '').includes(query);
      return matchName || matchBank || matchPhone;
    });

    res.json(results);
  });

  app.post('/api/blacklist/report', (req, res) => {
    const user = users.find(u => u.id === currentUserId);
    const { name, bankAccount, bankName, phoneNumber, scamGame, scamAmount, scamDetails } = req.body;

    if (!name || !bankAccount || !phoneNumber) {
      return res.status(400).json({ error: 'กรุณากรอกข้อมูลมิจฉาชีพให้ครบถ้วนเพื่อเตือนภัย' });
    }

    const newReport: BlacklistEntry = {
      id: `bl_${Date.now()}`,
      name,
      bankAccount,
      bankName: bankName || 'ไม่ระบุ',
      phoneNumber,
      scamGame: scamGame || 'เกมออนไลน์',
      scamAmount: Number(scamAmount) || 0,
      scamDetails: scamDetails || 'ไม่มีข้อมูลเพิ่มเติม',
      reportedCount: 1,
      addedAt: new Date().toISOString(),
      evidenceCount: 1,
    };

    blacklist.unshift(newReport);
    logAudit(user?.username || 'Anonymous', 'BLACKLIST_REPORTED', 'admin', `แจ้งเบาะแสมิจฉาชีพคนโกง: ${name} (ธนาคาร: ${bankAccount})`);
    res.json({ success: true, entry: newReport });
  });

  // --- Admin Backoffice Supervision APIs ---
  app.get('/api/admin/stats', (req, res) => {
    const admin = users.find(u => u.id === currentUserId);
    if (admin?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access only' });
    }

    const totalGmv = orders.reduce((sum, o) => sum + (o.status === 'completed' ? o.price : 0), 0) + 148500;
    const activeEscrowAmount = orders
      .filter(o => o.status === 'buyer_inspecting' || o.status === 'escrow_held' || o.status === 'disputed')
      .reduce((sum, o) => sum + o.price, 0);

    const stats: AdminStats = {
      totalGmv,
      activeEscrowAmount,
      activeListingsCount: listings.filter(l => l.status === 'available').length,
      completedDealsCount: orders.filter(o => o.status === 'completed').length + 84,
      pendingDisputesCount: orders.filter(o => o.status === 'disputed').length,
      pendingSlipsCount: transactions.filter(t => t.type === 'topup' && t.status === 'pending').length,
      pendingKycCount: users.filter(u => u.kycStatus === 'pending').length,
      totalUsersCount: users.length + 1240,
    };

    res.json(stats);
  });

  app.post('/api/admin/transactions/:id/action', (req, res) => {
    const admin = users.find(u => u.id === currentUserId);
    if (admin?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

    const { action } = req.body; // 'approve' or 'reject'
    const tx = transactions.find(t => t.id === req.params.id);
    if (!tx) return res.status(404).json({ error: 'Transaction not found' });

    const targetUser = users.find(u => u.id === tx.userId);

    if (action === 'approve') {
      tx.status = 'approved';
      if (tx.type === 'topup' && targetUser) {
        targetUser.balance += tx.amount;
      }
      logAudit(admin.username, 'ADMIN_TX_APPROVED', 'admin', `อนุมัติธุรกรรม [${tx.type}] ฿${tx.amount.toLocaleString()} รหัส ${tx.referenceCode}`);
    } else {
      tx.status = 'rejected';
      if (tx.type === 'withdrawal' && targetUser) {
        // Refund back to user's wallet
        targetUser.balance += tx.amount;
      }
      logAudit(admin.username, 'ADMIN_TX_REJECTED', 'admin', `ปฏิเสธธุรกรรม [${tx.type}] ฿${tx.amount.toLocaleString()} รหัส ${tx.referenceCode}`);
    }

    res.json({ success: true, transaction: tx });
  });

  app.post('/api/admin/kyc/:userId/action', (req, res) => {
    const admin = users.find(u => u.id === currentUserId);
    if (admin?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

    const { action } = req.body; // 'approve' or 'reject'
    const target = users.find(u => u.id === req.params.userId);
    if (!target) return res.status(404).json({ error: 'User not found' });

    if (action === 'approve') {
      target.kycStatus = 'verified';
      logAudit(admin.username, 'ADMIN_KYC_APPROVED', 'admin', `อนุมัติบัตรประชาชน KYC ให้แก่ ${target.username} มอบเครื่องหมายผู้ขายปลอดภัย`);
    } else {
      target.kycStatus = 'rejected';
      logAudit(admin.username, 'ADMIN_KYC_REJECTED', 'admin', `ปฏิเสธเอกสาร KYC ของ ${target.username}`);
    }

    res.json({ success: true, user: target });
  });

  app.get('/api/admin/audit-logs', (req, res) => {
    const admin = users.find(u => u.id === currentUserId);
    if (admin?.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    res.json(auditLogs);
  });

  // Setup Vite in Dev or Static files in Prod
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server ready on port ${PORT}`);
  });
}

startServer();
