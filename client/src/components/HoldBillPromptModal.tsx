import React, { useState, useEffect, useRef } from 'react';
import { Pause, X, User } from 'lucide-react';

interface HoldBillPromptModalProps {
  itemCount: number;
  subtotal: number;
  onConfirm: (customerNameNote?: string) => void;
  onClose: () => void;
}

export const HoldBillPromptModal: React.FC<HoldBillPromptModalProps> = ({
  itemCount,
  subtotal,
  onConfirm,
  onClose
}) => {
  const [customerName, setCustomerName] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(customerName.trim() || undefined);
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
        zIndex: 1100,
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
          maxWidth: '460px',
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
                Hold Current Bill
              </h3>
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                {itemCount} line items • ₹{subtotal.toFixed(2)} total
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

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div style={{ padding: '20px 24px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 700,
                color: '#334155',
                marginBottom: '8px'
              }}
            >
              Customer Name or Note (Optional):
            </label>

            <div style={{ position: 'relative' }}>
              <User size={16} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '12px' }} />
              <input
                ref={inputRef}
                type="text"
                className="form-control"
                style={{ paddingLeft: '38px', height: '42px', fontSize: '14px', borderRadius: '10px' }}
                placeholder="e.g. Rahul / Token #12 / Waiting for syrup"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>

            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '10px', lineHeight: 1.4 }}>
              Putting this bill on hold clears the active counter so you can bill other customers. You can resume this bill anytime from the <strong>Held Bills</strong> manager.
            </div>
          </div>

          {/* Footer Buttons */}
          <div
            style={{
              padding: '14px 24px',
              borderTop: '1px solid #E2E8F0',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              background: '#F8FAFC'
            }}
          >
            <button type="button" className="btn btn-secondary" onClick={onClose} style={{ borderRadius: '8px' }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ borderRadius: '8px', background: '#D97706', borderColor: '#D97706' }}>
              <Pause size={16} />
              <span>Put Bill on Hold</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
