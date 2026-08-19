# Pharmacy Inventory & Billing Desktop Application

A modern, production-ready Windows Desktop Application built from scratch for pharmacy medicine inventory management, fast POS billing, real-time stock deduction, batch/expiry tracking, printable invoices, and offline-first cloud synchronization.

---

## 🚀 Key Features

1. **Fast POS Billing Counter**:
   - Two-column fast layout optimized for desktop pharmacy counters
   - Instant medicine lookup & barcode scanner integration
   - Cart management, discount calculations (fixed/%), subtotal & net totals
   - Support for Cash, UPI, and Card payment methods
   - Direct Windows thermal printer (80mm) & standard A4 print/reprint integration

2. **Strict Inventory & Stock Control**:
   - Real-time stock tracking with status badges (`IN_STOCK`, `LOW_STOCK`, `EXPIRING`, `EXPIRED`, `INACTIVE`)
   - **Negative Stock Prevention Rule**: Rejects transactions if requested quantity exceeds available stock
   - **Expired Medicine Block Rule**: Strictly blocks expired medicine batches from being sold at POS

3. **Batch & Expiry Date Management**:
   - Automatic categorization of expiring stock (Within 30, 60, 90 days)
   - Visual alerts for expired and expiring medicines

4. **Offline-First & Local Persistent Storage**:
   - Operates completely offline without internet using local JSON persistence in `local-data/`
   - High data integrity across application restarts and power outages

5. **Automatic Cloud Synchronization**:
   - Auto-detects network connection status (`Online` vs `Offline`)
   - Pushes pending offline transactions to MongoDB Cloud Database safely
   - **Idempotency & Duplicate Prevention**: Uses UUID transaction IDs (`OFFLINE-SALE-UUID`) to prevent duplicate bill creation or double stock deduction on server

6. **Firebase Notifications**:
   - Low stock alerts, medicine expiration warnings, and sync failure notifications
   - Graceful fallback when Firebase credentials are not provided

---

## 🛠️ Technology Stack

- **Frontend UI**: React 18, TypeScript, Vite, Lucide Icons, Custom Teal CSS Design System (#0F766E)
- **Desktop Shell**: Electron.js 29 with Context Isolation & ContextBridge IPC
- **Backend API**: Node.js, Express.js REST API
- **Cloud Database**: MongoDB / MongoDB Atlas (Mongoose ODM)
- **Local Persistence**: Controlled Local JSON Storage engine
- **Messaging**: Firebase Cloud Messaging (FCM Admin SDK)

---

## 📁 Monorepo Structure

```
phramacy-inventory/
├── client/                     # React 18 + Vite + TypeScript Frontend UI
│   ├── src/
│   │   ├── components/         # Sidebar, TopHeader, PrintInvoiceModal, MedicineFormModal, StockAdjustModal
│   │   ├── context/            # AuthContext, SyncContext
│   │   ├── pages/              # Login, Dashboard, Inventory, BillingPOS, BillHistory, Reports, Expiry, Settings
│   │   ├── services/           # API Service & Offline Local Storage Engine
│   │   └── index.css           # Modern Teal Design System & Typography
├── server/                     # Node.js + Express REST API Server
│   ├── src/
│   │   ├── config/             # DB & Firebase Initialization
│   │   ├── controllers/        # Auth, Medicine, Billing, Report, Sync, Settings Controllers
│   │   ├── models/             # Mongoose Schemas (User, Medicine, Bill, SyncLog)
│   │   ├── middleware/         # JWT Auth & Role Guard
│   │   └── server.ts           # Express App Entry
├── electron/                   # Electron Main & Preload IPC Process
│   ├── main.js                 # Window creation, Native Printing, Internet ping
│   └── preload.js              # Secure ContextBridge APIs
├── shared/                     # Shared TypeScript Data Interfaces
│   └── types.ts
├── local-data/                 # Local Persistent Storage Directory
│   ├── medicines.json
│   ├── bills.json
│   ├── settings.json
│   └── users.json
├── .env.example                # Environment variables template
├── package.json                # Monorepo scripts
└── README.md
```

---

## 💻 Installation & Setup

### Prerequisites

- Node.js (v18 or later)
- npm (v9 or later)

### 1. Install Dependencies

In the root directory, install monorepo dependencies:

```bash
npm install
```

This will automatically trigger `postinstall` to install dependencies in `client`, `server`, `electron`, and `shared`.

### 2. Environment Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Set your configuration values in `.env`:

```env
PORT=5000
MONGODB_URI=mongodb+srv://admin:password@cluster.mongodb.net/pharmacy_db?retryWrites=true&w=majority
JWT_SECRET=super_secret_pharmacy_jwt_key_2026_change_in_production
```

*Note: If `MONGODB_URI` is left unconfigured, the application operates seamlessly in Local Storage Mode.*

---

## 🏃 Running the Application

### Concurrent Monorepo Development (Server + Client + Electron)

Start all services simultaneously with one command:

```bash
npm run dev
```

### Individual Service Development

- **Server Backend**: `npm run dev:server` (http://localhost:5000/api)
- **React Frontend**: `npm run dev:client` (http://localhost:5173)
- **Electron Desktop**: `npm run dev:electron`

---

## 🔐 Default Login Credentials

- **Admin Account**:
  - Email: `admin@pharmacy.com`
  - Password: `admin123`
- **Staff / Pharmacist Account**:
  - Email: `staff@pharmacy.com`
  - Password: `staff123`

---

## 📦 Building & Windows Packaging

To build all TypeScript components and package the application into a Windows installer (`.exe`):

```bash
# 1. Build TypeScript and Vite client bundles
npm run build

# 2. Generate Windows EXE distribution package
npm run dist
```

Packaging output will be created inside `release/`.

---

## 🧪 Functional Verification & Offline Testing

1. **POS Billing**: Add items to cart, modify quantity, apply discount, select payment method, and complete bill. Invoice modal opens automatically for printing.
2. **Negative Stock Check**: Attempt to sell more quantity than available in inventory → Verification error blocks completion.
3. **Expired Medicine Check**: Attempt to select an expired batch → Warning notice blocks sale.
4. **Offline Mode Test**: Disconnect internet or turn off server → App displays `🟠 Offline — Data saved locally`. Complete sales and close/restart app → Local JSON data persists.
5. **Auto Synchronization**: Reconnect internet or click `Sync Now` → Pending offline queue is pushed to server without creating duplicate records.
