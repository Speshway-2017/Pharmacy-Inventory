import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(__dirname, '../../../local-data');

function ensureDirExists() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJsonFile<T>(filename: string, fallback: T): T {
  ensureDirExists();
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(fallback, null, 2), 'utf-8');
    return fallback;
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch (err) {
    console.error(`Error reading ${filename}:`, err);
    return fallback;
  }
}

function writeJsonFile<T>(filename: string, data: T): boolean {
  ensureDirExists();
  const filePath = path.join(DATA_DIR, filename);
  const tempPath = `${filePath}.tmp`;
  try {
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempPath, filePath);
    return true;
  } catch (err) {
    console.error(`Error writing ${filename}:`, err);
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
      return true;
    } catch (innerErr) {
      console.error(`Fatal error writing ${filename}:`, innerErr);
      return false;
    }
  }
}

export const LocalStore = {
  getMedicines: (): any[] => {
    const medicines = readJsonFile<any[]>('medicines.json', []);
    // Apply safe defaults for legacy medicine records
    return medicines.map(m => ({
      ...m,
      code: m.code || `MED-${(m.id || '000000').slice(-6).toUpperCase()}`,
      strength: m.strength || '',
      dosageForm: m.dosageForm || 'Tablet',
      packageType: m.packageType || 'Strip',
      unitsPerPackage: m.unitsPerPackage && m.unitsPerPackage >= 1 ? m.unitsPerPackage : 1,
      sellingMode: m.sellingMode || 'FULL_PACKAGE_ONLY',
      looseUnitName: m.looseUnitName || 'Tablet',
      rack: m.rack || '',
      row: m.row || '',
      column: m.column || '',
      shelfBin: m.shelfBin || ''
    }));
  },
  saveMedicines: (medicines: any[]) => writeJsonFile('medicines.json', medicines),

  getBills: (): any[] => readJsonFile<any[]>('bills.json', []),
  saveBills: (bills: any[]) => writeJsonFile('bills.json', bills),

  getUsers: (): any[] => readJsonFile<any[]>('users.json', []),
  saveUsers: (users: any[]) => writeJsonFile('users.json', users),

  getSettings: (): any => readJsonFile<any>('settings.json', {
    pharmacyName: "Pharmacy Store",
    address: "",
    phone: "",
    email: "",
    gstin: "",
    invoicePrefix: "INV",
    invoiceFooter: "Thank you for your business!",
    printerType: "THERMAL_80MM",
    printerName: "Default Printer",
    autoPrintInvoice: true,
    lowStockThresholdDefault: 10,
    expiryWarningDays: 90
  }),
  saveSettings: (settings: any) => writeJsonFile('settings.json', settings),

  getSyncQueue: (): any[] => readJsonFile<any[]>('sync-queue.json', []),
  saveSyncQueue: (queue: any[]) => writeJsonFile('sync-queue.json', queue),

  getCategories: (): any[] => readJsonFile<any[]>('categories.json', [
    { id: 'cat-1', name: 'Tablet / Capsule' },
    { id: 'cat-2', name: 'Syrup / Liquid' },
    { id: 'cat-3', name: 'Injection' },
    { id: 'cat-4', name: 'Ointment / Cream' },
    { id: 'cat-5', name: 'Antibiotic' },
    { id: 'cat-6', name: 'Analgesic' },
    { id: 'cat-7', name: 'Supplements' },
    { id: 'cat-8', name: 'General' }
  ]),
  saveCategories: (categories: any[]) => writeJsonFile('categories.json', categories),

  getStockMovements: (): any[] => readJsonFile<any[]>('stock-movements.json', []),
  saveStockMovements: (movements: any[]) => writeJsonFile('stock-movements.json', movements),

  addSyncTransaction: (transaction: any) => {
    const queue = readJsonFile<any[]>('sync-queue.json', []);
    if (!queue.some(t => t.transactionId === transaction.transactionId)) {
      queue.push(transaction);
      writeJsonFile('sync-queue.json', queue);
    }
  }
};
