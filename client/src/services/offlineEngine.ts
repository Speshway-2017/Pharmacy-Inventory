import { Medicine, Bill, PharmacySettings, SyncTransaction, User } from '../../../shared/types';
import { v4 as uuidv4 } from 'uuid';

declare global {
  interface Window {
    electronAPI?: {
      checkInternet: () => Promise<boolean>;
      printInvoice: (htmlContent: string) => Promise<{ success: boolean; reason?: string }>;
      getPrinters: () => Promise<any[]>;
      readLocalJson: (filename: string) => Promise<any>;
      writeLocalJson: (filename: string, data: any) => Promise<boolean>;
      onConnectivityChange: (callback: (status: boolean) => void) => void;
    };
  }
}

const LOCAL_STORAGE_KEYS = {
  MEDICINES: 'pharmacy_local_medicines',
  BILLS: 'pharmacy_local_bills',
  SETTINGS: 'pharmacy_local_settings',
  SYNC_QUEUE: 'pharmacy_local_sync_queue',
  USER: 'pharmacy_local_user',
  TOKEN: 'pharmacy_local_token'
};

export const OfflineEngine = {
  async isOnline(): Promise<boolean> {
    if (window.electronAPI?.checkInternet) {
      return await window.electronAPI.checkInternet();
    }
    return navigator.onLine;
  },

  async readJson<T>(filename: string, storageKey: string, fallback: T): Promise<T> {
    if (window.electronAPI?.readLocalJson) {
      const data = await window.electronAPI.readLocalJson(filename);
      if (data !== null) return data as T;
    }
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      try {
        return JSON.parse(raw) as T;
      } catch (err) {
        console.error(`Error parsing localStorage key ${storageKey}:`, err);
      }
    }
    return fallback;
  },

  async writeJson<T>(filename: string, storageKey: string, data: T): Promise<boolean> {
    localStorage.setItem(storageKey, JSON.stringify(data));
    if (window.electronAPI?.writeLocalJson) {
      return await window.electronAPI.writeLocalJson(filename, data);
    }
    return true;
  },

  // Queue Offline Transaction for Auto-Synchronization
  async enqueueSyncTransaction(operation: SyncTransaction['operation'], payload: any): Promise<SyncTransaction> {
    const queue = await this.readJson<SyncTransaction[]>('sync-queue.json', LOCAL_STORAGE_KEYS.SYNC_QUEUE, []);
    const tx: SyncTransaction = {
      id: `tx-${Date.now()}`,
      transactionId: `OFFLINE-${operation}-${uuidv4()}`,
      operation,
      payload,
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };
    queue.push(tx);
    await this.writeJson('sync-queue.json', LOCAL_STORAGE_KEYS.SYNC_QUEUE, queue);
    return tx;
  },

  async getPendingSyncCount(): Promise<number> {
    const queue = await this.readJson<SyncTransaction[]>('sync-queue.json', LOCAL_STORAGE_KEYS.SYNC_QUEUE, []);
    return queue.filter(q => q.status === 'PENDING').length;
  }
};
