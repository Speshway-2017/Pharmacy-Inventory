import React from 'react';
import { LogOut, X, AlertTriangle } from 'lucide-react';

interface ExitConfirmModalProps {
  onClose: () => void;
  onConfirmExit: () => void;
}

export const ExitConfirmModal: React.FC<ExitConfirmModalProps> = ({ onClose, onConfirmExit }) => {
  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '440px' }}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: '#FEF3C7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <AlertTriangle size={18} color="#D97706" />
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Confirm System Exit
            </h3>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onClose} style={{ padding: '4px 8px' }}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ padding: '20px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '14px', color: '#334155', lineHeight: 1.5, marginBottom: '8px' }}>
            Are you sure you want to close <strong>Pharmacy Inventory & POS System</strong>?
          </div>
          <div style={{ fontSize: '12px', color: '#64748B' }}>
            Your session state and local data will remain saved.
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ padding: '14px 20px', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={onConfirmExit}
            style={{
              flex: 1,
              background: '#DC2626',
              borderColor: '#DC2626',
              justifyContent: 'center'
            }}
          >
            <LogOut size={16} />
            <span>Yes, Exit App</span>
          </button>
        </div>
      </div>
    </div>
  );
};
