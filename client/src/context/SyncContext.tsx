import React, { createContext, useContext, useState, useEffect } from 'react';
import { OfflineEngine } from '../services/offlineEngine';
import { apiService } from '../services/api';

interface SyncContextType {
  isOnline: boolean;
  pendingSyncCount: number;
  isSyncing: boolean;
  isBackingUp: boolean;
  isRestoring: boolean;
  triggerSync: () => Promise<void>;
  backupToCloud: () => Promise<any>;
  restoreFromCloud: () => Promise<any>;
}

const SyncContext = createContext<SyncContextType>({
  isOnline: true,
  pendingSyncCount: 0,
  isSyncing: false,
  isBackingUp: false,
  isRestoring: false,
  triggerSync: async () => { },
  backupToCloud: async () => null,
  restoreFromCloud: async () => null
});

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isBackingUp, setIsBackingUp] = useState<boolean>(false);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);

  const checkConnectivityAndSyncQueue = async () => {
    try {
      const internetAccess = await OfflineEngine.isOnline();

      const statusRes = await apiService.getSyncStatus();
      const dbOnline = statusRes?.success ? statusRes.isOnline : false;
      const count = statusRes?.pendingCount !== undefined ? statusRes.pendingCount : await OfflineEngine.getPendingSyncCount();

      const currentlyOnline = internetAccess && (statusRes?.success ? (dbOnline ?? true) : false);

      setIsOnline(currentlyOnline);
      setPendingSyncCount(count);

      const token = localStorage.getItem('pharmacy_jwt_token');
      if (currentlyOnline && count > 0 && !isSyncing && token) {
        triggerSyncHandler();
      }
    } catch (err) {
      const internetAccess = await OfflineEngine.isOnline().catch(() => navigator.onLine);
      setIsOnline(internetAccess);
      const count = await OfflineEngine.getPendingSyncCount();
      setPendingSyncCount(count);
    }
  };

  const triggerSyncHandler = async () => {
    const token = localStorage.getItem('pharmacy_jwt_token');
    if (!token) {
      return;
    }
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const syncResult = await apiService.triggerSync();
      if (!syncResult?.success && syncResult?.message?.includes('Authentication required')) {
        return;
      }
      const statusRes = await apiService.getSyncStatus();
      const newCount = statusRes?.pendingCount !== undefined ? statusRes.pendingCount : await OfflineEngine.getPendingSyncCount();
      setPendingSyncCount(newCount);
      if (statusRes?.isOnline !== undefined) {
        setIsOnline(statusRes.isOnline);
      }
    } catch (err: any) {
      if (err?.message?.includes('Authentication required') || err?.response?.status === 401) {
        return;
      }
      console.warn('Sync attempt failed:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    checkConnectivityAndSyncQueue();

    const interval = setInterval(checkConnectivityAndSyncQueue, 10000);

    const handleOnline = () => {
      setIsOnline(true);
      const token = localStorage.getItem('pharmacy_jwt_token');
      if (token) triggerSyncHandler();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (window.electronAPI?.onConnectivityChange) {
      window.electronAPI.onConnectivityChange((status) => {
        setIsOnline(status);
        const token = localStorage.getItem('pharmacy_jwt_token');
        if (status && token) triggerSyncHandler();
      });
    }

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const backupToCloudHandler = async () => {
    if (isBackingUp) return null;
    setIsBackingUp(true);
    try {
      const res = await apiService.backupToCloud();
      setPendingSyncCount(0);
      return res;
    } finally {
      setIsBackingUp(false);
    }
  };

  const restoreFromCloudHandler = async () => {
    if (isRestoring) return null;
    setIsRestoring(true);
    try {
      const res = await apiService.restoreFromCloud();
      setPendingSyncCount(0);
      return res;
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <SyncContext.Provider
      value={{
        isOnline,
        pendingSyncCount,
        isSyncing,
        isBackingUp,
        isRestoring,
        triggerSync: triggerSyncHandler,
        backupToCloud: backupToCloudHandler,
        restoreFromCloud: restoreFromCloudHandler
      }}
    >
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = () => useContext(SyncContext);
