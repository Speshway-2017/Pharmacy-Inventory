import React from 'react';
import { HeldBill } from '../../../shared/types';
import { Pause, Play, Trash2, X, Clock, User, ShoppingBag } from 'lucide-react';

interface HeldBillsModalProps {
  heldBills: HeldBill[];
  onClose: () => void;
  onResume: (heldBillId: string) => void;
  onDelete: (heldBillId: string) => void;
  onClearAll?: () => void;
}

export const HeldBillsModal: React.FC<HeldBillsModalProps> = ({
  heldBills,
  onClose,
  onResume,
  onDelete,
  onClearAll
}) => {
  const formatTimeAgo = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

      if (diffSec < 60) return 'Just now';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)} min ago`;
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoString;
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '620px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#F8FAFC'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: '#FEF3C7',
                color: '#D97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Pause size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0F172A' }}>
                Held Bills Manager
              </h3>
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                {heldBills.length} {heldBills.length === 1 ? 'sale' : 'sales'} currently on hold
              </div>
            </div>
          </div>

          <button
            className="btn btn-secondary btn-sm"
            style={{ padding: '6px', borderRadius: '8px' }}
            onClick={onClose}
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '16px 24px', flex: 1, overflowY: 'auto' }}>
          {heldBills.length === 0 ? (
            <div style={{ padding: '50px 20px', textAlign: 'center', color: '#94A3B8' }}>
              <ShoppingBag size={42} color="#CBD5E1" style={{ marginBottom: '12px' }} />
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#475569' }}>
                No Bills on Hold
              </div>
              <div style={{ fontSize: '12.5px', color: '#64748B', marginTop: '4px' }}>
                Click "Hold Bill" on the POS counter to pause any active customer sale.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {heldBills.map((held) => {
                const totalItemTypes = held.cart.length;
                const totalItemsCount = held.cart.reduce((sum, item) => sum + (item.packageQuantity || 0) + (item.looseQuantity || 0), 0);

                return (
                  <div
                    key={held.id}
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      borderRadius: '12px',
                      padding: '16px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px'
                    }}
                  >
                    {/* Top Row: Customer / Token Info & Hold Time */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            fontFamily: 'monospace',
                            color: '#D97706',
                            background: '#FEF3C7',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            border: '1px solid #FDE68A'
                          }}
                        >
                          HOLD #{held.id.slice(-4).toUpperCase()}
                        </span>

                        {held.customerName ? (
                          <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <User size={13} color="#2563EB" />
                            {held.customerName}
                          </span>
                        ) : (
                          <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748B' }}>
                            Walk-in Customer
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '11.5px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={13} />
                        <span>{formatTimeAgo(held.heldAt)}</span>
                      </div>
                    </div>

                    {/* Middle Row: Items Summary */}
                    <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                        Cart Contents ({totalItemsCount} units across {totalItemTypes} medicines):
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#64748B', lineHeight: 1.4 }}>
                        {held.cart.map((item, idx) => {
                          const parts = [];
                          if (item.packageQuantity > 0) parts.push(`${item.packageQuantity} ${item.packageType || 'Strip'}(s)`);
                          if (item.looseQuantity > 0) parts.push(`${item.looseQuantity} ${item.looseUnitName || 'Tablet'}(s)`);
                          return (
                            <span key={item.medicineId}>
                              <strong style={{ color: '#1E293B' }}>{item.name}</strong> ({parts.join(' + ')})
                              {idx < held.cart.length - 1 ? ' • ' : ''}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* Bottom Row: Amount & Action Buttons */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                      <div>
                        <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F766E' }}>
                          ₹{(Number(held.subtotal) || 0).toFixed(2)}
                        </div>
                        {held.discountPercentage > 0 && (
                          <div style={{ fontSize: '11px', color: '#64748B' }}>
                            Includes {held.discountPercentage}% discount
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ color: '#DC2626', borderColor: '#FCA5A5', gap: '4px' }}
                          onClick={() => onDelete(held.id)}
                          title="Discard held bill"
                        >
                          <Trash2 size={14} />
                          <span>Discard</span>
                        </button>

                        <button
                          className="btn btn-primary btn-sm"
                          style={{ background: '#059669', borderColor: '#059669', gap: '4px' }}
                          onClick={() => onResume(held.id)}
                          title="Resume billing for this customer"
                        >
                          <Play size={14} />
                          <span>Resume Sale</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#F8FAFC'
          }}
        >
          {heldBills.length > 0 && onClearAll && (
            <button
              className="btn btn-secondary btn-sm"
              style={{ color: '#DC2626', fontSize: '12px' }}
              onClick={onClearAll}
            >
              Clear All Held Bills
            </button>
          )}

          <button className="btn btn-secondary" onClick={onClose} style={{ marginLeft: 'auto', borderRadius: '8px' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
