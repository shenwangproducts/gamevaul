# GameVault TH - ระบบตลาดซื้อขายไอดีเกมปลอดภัย (Escrow P2P Marketplace)

แพลตฟอร์มตลาดกลางซื้อขายไอดีเกมออนไลน์และไอเทมดิจิทัลที่ปลอดภัยสูงสุด ด้วยระบบ **Escrow (ตู้เซฟคนกลางกักเงินอัตโนมัติ)**, ระบบชำระเงิน **PromptPay ผ่าน Stripe Live Gateway**, ระบบตรวจสอบบัญชีดำ (Blacklist), และการยืนยันตัวตนผู้ขาย (KYC)

---

## 🌟 ฟีเจอร์หลัก (Key Features)

- **ระบบตู้เซฟคนกลาง (Escrow System 100%):** เงินของผู้ซื้อจะถูกล็อกไว้ในระบบตู้เซฟคนกลาง ผู้ซื้อมีเวลา 24 ชั่วโมงในการตรวจสอบไอดีเกมและเปลี่ยนรหัสผ่าน หากไอดีถูกต้องจึงกดอนุมัติปล่อยเงินให้ผู้ขาย
- **ระบบเติมเงิน Stripe PromptPay Gateway:** สร้าง QR Code พร้อมเพย์แบบเรียลไทม์ผ่าน Stripe API รองรับการชำระเงินอัตโนมัติและตรวจสอบยอดเงินจริงก่อนปรับเครดิต
- **ระบบยืนยันตัวตนผู้ขาย (Seller KYC):** ผู้ขายต้องผ่านการยืนยันตัวตนด้วยบัตรประชาชนและสมุดบัญชีธนาคารเพื่อรับตราสัญลักษณ์ความน่าเชื่อถือ
- **ระบบตรวจจับมิจฉาชีพ (Anti-Fraud & Blacklist):** ตรวจสอบชื่อ-นามสกุล, เลขบัญชี, และเบอร์โทรศัพท์เทียบกับฐานข้อมูลคนโกงก่อนโอนเงินหรือถอนเงิน
- **ระบบหลังบ้านผู้ดูแล (Admin Backoffice):** มอนิเตอร์คำสั่งซื้อ, ตรวจสอบ Audit Log ทางการเงิน, จัดการรายชื่อบัญชีดำ, และอนุมัติการถอนเงิน

---

## 🛠 เทคโนโลยีที่ใช้ (Tech Stack)

- **Frontend:** React 19, TypeScript, Tailwind CSS, Lucide Icons, Framer Motion
- **Backend / API:** Node.js, Express, tsx
- **Payment Gateway:** Stripe Thailand (PromptPay PaymentIntent API)
- **Tooling & Build:** Vite

---

## ⚠️ คำแนะนำสำคัญก่อนนำขึ้น GitHub (Security & Hosting Notice)

### 1. ความปลอดภัยของ API Keys (ห้าม Push คีย์ลับขึ้น GitHub เด็ดขาด)
- **อย่าลบคีย์ลับออกจาก `.gitignore`:** โปรเจกต์นี้ตั้งค่าให้ละเว้นไฟล์ `.env` และ `database.json` ไว้แล้ว
- กำหนดคีย์ Stripe ในไฟล์ `.env` ของคุณเท่านั้น โดยคัดลอกตัวอย่างจาก `.env.example`
- หากเผลออัปโหลด `sk_live_...` หรือ `whsec_...` ขึ้น GitHub สาธารณะ ระบบ GitHub Secret Scanning จะแจ้งเตือน และ Stripe จะเพิกถอนคีย์ทันทีเพื่อความปลอดภัย

### 2. การโฮสต์และเผยแพร่ (GitHub Pages vs Full-Stack Server)
- **GitHub Pages รองรับเฉพาะ Static Web (HTML/JS) เท่านั้น ไม่รองรับ Node.js Backend**
- เนื่องจากโปรเจกต์นี้มี Backend (`server.ts`) ในการเชื่อมต่อ Stripe และระบบ Escrow:
  - **แนะนำสำหรับการโฮสต์เว็บจริง (ฟรีหรือค่าใช้จ่ายต่ำ):**
    - [Render.com](https://render.com) (Web Service - Node.js)
    - [Railway.app](https://railway.app)
    - [Fly.io](https://fly.io)
    - [VPS / Docker / Google Cloud Run]
  - หรือหากต้องการรันเพื่อแสดงผลเฉพาะหน้าบ้าน สามารถจำลอง API ด้วย Mock Service Worker ได้

---

## 🚀 เริ่มต้นใช้งานในเครื่อง (Local Development)

### 1. Clone Repository
```bash
git clone https://github.com/<your-username>/gamevault-th.git
cd gamevault-th
```

### 2. ติดตั้ง Dependencies
```bash
npm install
```

### 3. ตั้งค่า Environment Variables
คัดลอกไฟล์ `.env.example` เป็น `.env`:
```bash
cp .env.example .env
```
เปิดไฟล์ `.env` และกรอกค่าของคุณ:
```env
PORT=3000
NODE_ENV=development
APP_URL=http://localhost:3000

# คีย์ Stripe ของคุณ (สามารถดูได้จาก https://dashboard.stripe.com/apikeys)
STRIPE_PUBLISHABLE_KEY=pk_test_... หรือ pk_live_...
STRIPE_SECRET_KEY=sk_test_... หรือ sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# เบอร์พร้อมเพย์สำรอง
PROMPTPAY_NUMBER=0982349812
```

### 4. รันแอปพลิเคชัน (Development Mode)
```bash
npm run dev
```
เปิดเบราว์เซอร์ไปที่ `http://localhost:3000`

---

## 📦 การ Build สำหรับ Production

```bash
# คอมไพล์โค้ด Frontend
npm run build

# รันเซิร์ฟเวอร์แบบ Production
npm start
```

---

## 📜 คำสั่ง Scripts ใน package.json

| คำสั่ง | รายละเอียด |
| :--- | :--- |
| `npm run dev` | รันเซิร์ฟเวอร์ Express พร้อม Vite Dev Server Middleware |
| `npm run build` | บิลด์ Frontend เป็น Production Asset ในโฟลเดอร์ `dist` |
| `npm start` | รันเซิร์ฟเวอร์ Production ให้บริการทั้ง API และ Static files จาก `dist` |
| `npm run lint` | ตรวจสอบข้อผิดพลาด TypeScript (`tsc --noEmit`) |

---

## 📄 ใบอนุญาต (License)

โปรเจกต์นี้เผยแพร่ภายใต้ใบอนุญาต [MIT License](LICENSE)
