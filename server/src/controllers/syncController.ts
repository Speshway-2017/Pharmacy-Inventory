import { Request, Response } from 'express';
import { LocalStore } from '../utils/localStorage';
import { getIsDBConnected } from '../config/db';
import SyncLog from '../models/SyncLog';
import Bill from '../models/Bill';
import Medicine from '../models/Medicine';

export const syncOfflineTransactions = async (req: Request, res: Response) => {
  try {
    const { queue } = req.body;
    const transactionsToSync = queue || LocalStore.getSyncQueue().filter((t: any) => t.status === 'PENDING');

    if (!transactionsToSync || transactionsToSync.length === 0) {
      return res.json({ success: true, message: 'No pending offline transactions to sync.', processedCount: 0 });
    }

    if (!getIsDBConnected()) {
      return res.status(503).json({
        success: false,
        message: 'Cloud Database (MongoDB) unavailable. Offline transactions saved locally and will sync when connection returns.'
      });
    }

    let syncedCount = 0;
    let failedCount = 0;
    const currentQueue = LocalStore.getSyncQueue();

    for (const tx of transactionsToSync) {
      const { transactionId, operation, payload } = tx;

      try {
        // IDEMPOTENCY CHECK: Prevent duplicate synchronization transactions
        const existingLog = await SyncLog.findOne({ transactionId });
        if (existingLog) {
          console.log(`ℹ️ Transaction ${transactionId} already synchronized previously. Skipping duplicate.`);
          syncedCount++;
          // Update local status
          const idx = currentQueue.findIndex((q: any) => q.transactionId === transactionId);
          if (idx !== -1) currentQueue[idx].status = 'SYNCED';
          continue;
        }

        // Process Operation
        if (operation === 'CREATE_BILL') {
          // Check if invoice number exists to prevent duplicate bill
          const existingBill = await Bill.findOne({ invoiceNumber: payload.invoiceNumber });
          if (!existingBill) {
            await Bill.create({ ...payload, syncStatus: 'SYNCED', isOfflineCreated: true });
          }

          // Safely synchronize stock deduction in MongoDB without blind overwrite!
          for (const item of payload.items) {
            await Medicine.findOneAndUpdate(
              { id: item.medicineId },
              { $inc: { quantity: -item.quantity } }
            );
          }
        } else if (operation === 'DEDUCT_STOCK') {
          // Safe stock operation sync
          await Medicine.findOneAndUpdate(
            { id: payload.medicineId },
            { $inc: { quantity: -payload.quantity } }
          );
        } else if (operation === 'ADD_STOCK') {
          await Medicine.findOneAndUpdate(
            { id: payload.medicineId },
            { $inc: { quantity: payload.quantity } }
          );
        } else if (operation === 'CREATE_MEDICINE') {
          const existingMed = await Medicine.findOne({ id: payload.id });
          if (!existingMed) {
            await Medicine.create(payload);
          }
        } else if (operation === 'UPDATE_MEDICINE') {
          await Medicine.findOneAndUpdate({ id: payload.id }, payload, { upsert: true });
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

        // Update status in Local Queue
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

    // Save updated queue back to local storage
    LocalStore.saveSyncQueue(currentQueue);

    // Also update bills' sync status in local store
    const localBills = LocalStore.getBills();
    localBills.forEach((b: any) => {
      if (b.isOfflineCreated && b.syncStatus !== 'SYNCED') {
        b.syncStatus = 'SYNCED';
      }
    });
    LocalStore.saveBills(localBills);

    return res.json({
      success: true,
      message: `Synchronization complete. ${syncedCount} items synced, ${failedCount} failed.`,
      syncedCount,
      failedCount,
      remainingPending: currentQueue.filter((q: any) => q.status === 'PENDING').length
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
