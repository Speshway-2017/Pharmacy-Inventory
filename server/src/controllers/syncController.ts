import { Request, Response } from 'express';
import { LocalStore } from '../utils/localStorage';
import { connectDB, getIsDBConnected } from '../config/db';
import { initAdminAccount } from './authController';
import SyncLog from '../models/SyncLog';
import Bill from '../models/Bill';
import Medicine from '../models/Medicine';
import Category from '../models/Category';
import PharmacySettings from '../models/PharmacySettings';

export const syncOfflineTransactions = async (req: Request, res: Response) => {
  try {
    const { queue } = req.body;
    const transactionsToSync = queue || LocalStore.getSyncQueue().filter((t: any) => t.status === 'PENDING');

    if (!transactionsToSync || transactionsToSync.length === 0) {
      return res.json({ success: true, message: 'No pending offline transactions to sync.', processedCount: 0 });
    }

    if (!getIsDBConnected()) {
      await connectDB();
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
    const currentQueue = LocalStore.getSyncQueue();

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
