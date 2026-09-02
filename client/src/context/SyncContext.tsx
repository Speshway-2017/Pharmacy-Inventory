import React, { createContext, useContext, useState, useEffect } from 'react';
import { OfflineEngine } from '../services/offlineEngine';
import { apiService } from '../services/api';

interface SyncContextType {
  isOnline: boolean;
  pendingSyncCount: number;
  isSyncing: boolean;
  triggerSync: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType>({
  isOnline: true,
  pendingSyncCount: 0,
  isSyncing: false,
  triggerSync: async () => {}
});

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const checkConnectivityAndSyncQueue = async () => {
    try {
      const internetAccess = await OfflineEngine.isOnline();

      const statusRes = await apiService.getSyncStatus();
      const dbOnline = statusRes?.success ? statusRes.isOnline : false;
      const count = statusRes?.pendingCount !== undefined ? statusRes.pendingCount : await OfflineEngine.getPendingSyncCount();

      const currentlyOnline = internetAccess && (statusRes?.success ? (dbOnline ?? true) : false);

      setIsOnline(currentlyOnline);
      setPendingSyncCount(count);

      if (currentlyOnline && count > 0 && !isSyncing) {
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
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await apiService.triggerSync();
      const statusRes = await apiService.getSyncStatus();
      const newCount = statusRes?.pendingCount !== undefined ? statusRes.pendingCount : await OfflineEngine.getPendingSyncCount();
      setPendingSyncCount(newCount);
      if (statusRes?.isOnline !== undefined) {
        setIsOnline(statusRes.isOnline);
      }
    } catch (err) {
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
      triggerSyncHandler();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (window.electronAPI?.onConnectivityChange) {
      window.electronAPI.onConnectivityChange((status) => {
        setIsOnline(status);
        if (status) triggerSyncHandler();
      });
    }

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <SyncContext.Provider
      value={{
        isOnline,
        pendingSyncCount,
        isSyncing,
        triggerSync: triggerSyncHandler
      }}
    >
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = () => useContext(SyncContext);
