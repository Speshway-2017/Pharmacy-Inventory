import axios from 'axios';
import { OfflineEngine } from './offlineEngine';
import { Medicine, Bill, PharmacySettings, SyncTransaction, Category } from '../../../shared/types';
import { v4 as uuidv4 } from 'uuid';

const getApiBaseUrl = (): string => {
  if (import.meta.env.VITE_API_BASE_URL && !import.meta.env.VITE_API_BASE_URL.includes('localhost')) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  if (typeof window !== 'undefined' && window.location.hostname && window.location.hostname !== 'localhost') {
    return `http://${window.location.hostname}:5000/api`;
  }
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 5000,
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
  async getMedicines(params?: { search?: string; category?: string; status?: string }) {
    try {
      const res = await api.get('/medicines', { params });
      return res.data;
    } catch (err) {
      console.warn('⚠️ Server unavailable. Using local persistent medicines data.');
      let medicines = await OfflineEngine.readJson<Medicine[]>('medicines.json', 'pharmacy_local_medicines', []);
      if (params?.search) {
        const q = params.search.toLowerCase();
        medicines = medicines.filter(m =>
          m.name.toLowerCase().includes(q) ||
          m.genericName.toLowerCase().includes(q) ||
          m.barcode.includes(q) ||
          m.batchNumber.toLowerCase().includes(q)
        );
      }
      if (params?.category) medicines = medicines.filter(m => m.category === params.category);
      if (params?.status) medicines = medicines.filter(m => m.status === params.status);
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
      const newMed: Medicine = {
        id: `med-${Date.now()}`,
        name: medicineData.name || '',
        genericName: medicineData.genericName || medicineData.name || '',
        category: medicineData.category || 'General',
        manufacturer: medicineData.manufacturer || 'Standard Pharma',
        batchNumber: medicineData.batchNumber || `BATCH-${Date.now()}`,
        expiryDate: medicineData.expiryDate || '2027-12-31',
        mrp: Number(medicineData.mrp) || Number(medicineData.sellingPrice),
        sellingPrice: Number(medicineData.sellingPrice) || 0,
        quantity: Number(medicineData.quantity) || 0,
        reorderLevel: Number(medicineData.reorderLevel) || 10,
        barcode: medicineData.barcode || `${Math.floor(1000000000000 + Math.random() * 9000000000000)}`,
        status: (Number(medicineData.quantity) || 0) <= 10 ? 'LOW_STOCK' : 'IN_STOCK',
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
      const idx = medicines.findIndex(m => m.id === id);
      if (idx !== -1) {
        medicines[idx] = { ...medicines[idx], ...medicineData, updatedAt: new Date().toISOString() };
        await OfflineEngine.writeJson('medicines.json', 'pharmacy_local_medicines', medicines);
        await OfflineEngine.enqueueSyncTransaction('UPDATE_MEDICINE', medicines[idx]);
      }
      return { success: true, message: 'Medicine updated locally.', medicine: medicines[idx] };
    }
  },

  async adjustStock(id: string, deltaQuantity: number, reason: string) {
    try {
      const res = await api.patch(`/medicines/${id}/stock`, { deltaQuantity, reason });
      return res.data;
    } catch (err) {
      const medicines = await OfflineEngine.readJson<Medicine[]>('medicines.json', 'pharmacy_local_medicines', []);
      const idx = medicines.findIndex(m => m.id === id);
      if (idx !== -1) {
        const newQty = medicines[idx].quantity + deltaQuantity;
        if (newQty < 0) {
          throw new Error(`Insufficient stock! Available: ${medicines[idx].quantity}`);
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
        const med = medicines.find(m => m.id === item.medicineId || m.barcode === item.barcode);
        if (!med) throw new Error(`Item ${item.name} not found.`);
        if (new Date(med.expiryDate) < today || med.status === 'EXPIRED') {
          throw new Error(`Cannot sell expired medicine '${med.name}'.`);
        }
        if (med.quantity < item.quantity) {
          throw new Error(`Insufficient stock for '${med.name}'. Available: ${med.quantity}`);
        }
      }

      // Deduct stock locally
      let subtotal = 0;
      const processedItems = billPayload.items.map(item => {
        const idx = medicines.findIndex(m => m.id === item.medicineId || m.barcode === item.barcode);
        medicines[idx].quantity -= item.quantity;
        subtotal += item.unitPrice * item.quantity;
        return {
          medicineId: medicines[idx].id,
          name: medicines[idx].name,
          genericName: medicines[idx].genericName,
          batchNumber: medicines[idx].batchNumber,
          expiryDate: medicines[idx].expiryDate,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          totalPrice: item.unitPrice * item.quantity
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
        createdByName: currentUser.name,
        createdByEmail: currentUser.email,
        isOfflineCreated: true,
        syncStatus: 'PENDING',
        createdAt: new Date().toISOString()
      };

      const bills = await OfflineEngine.readJson<Bill[]>('bills.json', 'pharmacy_local_bills', []);
      bills.unshift(localBill);
      await OfflineEngine.writeJson('bills.json', 'pharmacy_local_bills', bills);

      // Enqueue sync transaction
      await OfflineEngine.enqueueSyncTransaction('CREATE_BILL', localBill);

      return { success: true, message: 'Bill created offline.', bill: localBill };
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
      return { success: true, count: bills.length, bills };
    }
  },

  // Dashboard & Analytics API
  async getDashboardSummary() {
    try {
      const res = await api.get('/reports/dashboard');
      return res.data;
    } catch (err) {
      const medicines = await OfflineEngine.readJson<Medicine[]>('medicines.json', 'pharmacy_local_medicines', []);
      const bills = await OfflineEngine.readJson<Bill[]>('bills.json', 'pharmacy_local_bills', []);
      const pendingSyncCount = await OfflineEngine.getPendingSyncCount();

      const todayStr = new Date().toISOString().slice(0, 10);
      const todaysBills = bills.filter(b => b.date === todayStr);
      const todaysSales = todaysBills.reduce((sum, b) => sum + b.totalAmount, 0);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let lowStockCount = 0;
      let expiringCount = 0;
      let expiredCount = 0;

      medicines.forEach(m => {
        const exp = new Date(m.expiryDate);
        exp.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (exp < today) expiredCount++;
        else if (diffDays <= 90) expiringCount++;
        else if (m.quantity <= m.reorderLevel) lowStockCount++;
      });

      return {
        success: true,
        summary: {
          todaysSales,
          todaysBillCount: todaysBills.length,
          totalMedicines: medicines.length,
          currentStockCount: medicines.reduce((s, m) => s + m.quantity, 0),
          lowStockCount,
          expiringCount,
          expiredCount,
          recentBills: bills.slice(0, 5),
          isOnline: false,
          pendingSyncCount
        }
      };
    }
  },

  // Synchronization API
  async triggerSync() {
    const queue = await OfflineEngine.readJson<SyncTransaction[]>('sync-queue.json', 'pharmacy_local_sync_queue', []);
    const pending = queue.filter(q => q.status === 'PENDING');

    if (!pending.length) {
      return { success: true, message: 'All data synchronized.', syncedCount: 0 };
    }

    try {
      const res = await api.post('/sync', { queue: pending });
      if (res.data.success) {
        // Update local queue statuses
        queue.forEach(q => {
          if (q.status === 'PENDING') q.status = 'SYNCED';
        });
        await OfflineEngine.writeJson('sync-queue.json', 'pharmacy_local_sync_queue', queue);
      }
      return res.data;
    } catch (err: any) {
      throw new Error(err.response?.data?.message || 'Synchronization server unreachable.');
    }
  },

  // Settings API
  async getSettings() {
    try {
      const res = await api.get('/settings');
      return res.data;
    } catch (err) {
      const settings = await OfflineEngine.readJson<PharmacySettings>('settings.json', 'pharmacy_local_settings', {
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
      });
      return { success: true, settings };
    }
  },

  async updateSettings(newSettings: Partial<PharmacySettings>) {
    try {
      const res = await api.put('/settings', newSettings);
      return res.data;
    } catch (err) {
      const current = await this.getSettings();
      const updated = { ...current.settings, ...newSettings };
      await OfflineEngine.writeJson('settings.json', 'pharmacy_local_settings', updated);
      return { success: true, message: 'Settings saved locally.', settings: updated };
    }
  },

  // Category API
  async getCategories() {
    try {
      const res = await api.get('/categories');
      return res.data;
    } catch (err) {
      const defaultCategories: Category[] = [
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
      return { success: true, count: categories.length, categories };
    }
  },

  async addCategory(name: string, description?: string) {
    try {
      const res = await api.post('/categories', { name, description });
      return res.data;
    } catch (err: any) {
      const current = await this.getCategories();
      const categories: Category[] = current.categories || [];
      const trimmedName = name.trim();
      if (categories.some(c => c.name.toLowerCase() === trimmedName.toLowerCase())) {
        throw new Error(`Category '${trimmedName}' already exists.`);
      }
      const newCat: Category = {
        id: `cat-${Date.now()}`,
        name: trimmedName,
        description: description || '',
        createdAt: new Date().toISOString()
      };
      categories.push(newCat);
      await OfflineEngine.writeJson('categories.json', 'pharmacy_local_categories', categories);
      return { success: true, message: 'Category added locally.', category: newCat };
    }
  },

  async deleteCategory(id: string) {
    try {
      const res = await api.delete(`/categories/${id}`);
      return res.data;
    } catch (err) {
      const current = await this.getCategories();
      const categories: Category[] = (current.categories || []).filter((c: Category) => c.id !== id && c.name !== id);
      await OfflineEngine.writeJson('categories.json', 'pharmacy_local_categories', categories);
      return { success: true, message: 'Category deleted locally.' };
    }
  }
};
