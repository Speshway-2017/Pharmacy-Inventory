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
  getMedicines: (): any[] => readJsonFile<any[]>('medicines.json', []),
  saveMedicines: (medicines: any[]) => writeJsonFile('medicines.json', medicines),

  getBills: (): any[] => readJsonFile<any[]>('bills.json', []),
  saveBills: (bills: any[]) => writeJsonFile('bills.json', bills),

  getUsers: (): any[] => readJsonFile<any[]>('users.json', []),
  saveUsers: (users: any[]) => writeJsonFile('users.json', users),

  getSettings: (): any => readJsonFile<any>('settings.json', {
    pharmacyName: "MedPlus Health Pharmacy",
    address: "123 Healthcare Boulevard, Station Road, Tech City",
    phone: "+91 98765 43210",
    email: "contact@medplushealth.com",
    gstin: "36AAACM1234F1Z5",
    invoicePrefix: "INV",
    invoiceFooter: "Thank you for choosing MedPlus Health. Wishing you good health!",
    printerType: "THERMAL_80MM",
    printerName: "Default Printer",
    autoPrintInvoice: true,
    lowStockThresholdDefault: 10,
    expiryWarningDays: 90
  }),
  saveSettings: (settings: any) => writeJsonFile('settings.json', settings),

  getSyncQueue: (): any[] => readJsonFile<any[]>('sync-queue.json', []),
  saveSyncQueue: (queue: any[]) => writeJsonFile('sync-queue.json', queue),

  addSyncTransaction: (transaction: any) => {
    const queue = readJsonFile<any[]>('sync-queue.json', []);
    if (!queue.some(t => t.transactionId === transaction.transactionId)) {
      queue.push(transaction);
      writeJsonFile('sync-queue.json', queue);
    }
  }
};
