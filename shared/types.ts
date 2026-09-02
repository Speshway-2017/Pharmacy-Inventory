export type UserRole = 'ADMIN';

export interface User {
  _id?: string;
  id: string;
  name: string;
  email: string;
  role: UserRole;
  token?: string;
  createdAt?: string;
}

export type MedicineStatus = 'IN_STOCK' | 'LOW_STOCK' | 'EXPIRING' | 'EXPIRED' | 'INACTIVE';

export type SellingMode = 'FULL_PACKAGE_AND_LOOSE' | 'FULL_PACKAGE_ONLY';

export interface Medicine {
  _id?: string;
  id: string;
  code?: string; // Permanent unique medicine code, e.g. MED-000124
  name: string;
  genericName: string;
  category: string;
  manufacturer: string;
  strength?: string; // e.g. 500 mg, 100 ml
  dosageForm?: string; // e.g. Tablet, Capsule, Syrup, Injection, Syringe, Bottle, Vial
  packageType?: string; // e.g. Strip, Bottle, Box, Pack
  unitsPerPackage?: number; // e.g. 10 (tablets per strip)
  sellingMode?: SellingMode; // FULL_PACKAGE_AND_LOOSE | FULL_PACKAGE_ONLY
  looseUnitName?: string; // e.g. Tablet, Capsule, ml
  batchNumber: string;
  expiryDate: string; // YYYY-MM-DD
  mrp: number;
  sellingPrice: number; // Price per full package or single unit if unitsPerPackage = 1
  quantity: number; // Total stock stored in base/loose units
  reorderLevel: number;
  barcode: string;
  rack?: string;
  row?: string;
  column?: string;
  shelfBin?: string;
  status: MedicineStatus;
  createdAt?: string;
  updatedAt?: string;
}

export type PaymentMethod = 'CASH' | 'UPI' | 'CARD';

export interface CartItem {
  medicineId: string;
  code?: string;
  name: string;
  genericName: string;
  batchNumber: string;
  expiryDate: string;
  mrp: number;
  sellingPrice: number;
  packageQuantity: number; // Full packages count (e.g. 2 strips)
  looseQuantity: number; // Loose units count (e.g. 3 tablets)
  quantity: number; // Total item display quantity
  unitType?: 'PACKAGE' | 'LOOSE' | 'BOTH';
  unitsPerPackage: number;
  looseUnitName: string;
  packageType: string;
  sellingMode?: SellingMode;
  availableQuantity: number; // Total available base units
  barcode: string;
}

export interface BillItem {
  medicineId: string;
  code?: string;
  name: string;
  genericName: string;
  batchNumber: string;
  expiryDate: string;
  unitPrice: number;
  packageQuantity?: number;
  looseQuantity?: number;
  quantity: number;
  unitType?: 'PACKAGE' | 'LOOSE' | 'BOTH';
  unitsPerPackage?: number;
  looseUnitName?: string;
  packageType?: string;
  baseUnitsDeducted?: number;
  totalPrice: number;
}

export type SyncStatus = 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';

export interface Bill {
  _id?: string;
  id: string;
  invoiceNumber: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm:ss
  items: BillItem[];
  subtotal: number;
  discountAmount: number;
  discountPercentage: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  createdByName: string;
  createdByEmail: string;
  isOfflineCreated: boolean;
  syncStatus: SyncStatus;
  createdAt?: string;
}

export interface HeldBill {
  id: string;
  customerName?: string;
  note?: string;
  cart: CartItem[];
  discountPercentage: number;
  paymentMethod: PaymentMethod;
  subtotal: number;
  heldAt: string;
}

export type SyncOperationType =
  | 'DEDUCT_STOCK'
  | 'ADD_STOCK'
  | 'CREATE_MEDICINE'
  | 'UPDATE_MEDICINE'
  | 'CREATE_BILL'
  | 'UPDATE_SETTINGS';

export interface SyncTransaction {
  _id?: string;
  id: string;
  transactionId: string; // e.g. OFFLINE-SALE-UUID
  operation: SyncOperationType;
  payload: any;
  status: SyncStatus;
  errorMessage?: string;
  createdAt: string;
  syncedAt?: string;
}

export interface PharmacySettings {
  pharmacyName: string;
  address: string;
  phone: string;
  email: string;
  gstin: string;
  invoicePrefix: string;
  invoiceFooter: string;
  printerType: 'THERMAL_80MM' | 'A4_STANDARD' | 'DEFAULT';
  printerName: string;
  autoPrintInvoice: boolean;
  lowStockThresholdDefault: number;
  expiryWarningDays: number; // e.g. 90
}

export interface DashboardSummary {
  todaysSales: number;
  todaysBillCount: number;
  salesGrowthPercentage: number;
  totalMedicines: number;
  currentStockCount: number;
  lowStockCount: number;
  expiringCount: number;
  expiredCount: number;
  recentBills: Bill[];
  isOnline: boolean;
  pendingSyncCount: number;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  createdAt?: string;
}

export interface NotificationItem {
  id: string;
  type: 'LOW_STOCK' | 'EXPIRY' | 'EXPIRED' | 'SYNC';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export type StockMovementType = 'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT' | 'EXPIRY';

export interface StockMovement {
  _id?: string;
  id: string;
  medicineId: string;
  medicineName: string;
  code?: string;
  type: StockMovementType;
  baseQuantityChange: number; // e.g. +100 or -10
  batchNumber: string;
  expiryDate: string;
  reason?: string;
  performedByName?: string;
  createdAt: string;
}
