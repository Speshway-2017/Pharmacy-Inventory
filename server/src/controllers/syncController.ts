import { Request, Response } from 'express';
import { LocalStore } from '../utils/localStorage';
import { connectDB, getIsDBConnected } from '../config/db';
import { initAdminAccount } from './authController';
import SyncLog from '../models/SyncLog';
import Bill from '../models/Bill';
import Medicine from '../models/Medicine';
import Category from '../models/Category';
import PharmacySettings from '../models/PharmacySettings';
import StockMovement from '../models/StockMovement';

export const syncOfflineTransactions = async (req: Request, res: Response) => {
  try {
    if (!getIsDBConnected()) {
      await connectDB();
    }

    const { queue } = req.body;
    const clientQueue = Array.isArray(queue) ? queue : [];
    const serverQueue = LocalStore.getSyncQueue();

    // Merge transactions by transactionId or id to avoid missing any pending offline items
    const mergedMap = new Map<string, any>();
    [...serverQueue, ...clientQueue].forEach(item => {
      if (item && (item.transactionId || item.id)) {
        const key = item.transactionId || item.id;
        if (item.status === 'PENDING' || !mergedMap.has(key)) {
          mergedMap.set(key, item);
        }
      }
    });

    const allQueueItems = Array.from(mergedMap.values());
    const transactionsToSync = allQueueItems.filter((t: any) => t.status === 'PENDING');

    if (!transactionsToSync || transactionsToSync.length === 0) {
      return res.json({
        success: true,
        message: 'No pending offline transactions to sync.',
        processedCount: 0,
        isOnline: getIsDBConnected()
      });
    }

    if (getIsDBConnected()) {
      await initAdminAccount();
    } else {
      return res.status(503).json({
        success: false,
        message: 'Cloud Database (MongoDB) unavailable. Offline transactions saved locally and will sync when connection returns.'
      });
    }

    let syncedCount = 0;
    let failedCount = 0;
    const currentQueue = allQueueItems;

    for (const tx of transactionsToSync) {
      if (!getIsDBConnected()) {
        console.warn('⚠️ Connection lost during sync iteration. Stopping queue processing.');
        break;
      }
      const { transactionId, operation, payload } = tx;

      try {
        // IDEMPOTENCY CHECK: Prevent duplicate synchronization transactions
        const existingLog = await SyncLog.findOne({ transactionId });
        if (existingLog) {
          console.log(`ℹ️ Transaction ${transactionId} already synchronized previously. Skipping duplicate.`);
          syncedCount++;
          const idx = currentQueue.findIndex((q: any) => q.transactionId === transactionId);
          if (idx !== -1) currentQueue[idx].status = 'SYNCED';
          continue;
        }

        const cleanPayload = { ...payload };
        delete cleanPayload._id;

        // Process Operation
        if (operation === 'CREATE_BILL') {
          const existingBill = await Bill.findOne({ invoiceNumber: cleanPayload.invoiceNumber });
          if (!existingBill) {
            await Bill.create({ ...cleanPayload, syncStatus: 'SYNCED', isOfflineCreated: true });
          }

          for (const item of cleanPayload.items) {
            const deducted = item.baseUnitsDeducted || (item.quantity * (item.unitsPerPackage || 1));
            await Medicine.findOneAndUpdate(
              { id: item.medicineId },
              { $inc: { quantity: -deducted } }
            );
          }
        } else if (operation === 'DEDUCT_STOCK') {
          await Medicine.findOneAndUpdate(
            { id: cleanPayload.medicineId },
            { $inc: { quantity: -cleanPayload.quantity } }
          );
        } else if (operation === 'ADD_STOCK') {
          await Medicine.findOneAndUpdate(
            { id: cleanPayload.medicineId },
            { $inc: { quantity: cleanPayload.quantity } }
          );
        } else if (operation === 'CREATE_MEDICINE') {
          const existingMed = await Medicine.findOne({ id: cleanPayload.id });
          if (!existingMed) {
            await Medicine.create(cleanPayload);
          }
        } else if (operation === 'UPDATE_MEDICINE') {
          await Medicine.findOneAndUpdate({ id: cleanPayload.id }, cleanPayload, { upsert: true });
        } else if (operation === 'CREATE_CATEGORY') {
          const existingCat = await Category.findOne({ name: cleanPayload.name });
          if (!existingCat) {
            await Category.create(cleanPayload);
          }
        } else if (operation === 'UPDATE_SETTINGS') {
          await PharmacySettings.findOneAndUpdate({}, cleanPayload, { upsert: true });
        }

        // Log successful sync in MongoDB
        await SyncLog.create({
          transactionId,
          operation,
          payload,
          status: 'SYNCED',
          processedAt: new Date()
        });

        syncedCount++;

        const idx = currentQueue.findIndex((q: any) => q.transactionId === transactionId);
        if (idx !== -1) {
          currentQueue[idx].status = 'SYNCED';
          currentQueue[idx].syncedAt = new Date().toISOString();
        }
      } catch (txErr: any) {
        console.error(`❌ Sync error for transaction ${transactionId}:`, txErr.message);
        failedCount++;
        const idx = currentQueue.findIndex((q: any) => q.transactionId === transactionId);
        if (idx !== -1) {
          currentQueue[idx].status = 'FAILED';
          currentQueue[idx].errorMessage = txErr.message;
        }
      }
    }

    // REQUIREMENT: "after cloud syncing the data no need to store in local [queue]"
    // Filter out successfully synced items from local sync-queue.json so queue stays clean
    const remainingQueue = currentQueue.filter((q: any) => q.status !== 'SYNCED');
    LocalStore.saveSyncQueue(remainingQueue);

    // REQUIREMENT: "if it is offline all the data which is in the database should fetch"
    // Refresh local JSON stores with latest Cloud MongoDB state so offline cache contains all DB data
    if (getIsDBConnected()) {
      try {
        const cloudMeds = await Medicine.find().lean();
        LocalStore.saveMedicines(cloudMeds);

        const cloudBills = await Bill.find().sort({ createdAt: -1 }).lean();
        LocalStore.saveBills(cloudBills);

        const cloudCategories = await Category.find().sort({ name: 1 }).lean();
        LocalStore.saveCategories(cloudCategories);
      } catch (cacheErr: any) {
        console.warn('⚠️ Could not update local persistent cache post-sync:', cacheErr.message);
      }
    }

    return res.json({
      success: true,
      message: `Synchronization complete. ${syncedCount} items synced to cloud, ${failedCount} failed.`,
      syncedCount,
      failedCount,
      remainingPending: remainingQueue.filter((q: any) => q.status === 'PENDING').length
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getSyncStatus = async (req: Request, res: Response) => {
  if (!getIsDBConnected()) {
    await connectDB();
  }

  const queue = LocalStore.getSyncQueue();
  const pendingCount = queue.filter((t: any) => t.status === 'PENDING').length;
  const failedCount = queue.filter((t: any) => t.status === 'FAILED').length;

  return res.json({
    success: true,
    isOnline: getIsDBConnected(),
    totalQueue: queue.length,
    pendingCount,
    failedCount,
    queue
  });
};

export const backupToCloud = async (req: Request, res: Response) => {
  try {
    if (!getIsDBConnected()) {
      await connectDB();
    }

    if (!getIsDBConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Cloud Database (MongoDB) is unavailable. Please check your internet connection and MongoDB configuration.'
      });
    }

    const clientData = req.body || {};
    const localMedicines = Array.isArray(clientData.medicines) && clientData.medicines.length > 0
      ? clientData.medicines
      : LocalStore.getMedicines();
    const localBills = Array.isArray(clientData.bills) && clientData.bills.length > 0
      ? clientData.bills
      : LocalStore.getBills();
    const localCategories = Array.isArray(clientData.categories) && clientData.categories.length > 0
      ? clientData.categories
      : LocalStore.getCategories();
    const localSettings = clientData.settings || LocalStore.getSettings();
    const localMovements = Array.isArray(clientData.stockMovements) && clientData.stockMovements.length > 0
      ? clientData.stockMovements
      : LocalStore.getStockMovements();

    let backedUpMedicines = 0;
    let backedUpBills = 0;
    let backedUpCategories = 0;
    let backedUpMovements = 0;

    // 1. Backup Medicines
    for (const med of localMedicines) {
      if (!med || (!med.id && !med.code)) continue;
      const cleanMed = { ...med };
      delete cleanMed._id;
      delete cleanMed.__v;
      const query = med.id ? { id: med.id } : { code: med.code };
      await Medicine.findOneAndUpdate(query, { $set: cleanMed }, { upsert: true, new: true });
      backedUpMedicines++;
    }

    // 2. Backup Bills
    for (const bill of localBills) {
      if (!bill || (!bill.invoiceNumber && !bill.id)) continue;
      const cleanBill: any = { ...bill };
      delete cleanBill._id;
      delete cleanBill.__v;
      cleanBill.syncStatus = 'SYNCED';
      if (Array.isArray(cleanBill.items)) {
        cleanBill.items = cleanBill.items.map((it: any) => {
          const itemCopy = { ...it };
          delete itemCopy._id;
          delete itemCopy.__v;
          return itemCopy;
        });
      }
      const query = bill.invoiceNumber ? { invoiceNumber: bill.invoiceNumber } : { id: bill.id };
      await Bill.findOneAndUpdate(query, { $set: cleanBill }, { upsert: true, new: true });
      backedUpBills++;
    }

    // 3. Backup Categories
    for (const cat of localCategories) {
      if (!cat || (!cat.id && !cat.name)) continue;
      const cleanCat: any = { ...cat };
      delete cleanCat._id;
      delete cleanCat.__v;
      const query = cat.id ? { id: cat.id } : { name: cat.name };
      await Category.findOneAndUpdate(query, { $set: cleanCat }, { upsert: true, new: true });
      backedUpCategories++;
    }

    // 4. Backup Settings
    if (localSettings && typeof localSettings === 'object') {
      const cleanSettings = { ...localSettings };
      delete cleanSettings._id;
      delete cleanSettings.__v;
      await PharmacySettings.findOneAndUpdate({}, { $set: cleanSettings }, { upsert: true, new: true });
    }

    // 5. Backup Stock Movements
    for (const sm of localMovements) {
      if (!sm || !sm.id) continue;
      const cleanSm = { ...sm };
      delete cleanSm._id;
      delete cleanSm.__v;
      await StockMovement.findOneAndUpdate({ id: sm.id }, { $set: cleanSm }, { upsert: true, new: true });
      backedUpMovements++;
    }

    // 6. Clear pending sync queue as all local data is now backed up
    LocalStore.saveSyncQueue([]);

    // Keep server's local store in sync
    LocalStore.saveMedicines(localMedicines);
    LocalStore.saveBills(localBills);
    LocalStore.saveCategories(localCategories);
    if (localSettings) LocalStore.saveSettings(localSettings);
    LocalStore.saveStockMovements(localMovements);

    return res.json({
      success: true,
      message: 'Cloud backup completed successfully.',
      timestamp: new Date().toISOString(),
      stats: {
        medicines: backedUpMedicines,
        bills: backedUpBills,
        categories: backedUpCategories,
        stockMovements: backedUpMovements
      }
    });
  } catch (error: any) {
    console.error('Backup error:', error);
    return res.status(500).json({
      success: false,
      message: `Cloud backup failed: ${error.message}`
    });
  }
};

export const restoreFromCloud = async (req: Request, res: Response) => {
  try {
    if (!getIsDBConnected()) {
      await connectDB();
    }

    if (!getIsDBConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Cloud Database (MongoDB) is unavailable. Please check your internet connection.'
      });
    }

    // 1. Retrieve all records from MongoDB Atlas
    const cloudMedicines = await Medicine.find().lean();
    const cloudBills = await Bill.find().sort({ createdAt: -1 }).lean();
    const cloudCategories = await Category.find().sort({ name: 1 }).lean();
    const cloudSettings = await PharmacySettings.findOne().lean();
    const cloudMovements = await StockMovement.find().sort({ createdAt: -1 }).lean();

    if (cloudMedicines.length === 0 && cloudBills.length === 0 && cloudCategories.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No backup records found in Cloud Database. Please click Backup first to save your data to the cloud.'
      });
    }

    const mappedMedicines = cloudMedicines.map((m: any) => {
      const copy = { ...m, id: m.id || m._id?.toString() };
      delete copy._id;
      delete copy.__v;
      return copy;
    });

    const mappedBills = cloudBills.map((b: any) => {
      const copy = { ...b, id: b.id || b._id?.toString(), syncStatus: 'SYNCED' };
      delete copy._id;
      delete copy.__v;
      if (Array.isArray(copy.items)) {
        copy.items = copy.items.map((it: any) => {
          const itemCopy = { ...it };
          delete itemCopy._id;
          delete itemCopy.__v;
          return itemCopy;
        });
      }
      return copy;
    });

    const mappedCategories = cloudCategories.map((c: any) => {
      const copy = { ...c, id: c.id || c._id?.toString() };
      delete copy._id;
      delete copy.__v;
      return copy;
    });

    const mappedMovements = cloudMovements.map((sm: any) => {
      const copy = { ...sm, id: sm.id || sm._id?.toString() };
      delete copy._id;
      delete copy.__v;
      return copy;
    });

    // 2. Persist to server LocalStore
    LocalStore.saveMedicines(mappedMedicines);
    LocalStore.saveBills(mappedBills);
    LocalStore.saveCategories(mappedCategories);
    if (cloudSettings) {
      const cleanSettings: any = { ...cloudSettings };
      delete cleanSettings._id;
      delete cleanSettings.__v;
      LocalStore.saveSettings(cleanSettings);
    }
    LocalStore.saveStockMovements(mappedMovements);
    LocalStore.saveSyncQueue([]);

    return res.json({
      success: true,
      message: 'Cloud data restored successfully to local storage.',
      timestamp: new Date().toISOString(),
      stats: {
        medicines: mappedMedicines.length,
        bills: mappedBills.length,
        categories: mappedCategories.length,
        stockMovements: mappedMovements.length
      },
      data: {
        medicines: mappedMedicines,
        bills: mappedBills,
        categories: mappedCategories,
        settings: cloudSettings || LocalStore.getSettings(),
        stockMovements: mappedMovements
      }
    });
  } catch (error: any) {
    console.error('Restore error:', error);
    return res.status(500).json({
      success: false,
      message: `Cloud restore failed: ${error.message}`
    });
  }
};
