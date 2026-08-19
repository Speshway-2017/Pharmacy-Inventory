import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useSync } from '../context/SyncContext';
import { RefreshCw, LogOut, Wifi, WifiOff } from 'lucide-react';

interface TopHeaderProps {
  title: string;
}

export const TopHeader: React.FC<TopHeaderProps> = ({ title }) => {
  const { user, logout } = useAuth();
  const { isOnline, pendingSyncCount, isSyncing, triggerSync } = useSync();

  return (
    <header className="top-header">
      <h1 className="page-title">{title}</h1>

      <div className="header-right">
        {/* Connection & Sync Status Indicator */}
        <div className={`status-badge ${isOnline ? 'online' : 'offline'}`}>
          {isOnline ? (
            <>
              <Wifi size={14} />
              <span>🟢 Online</span>
              {pendingSyncCount > 0 && (
                <span style={{ fontSize: '11px', opacity: 0.9 }}>
                  ({pendingSyncCount} syncing...)
                </span>
              )}
            </>
          ) : (
            <>
              <WifiOff size={14} />
              <span>🟠 Offline</span>
              {pendingSyncCount > 0 ? (
                <span>— {pendingSyncCount} pending sync</span>
              ) : (
                <span>— Data saved locally</span>
              )}
            </>
          )}
        </div>

        {/* Sync Trigger Button */}
        {pendingSyncCount > 0 && isOnline && (
          <button
            className="btn btn-secondary btn-sm"
            onClick={triggerSync}
            disabled={isSyncing}
            title="Synchronize offline transactions now"
          >
            <RefreshCw size={13} className={isSyncing ? 'spin' : ''} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
          </button>
        )}

        {/* User Info & Logout */}
        <div className="user-profile">
          <div className="user-avatar">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 600, fontSize: '13px', lineHeight: 1.2 }}>
              {user?.name || 'Pharmacy Admin'}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Pharmacy Administrator
            </span>
          </div>

          <button
            className="btn btn-secondary btn-sm"
            onClick={logout}
            style={{ marginLeft: '8px', padding: '4px 8px' }}
            title="Logout"
          >
            <LogOut size={14} color="var(--text-secondary)" />
          </button>
        </div>
      </div>
    </header>
  );
};
