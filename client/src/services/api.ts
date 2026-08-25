import axios from 'axios';
import { Medicine, Bill, PharmacySettings, DashboardSummary, Category } from '../../../shared/types';
import { OfflineEngine } from './offlineEngine';

const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptors for Auth Header & 401 Token Expiration
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('pharmacy_jwt_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('pharmacy_jwt_token');
      localStorage.removeItem('pharmacy_user');
      if (window.location.pathname !== '/') {
        window.location.reload();
      }
    }
    return Promise.reject(error);
  }
);

export const apiService = {
  // Auth API
  async login(emailOrUsername: string, password: string) {
    try {
      const response = await api.post('/auth/login', { email: emailOrUsername, username: emailOrUsername, password });
      if (response.data.token) {
        localStorage.setItem('pharmacy_jwt_token', response.data.token);
        localStorage.setItem('pharmacy_user', JSON.stringify(response.data.user));
      }
      return response.data;
    } catch (err: any) {
      const input = emailOrUsername.toLowerCase().trim();
      // Offline single admin fallback check if backend server is unreachable
      if ((input === 'admin@pharmacy.com' || input === 'admin') && password === 'admin123') {
        const adminUser = { id: 'usr-admin-01', name: 'Pharmacy Admin', email: 'admin@pharmacy.com', role: 'ADMIN' as const };
        localStorage.setItem('pharmacy_jwt_token', 'mock_offline_admin_token');
        localStorage.setItem('pharmacy_user', JSON.stringify(adminUser));
        return { success: true, token: 'mock_offline_admin_token', user: adminUser };
      }
      throw new Error(err.response?.data?.message || 'Invalid credentials');
    }
  },

  // Medicines API
  async getMedicines(params?: { search?: string; category?: string; dosageForm?: string; status?: string; rack?: string }) {
    try {
      const res = await api.get('/medicines', { params });
      return res.data;
    } catch (err) {
      console.warn('⚠️ Server unavailable. Using local persistent medicines data.');
      let medicines = await OfflineEngine.readJson<Medicine[]>('medicines.json', 'pharmacy_local_medicines', []);
      if (params?.search) {
        const q = params.search.toLowerCase();
        medicines = medicines.filter(m =>
          (m.name && m.name.toLowerCase().includes(q)) ||
          (m.genericName && m.genericName.toLowerCase().includes(q)) ||
          (m.code && m.code.toLowerCase().includes(q)) ||
          (m.barcode && m.barcode.toLowerCase().includes(q)) ||
          (m.batchNumber && m.batchNumber.toLowerCase().includes(q)) ||
          (m.strength && m.strength.toLowerCase().includes(q)) ||
          (m.manufacturer && m.manufacturer.toLowerCase().includes(q))
        );
      }
      if (params?.category) medicines = medicines.filter(m => m.category === params.category);
      if (params?.dosageForm) medicines = medicines.filter(m => m.dosageForm === params.dosageForm);
      if (params?.status) medicines = medicines.filter(m => m.status === params.status);
      if (params?.rack) medicines = medicines.filter(m => m.rack === params.rack);
      return { success: true, count: medicines.length, medicines };
    }
  },

  async addMedicine(medicineData: Partial<Medicine>) {
    try {
      const res = await api.post('/medicines', medicineData);
      return res.data;
    } catch (err) {
      console.warn('⚠️ Server unavailable. Adding medicine locally and queuing sync.');
      const medicines = await OfflineEngine.readJson<Medicine[]>('medicines.json', 'pharmacy_local_medicines', []);
      const num = Math.floor(100000 + Math.random() * 900000);
      const newMed: Medicine = {
        id: `med-${Date.now()}`,
        code: medicineData.code || `MED-${num}`,
        name: medicineData.name || '',
        genericName: medicineData.genericName || medicineData.name || '',
        category: medicineData.category || 'General',
        manufacturer: medicineData.manufacturer || 'Standard Pharma',
        strength: medicineData.strength || '',
        dosageForm: medicineData.dosageForm || 'Tablet',
        packageType: medicineData.packageType || 'Strip',
        unitsPerPackage: Math.max(1, Number(medicineData.unitsPerPackage) || 1),
        sellingMode: medicineData.sellingMode || 'FULL_PACKAGE_ONLY',
        looseUnitName: medicineData.looseUnitName || 'Tablet',
        batchNumber: medicineData.batchNumber || `BATCH-${Date.now()}`,
        expiryDate: medicineData.expiryDate || '2027-12-31',
        mrp: Number(medicineData.mrp) || Number(medicineData.sellingPrice) || 0,
        sellingPrice: Number(medicineData.sellingPrice) || 0,
        quantity: Math.max(0, Number(medicineData.quantity) || 0),
        reorderLevel: Number(medicineData.reorderLevel) || 10,
        barcode: medicineData.barcode || `${Math.floor(1000000000000 + Math.random() * 9000000000000)}`,
        rack: medicineData.rack || '',
        row: medicineData.row || '',
        column: medicineData.column || '',
        shelfBin: medicineData.shelfBin || '',
        status: (Number(medicineData.quantity) || 0) <= (Number(medicineData.reorderLevel) || 10) ? 'LOW_STOCK' : 'IN_STOCK',
        createdAt: new Date().toISOString()
      };
      medicines.unshift(newMed);
      await OfflineEngine.writeJson('medicines.json', 'pharmacy_local_medicines', medicines);
      await OfflineEngine.enqueueSyncTransaction('CREATE_MEDICINE', newMed);
      return { success: true, message: 'Medicine saved locally.', medicine: newMed };
    }
  },

  async updateMedicine(id: string, medicineData: Partial<Medicine>) {
    try {
      const res = await api.put(`/medicines/${id}`, medicineData);
      return res.data;
    } catch (err) {
      console.warn('⚠️ Server unavailable. Updating medicine locally and queuing sync.');
      const medicines = await OfflineEngine.readJson<Medicine[]>('medicines.json', 'pharmacy_local_medicines', []);
      const idx = medicines.findIndex(m => m.id === id || m.code === id);
      if (idx !== -1) {
        // Retain original permanent code!
        const existingCode = medicines[idx].code || `MED-${(medicines[idx].id || '000000').slice(-6).toUpperCase()}`;
        medicines[idx] = {
          ...medicines[idx],
          ...medicineData,
          code: existingCode,
          updatedAt: new Date().toISOString()
        };
        await OfflineEngine.writeJson('medicines.json', 'pharmacy_local_medicines', medicines);
        await OfflineEngine.enqueueSyncTransaction('UPDATE_MEDICINE', medicines[idx]);
      }
      return { success: true, message: 'Medicine updated locally.', medicine: medicines[idx] };
    }
  },

  async addStockToMedicine(id: string, payload: {
    batchNumber: string;
    expiryDate: string;
    packageQuantity: number;
    looseQuantity: number;
    mrp?: number;
    sellingPrice?: number;
    reason?: string;
  }) {
    try {
      const res = await api.post(`/medicines/${id}/add-stock`, payload);
      return res.data;
    } catch (err) {
      console.warn('⚠️ Server unavailable. Adding stock locally and queuing sync.');
      const medicines = await OfflineEngine.readJson<Medicine[]>('medicines.json', 'pharmacy_local_medicines', []);
      const idx = medicines.findIndex(m => m.id === id || m.code === id);
      if (idx !== -1) {
        const unitsPerPkg = Math.max(1, medicines[idx].unitsPerPackage || 1);
        const addedBaseUnits = (Number(payload.packageQuantity) * unitsPerPkg) + Number(payload.looseQuantity);
        medicines[idx].quantity += addedBaseUnits;
        if (payload.batchNumber) medicines[idx].batchNumber = payload.batchNumber;
        if (payload.expiryDate) medicines[idx].expiryDate = payload.expiryDate;
        if (payload.mrp !== undefined) medicines[idx].mrp = Number(payload.mrp);
        if (payload.sellingPrice !== undefined) medicines[idx].sellingPrice = Number(payload.sellingPrice);
        medicines[idx].updatedAt = new Date().toISOString();

        await OfflineEngine.writeJson('medicines.json', 'pharmacy_local_medicines', medicines);
        await OfflineEngine.enqueueSyncTransaction('ADD_STOCK', {
          medicineId: id,
          quantity: addedBaseUnits,
          batchNumber: payload.batchNumber,
          expiryDate: payload.expiryDate
        });
        return { success: true, message: `Added ${addedBaseUnits} base units locally.`, medicine: medicines[idx] };
      }
      throw new Error('Medicine not found.');
    }
  },

  async adjustStock(id: string, deltaQuantity: number, reason: string) {
    try {
      const res = await api.patch(`/medicines/${id}/stock`, { deltaQuantity, reason });
      return res.data;
    } catch (err) {
      const medicines = await OfflineEngine.readJson<Medicine[]>('medicines.json', 'pharmacy_local_medicines', []);
      const idx = medicines.findIndex(m => m.id === id || m.code === id);
      if (idx !== -1) {
        const newQty = medicines[idx].quantity + deltaQuantity;
        if (newQty < 0) {
          throw new Error(`Insufficient stock! Available: ${medicines[idx].quantity} base units.`);
        }
        medicines[idx].quantity = newQty;
        await OfflineEngine.writeJson('medicines.json', 'pharmacy_local_medicines', medicines);
        const op = deltaQuantity < 0 ? 'DEDUCT_STOCK' : 'ADD_STOCK';
        await OfflineEngine.enqueueSyncTransaction(op, { medicineId: id, quantity: Math.abs(deltaQuantity), reason });
        return { success: true, message: 'Stock updated locally.', medicine: medicines[idx] };
      }
      throw new Error('Medicine not found.');
    }
  },

  async getStockMovements(medicineId?: string) {
    try {
      const res = await api.get('/medicines/stock-movements', { params: { medicineId } });
      return res.data;
    } catch (err) {
      let movements = await OfflineEngine.readJson<any[]>('stock-movements.json', 'pharmacy_local_stock_movements', []);
      if (medicineId) movements = movements.filter(m => m.medicineId === medicineId);
      return { success: true, count: movements.length, movements };
    }
  },

  // Billing POS API
  async createBill(billPayload: { items: any[]; discountAmount: number; discountPercentage: number; paymentMethod: string }) {
    try {
      const res = await api.post('/bills', billPayload);
      return res.data;
    } catch (err: any) {
      console.warn('⚠️ Server unavailable. Creating bill locally and queuing sync.');
      const medicines = await OfflineEngine.readJson<Medicine[]>('medicines.json', 'pharmacy_local_medicines', []);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Validate stock & expiry offline
      for (const item of billPayload.items) {
        const med = medicines.find(m => m.id === item.medicineId || m.barcode === item.barcode || m.code === item.code);
        if (!med) throw new Error(`Item ${item.name} not found.`);
        if (new Date(med.expiryDate) < today || med.status === 'EXPIRED') {
          throw new Error(`Cannot sell expired medicine '${med.name}'.`);
        }

        const unitType = item.unitType || 'PACKAGE';
        const unitsPerPkg = Math.max(1, med.unitsPerPackage || 1);

        if (unitType === 'LOOSE' && med.sellingMode === 'FULL_PACKAGE_ONLY') {
          throw new Error(`'${med.name}' is configured for FULL PACKAGE sales only.`);
        }

        const baseUnitsRequired = unitType === 'PACKAGE' ? (item.quantity * unitsPerPkg) : item.quantity;
        if (med.quantity < baseUnitsRequired) {
          throw new Error(`Insufficient stock for '${med.name}'. Available: ${med.quantity} base units, Requested: ${baseUnitsRequired}.`);
        }
      }

      // Deduct stock locally
      let subtotal = 0;
      const processedItems = billPayload.items.map(item => {
        const idx = medicines.findIndex(m => m.id === item.medicineId || m.barcode === item.barcode || m.code === item.code);
        const med = medicines[idx];
        const unitType = item.unitType || 'PACKAGE';
        const unitsPerPkg = Math.max(1, med.unitsPerPackage || 1);
        const unitPrice = Number(item.unitPrice) || Number(med.sellingPrice) || 0;
        const quantity = Math.max(1, Number(item.quantity) || 1);
        const totalPrice = Math.round(unitPrice * quantity * 100) / 100;
        const baseUnitsDeducted = unitType === 'PACKAGE' ? (quantity * unitsPerPkg) : quantity;

        medicines[idx].quantity -= baseUnitsDeducted;
        subtotal += totalPrice;

        return {
          medicineId: med.id,
          code: med.code || `MED-${med.id.slice(-6).toUpperCase()}`,
          name: med.name,
          genericName: med.genericName || med.name,
          batchNumber: med.batchNumber,
          expiryDate: med.expiryDate,
          unitPrice,
          quantity,
          unitType,
          unitsPerPackage: unitsPerPkg,
          looseUnitName: med.looseUnitName || 'Tablet',
          baseUnitsDeducted,
          totalPrice
        };
      });

      await OfflineEngine.writeJson('medicines.json', 'pharmacy_local_medicines', medicines);

      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const invoiceNumber = `INV-${dateStr}-${Math.floor(1000 + Math.random() * 9000)}`;

      const totalDiscount = billPayload.discountAmount || (subtotal * (billPayload.discountPercentage || 0)) / 100;
      const userRaw = localStorage.getItem('pharmacy_user');
      const currentUser = userRaw ? JSON.parse(userRaw) : { name: 'Staff Pharmacist', email: 'staff@pharmacy.com' };

      const localBill: Bill = {
        id: `bill-${Date.now()}`,
        invoiceNumber,
        date: new Date().toISOString().slice(0, 10),
        time: new Date().toTimeString().slice(0, 8),
        items: processedItems,
        subtotal,
        discountAmount: totalDiscount,
        discountPercentage: billPayload.discountPercentage || 0,
        totalAmount: Math.max(0, subtotal - totalDiscount),
        paymentMethod: billPayload.paymentMethod as any,
        createdByName: currentUser.name || 'Staff Pharmacist',
        createdByEmail: currentUser.email || 'staff@pharmacy.com',
        isOfflineCreated: true,
        syncStatus: 'PENDING',
        createdAt: new Date().toISOString()
      };

      const bills = await OfflineEngine.readJson<Bill[]>('bills.json', 'pharmacy_local_bills', []);
      bills.unshift(localBill);
      await OfflineEngine.writeJson('bills.json', 'pharmacy_local_bills', bills);

      // Queue for Auto-Sync
      await OfflineEngine.enqueueSyncTransaction('CREATE_BILL', localBill);

      return { success: true, message: 'Bill created locally.', bill: localBill };
    }
  },

  async getBills(params?: { startDate?: string; endDate?: string; invoiceNumber?: string }) {
    try {
      const res = await api.get('/bills', { params });
      return res.data;
    } catch (err) {
      let bills = await OfflineEngine.readJson<Bill[]>('bills.json', 'pharmacy_local_bills', []);
      if (params?.invoiceNumber) {
        const inv = params.invoiceNumber.toLowerCase();
        bills = bills.filter(b => b.invoiceNumber.toLowerCase().includes(inv));
      }
      if (params?.startDate && params?.endDate) {
        bills = bills.filter(b => b.date >= params.startDate! && b.date <= params.endDate!);
      }
      return { success: true, count: bills.length, bills };
    }
  },

  async getBillByInvoice(invoiceNumber: string) {
    try {
      const res = await api.get(`/bills/${invoiceNumber}`);
      return res.data;
    } catch (err) {
      const bills = await OfflineEngine.readJson<Bill[]>('bills.json', 'pharmacy_local_bills', []);
      const bill = bills.find(b => b.invoiceNumber === invoiceNumber || b.id === invoiceNumber);
      if (bill) return { success: true, bill };
      throw new Error('Invoice not found.');
    }
  },

  // Category API
  async getCategories() {
    try {
      const res = await api.get('/categories');
      return res.data;
    } catch (err) {
      const defaultCategories = [
        { id: 'cat-1', name: 'Tablet / Capsule' },
        { id: 'cat-2', name: 'Syrup / Liquid' },
        { id: 'cat-3', name: 'Injection' },
        { id: 'cat-4', name: 'Ointment / Cream' },
        { id: 'cat-5', name: 'Antibiotic' },
        { id: 'cat-6', name: 'Analgesic' },
        { id: 'cat-7', name: 'Supplements' },
        { id: 'cat-8', name: 'General' }
      ];
      const categories = await OfflineEngine.readJson<Category[]>('categories.json', 'pharmacy_local_categories', defaultCategories);
      return { success: true, categories };
    }
  },

  async addCategory(name: string, description?: string) {
    try {
      const res = await api.post('/categories', { name, description });
      return res.data;
    } catch (err) {
      const defaultCategories = [
        { id: 'cat-1', name: 'Tablet / Capsule' },
        { id: 'cat-2', name: 'Syrup / Liquid' },
        { id: 'cat-3', name: 'Injection' },
        { id: 'cat-4', name: 'Ointment / Cream' },
        { id: 'cat-5', name: 'Antibiotic' },
        { id: 'cat-6', name: 'Analgesic' },
        { id: 'cat-7', name: 'Supplements' },
        { id: 'cat-8', name: 'General' }
      ];
      const categories = await OfflineEngine.readJson<Category[]>('categories.json', 'pharmacy_local_categories', defaultCategories);
      const newCat: Category = { id: `cat-${Date.now()}`, name, description };
      categories.push(newCat);
      await OfflineEngine.writeJson('categories.json', 'pharmacy_local_categories', categories);
      return { success: true, category: newCat };
    }
  },

  async deleteCategory(id: string) {
    try {
      const res = await api.delete(`/categories/${id}`);
      return res.data;
    } catch (err) {
      const categories = await OfflineEngine.readJson<Category[]>('categories.json', 'pharmacy_local_categories', []);
      const filtered = categories.filter(c => c.id !== id);
      await OfflineEngine.writeJson('categories.json', 'pharmacy_local_categories', filtered);
      return { success: true };
    }
  },

  // Settings & Sync API
  async getSettings() {
    try {
      const res = await api.get('/settings');
      return res.data;
    } catch (err) {
      const defaultSettings: PharmacySettings = {
        pharmacyName: 'Pharmacy Store',
        address: '',
        phone: '',
        email: '',
        gstin: '',
        invoicePrefix: 'INV',
        invoiceFooter: 'Thank you for your business!',
        printerType: 'THERMAL_80MM',
        printerName: 'Default Printer',
        autoPrintInvoice: true,
        lowStockThresholdDefault: 10,
        expiryWarningDays: 90
      };
      const settings = await OfflineEngine.readJson<PharmacySettings>('settings.json', 'pharmacy_local_settings', defaultSettings);
      return { success: true, settings };
    }
  },

  async updateSettings(settings: PharmacySettings) {
    try {
      const res = await api.put('/settings', settings);
      return res.data;
    } catch (err) {
      await OfflineEngine.writeJson('settings.json', 'pharmacy_local_settings', settings);
      await OfflineEngine.enqueueSyncTransaction('UPDATE_SETTINGS', settings);
      return { success: true, message: 'Settings saved locally.' };
    }
  },

  async getDashboardSummary(): Promise<{ success: boolean; summary?: DashboardSummary }> {
    try {
      const res = await api.get('/reports/dashboard-summary');
      return res.data;
    } catch (err) {
      const medicines = await OfflineEngine.readJson<Medicine[]>('medicines.json', 'pharmacy_local_medicines', []);
      const bills = await OfflineEngine.readJson<Bill[]>('bills.json', 'pharmacy_local_bills', []);

      const todayStr = new Date().toISOString().slice(0, 10);
      const todaysBills = bills.filter(b => b.date === todayStr);
      const todaysSales = todaysBills.reduce((sum, b) => sum + b.totalAmount, 0);

      const pendingSyncCount = await OfflineEngine.getPendingSyncCount();

      return {
        success: true,
        summary: {
          todaysSales,
          todaysBillCount: todaysBills.length,
          salesGrowthPercentage: 12.5,
          totalMedicines: medicines.length,
          currentStockCount: medicines.reduce((sum, m) => sum + m.quantity, 0),
          lowStockCount: medicines.filter(m => m.status === 'LOW_STOCK').length,
          expiringCount: medicines.filter(m => m.status === 'EXPIRING').length,
          expiredCount: medicines.filter(m => m.status === 'EXPIRED').length,
          recentBills: bills.slice(0, 5),
          isOnline: false,
          pendingSyncCount
        }
      };
    }
  },

  async triggerSync() {
    try {
      const queue = await OfflineEngine.readJson<any[]>('sync-queue.json', 'pharmacy_local_sync_queue', []);
      const pending = queue.filter(q => q.status === 'PENDING');
      if (pending.length === 0) return { success: true, message: 'No pending items' };

      let res;
      try {
        res = await api.post('/sync', { queue: pending });
      } catch (e) {
        res = await api.post('/sync/offline', { queue: pending });
      }

      if (res?.data?.success) {
        const remainingQueue = queue.filter(q => q.status !== 'PENDING');
        await OfflineEngine.writeJson('sync-queue.json', 'pharmacy_local_sync_queue', remainingQueue);
      }

      return res.data;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Sync failed.');
    }
  },

  async getSyncStatus() {
    try {
      const res = await api.get('/sync/status');
      if (res.data?.success && res.data.isOnline && res.data.pendingCount === 0) {
        const queue = await OfflineEngine.readJson<any[]>('sync-queue.json', 'pharmacy_local_sync_queue', []);
        if (queue.some(q => q.status === 'PENDING')) {
          const remainingQueue = queue.filter(q => q.status !== 'PENDING');
          await OfflineEngine.writeJson('sync-queue.json', 'pharmacy_local_sync_queue', remainingQueue);
        }
      }
      return res.data;
    } catch (err: any) {
      const pendingCount = await OfflineEngine.getPendingSyncCount();
      return { success: false, isOnline: false, pendingCount };
    }
  }
};
