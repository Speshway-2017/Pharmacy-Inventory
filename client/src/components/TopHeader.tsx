import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSync } from '../context/SyncContext';
import { RefreshCw, LogOut, Wifi, WifiOff, AlertCircle, CloudUpload, CloudDownload, CheckCircle2 } from 'lucide-react';

interface TopHeaderProps {
  title: string;
}

export const TopHeader: React.FC<TopHeaderProps> = ({ title }) => {
  const { user, logout } = useAuth();
  const { isOnline, pendingSyncCount, isSyncing, isBackingUp, isRestoring, triggerSync, backupToCloud, restoreFromCloud } = useSync();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState<boolean>(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState<boolean>(false);
  const [statusModal, setStatusModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    type: 'success' | 'error';
    stats?: any;
  } | null>(null);

  const handleBackup = async () => {
    if (!isOnline) {
      setStatusModal({
        show: true,
        type: 'error',
        title: 'Offline Mode',
        message: 'Cannot perform cloud backup while offline. Please check your internet connection or cloud settings.'
      });
      return;
    }
    try {
      const res = await backupToCloud();
      if (res?.success) {
        setStatusModal({
          show: true,
          type: 'success',
          title: 'Cloud Backup Successful',
          message: 'All local medicines, bills, categories, and settings have been safely uploaded and synchronized to your registered cloud database.',
          stats: res.stats
        });
      } else {
        setStatusModal({
          show: true,
          type: 'error',
          title: 'Backup Incomplete',
          message: res?.message || 'Cloud backup failed. Please check server logs.'
        });
      }
    } catch (err: any) {
      setStatusModal({
        show: true,
        type: 'error',
        title: 'Backup Failed',
        message: err?.response?.data?.message || err?.message || 'Failed to connect to cloud database.'
      });
    }
  };

  const handleRestore = async () => {
    setShowRestoreConfirm(false);
    if (!isOnline) {
      setStatusModal({
        show: true,
        type: 'error',
        title: 'Offline Mode',
        message: 'Cannot restore from cloud database while offline. Please connect to the internet.'
      });
      return;
    }
    try {
      const res = await restoreFromCloud();
      if (res?.success) {
        setStatusModal({
          show: true,
          type: 'success',
          title: 'Cloud Restore Complete',
          message: 'Successfully retrieved all cloud records and refreshed local inventory, bills, and settings.',
          stats: res.stats
        });
      } else {
        setStatusModal({
          show: true,
          type: 'error',
          title: 'Restore Incomplete',
          message: res?.message || 'Cloud restore could not be completed.'
        });
      }
    } catch (err: any) {
      setStatusModal({
        show: true,
        type: 'error',
        title: 'Restore Failed',
        message: err?.response?.data?.message || err?.message || 'Failed to retrieve data from cloud database.'
      });
    }
  };

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

        {/* Cloud Backup Button */}
        <button
          className="btn btn-secondary btn-sm"
          onClick={handleBackup}
          disabled={isBackingUp || isRestoring || isSyncing}
          title={isOnline ? 'Upload all local data to registered cloud database' : 'Cloud database unavailable while offline'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '12px',
            border: '1px solid #CBD5E1',
            background: isBackingUp ? '#F0FDFA' : '#FFFFFF',
            color: '#0F766E',
            cursor: isOnline && !isBackingUp && !isRestoring ? 'pointer' : 'not-allowed',
            opacity: isOnline ? 1 : 0.6
          }}
        >
          <CloudUpload size={14} className={isBackingUp ? 'spin' : ''} color="#0F766E" />
          <span>{isBackingUp ? 'Backing up...' : 'Backup'}</span>
        </button>

        {/* Cloud Restore Button */}
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => {
            if (!isOnline) {
              setStatusModal({
                show: true,
                type: 'error',
                title: 'Offline Mode',
                message: 'Cannot restore from cloud database while offline. Please connect to the internet.'
              });
              return;
            }
            setShowRestoreConfirm(true);
          }}
          disabled={isBackingUp || isRestoring || isSyncing}
          title={isOnline ? 'Restore all cloud database records into application' : 'Cloud database unavailable while offline'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '12px',
            border: '1px solid #CBD5E1',
            background: isRestoring ? '#EFF6FF' : '#FFFFFF',
            color: '#2563EB',
            cursor: isOnline && !isBackingUp && !isRestoring ? 'pointer' : 'not-allowed',
            opacity: isOnline ? 1 : 0.6
          }}
        >
          <CloudDownload size={14} className={isRestoring ? 'spin' : ''} color="#2563EB" />
          <span>{isRestoring ? 'Restoring...' : 'Restore'}</span>
        </button>

        {/* Sync Trigger Button */}
        {pendingSyncCount > 0 && (
          <button
            className="btn btn-secondary btn-sm"
            onClick={triggerSync}
            disabled={isSyncing || isBackingUp || isRestoring}
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

      {/* Cloud Restore Confirmation Modal */}
      {showRestoreConfirm && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: '440px', padding: '24px', textAlign: 'center' }}>
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                background: '#DBEAFE',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto'
              }}
            >
              <CloudDownload size={26} color="#2563EB" />
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>
              Restore from Cloud Database?
            </h3>

            <p style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.5, marginBottom: '16px' }}>
              This will retrieve all medicines, bills, categories, and settings from your registered MongoDB cloud database into the application.
            </p>

            <div
              style={{
                background: '#FEF3C7',
                border: '1px solid #FCD34D',
                borderRadius: '8px',
                padding: '10px 14px',
                marginBottom: '24px',
                textAlign: 'left',
                fontSize: '12px',
                color: '#92400E',
                display: 'flex',
                gap: '8px',
                alignItems: 'flex-start'
              }}
            >
              <AlertCircle size={16} color="#B45309" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Notice:</strong> Your local application storage will be refreshed with the cloud records.
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setShowRestoreConfirm(false)}
                style={{ flex: 1, padding: '10px 16px', fontWeight: 600 }}
                disabled={isRestoring}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleRestore}
                disabled={isRestoring}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  fontWeight: 700,
                  background: '#2563EB',
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
                <CloudDownload size={16} className={isRestoring ? 'spin' : ''} />
                <span>{isRestoring ? 'Restoring...' : 'Yes, Restore All'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cloud Operation Status & Result Modal */}
      {statusModal && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: '440px', padding: '24px', textAlign: 'center' }}>
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                background: statusModal.type === 'success' ? '#D1FAE5' : '#FEE2E2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto'
              }}
            >
              {statusModal.type === 'success' ? (
                <CheckCircle2 size={26} color="#059669" />
              ) : (
                <AlertCircle size={26} color="#DC2626" />
              )}
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', marginBottom: '8px' }}>
              {statusModal.title}
            </h3>

            <p style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.5, marginBottom: statusModal.stats ? '16px' : '24px' }}>
              {statusModal.message}
            </p>

            {statusModal.stats && (
              <div
                style={{
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  marginBottom: '24px',
                  textAlign: 'left',
                  fontSize: '12px',
                  color: '#334155'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span>Medicines:</span>
                  <strong>{statusModal.stats.medicines ?? 0} items</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span>Sales Bills:</span>
                  <strong>{statusModal.stats.bills ?? 0} records</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span>Categories:</span>
                  <strong>{statusModal.stats.categories ?? 0} categories</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Stock Movements:</span>
                  <strong>{statusModal.stats.stockMovements ?? 0} logs</strong>
                </div>
              </div>
            )}

            <button
              className="btn btn-primary"
              onClick={() => setStatusModal(null)}
              style={{
                width: '100%',
                padding: '10px 16px',
                fontWeight: 700,
                background: 'var(--primary, #0F766E)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
