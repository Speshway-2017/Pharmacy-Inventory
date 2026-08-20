import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSync } from '../context/SyncContext';
import { RefreshCw, LogOut, Wifi, WifiOff, AlertCircle } from 'lucide-react';

interface TopHeaderProps {
  title: string;
}

export const TopHeader: React.FC<TopHeaderProps> = ({ title }) => {
  const { user, logout } = useAuth();
  const { isOnline, pendingSyncCount, isSyncing, triggerSync } = useSync();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState<boolean>(false);

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
            onClick={() => setShowLogoutConfirm(true)}
            style={{ marginLeft: '8px', padding: '4px 8px' }}
            title="Logout"
          >
            <LogOut size={14} color="var(--text-secondary)" />
          </button>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: '420px', padding: '24px', textAlign: 'center' }}>
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                background: '#FEE2E2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto'
              }}
            >
              <LogOut size={26} color="#DC2626" />
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>
              Confirm System Logout
            </h3>

            <p style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.5, marginBottom: '24px' }}>
              Are you sure you want to log out of your session? You will need to re-authenticate to access the pharmacy inventory.
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setShowLogoutConfirm(false)}
                style={{ flex: 1, padding: '10px 16px', fontWeight: 600 }}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  logout();
                }}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  fontWeight: 700,
                  background: '#DC2626',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <LogOut size={16} />
                <span>Yes, Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
