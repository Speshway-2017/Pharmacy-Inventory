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

export interface Medicine {
  _id?: string;
  id: string;
  name: string;
  genericName: string;
  category: string;
  manufacturer: string;
  batchNumber: string;
  expiryDate: string; // YYYY-MM-DD
  mrp: number;
  sellingPrice: number;
  quantity: number;
  reorderLevel: number;
  barcode: string;
  status: MedicineStatus;
  createdAt?: string;
  updatedAt?: string;
}

export type PaymentMethod = 'CASH' | 'UPI' | 'CARD';

export interface CartItem {
  medicineId: string;
  name: string;
  genericName: string;
  batchNumber: string;
  expiryDate: string;
  mrp: number;
  sellingPrice: number;
  quantity: number;
  availableQuantity: number;
  barcode: string;
}

export interface BillItem {
  medicineId: string;
  name: string;
  genericName: string;
  batchNumber: string;
  expiryDate: string;
  unitPrice: number;
  quantity: number;
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

export interface NotificationItem {
  id: string;
  type: 'LOW_STOCK' | 'EXPIRY' | 'EXPIRED' | 'SYNC';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}
