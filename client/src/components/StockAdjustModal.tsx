import React, { useState } from 'react';
import { Medicine } from '../../../shared/types';
import { apiService } from '../services/api';
import { X, Sliders, PlusCircle, MinusCircle, AlertCircle } from 'lucide-react';

interface StockAdjustModalProps {
  medicine: Medicine;
  onClose: () => void;
  onSuccess: () => void;
}

export const StockAdjustModal: React.FC<StockAdjustModalProps> = ({ medicine, onClose, onSuccess }) => {
  const [adjustmentType, setAdjustmentType] = useState<'ADD' | 'DEDUCT'>('ADD');
  const [quantity, setQuantity] = useState<number>(10);
  const [reason, setReason] = useState<string>('New Shipment Stock In');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0) {
      setError('Please enter a valid quantity greater than 0.');
      return;
    }

    const delta = adjustmentType === 'ADD' ? Number(quantity) : -Number(quantity);

    // Business Rule Check: Negative Stock Prevention
    if (medicine.quantity + delta < 0) {
      setError(`Stock cannot become negative! Current stock is ${medicine.quantity}.`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await apiService.adjustStock(medicine.id, delta, reason);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Stock adjustment failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '480px' }}>
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sliders size={18} color="var(--primary-teal)" />
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Adjust Stock Quantity</h3>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onClose} style={{ padding: '4px 8px' }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Modal Body */}
          <div className="modal-body">
            {/* Medicine Summary Info */}
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '14px 16px', borderRadius: '10px', marginBottom: '18px' }}>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#0F766E' }}>{medicine.name}</div>
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '3px', display: 'flex', justifyContent: 'space-between' }}>
                <span>Batch: <strong style={{ fontFamily: 'monospace' }}>{medicine.batchNumber}</strong></span>
                <span>Current Stock: <strong>{medicine.quantity} units</strong></span>
              </div>
            </div>

            {error && (
              <div style={{ background: '#FEE2E2', color: '#DC2626', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Adjustment Type Pill Selector */}
            <div className="form-group">
              <label className="form-label">Select Adjustment Action *</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  className={`btn ${adjustmentType === 'ADD' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ justifyContent: 'center', height: '40px' }}
                  onClick={() => {
                    setAdjustmentType('ADD');
                    if (reason.includes('Damage')) setReason('New Shipment Stock In');
                  }}
                >
                  <PlusCircle size={16} />
                  <span>Add Stock (+)</span>
                </button>
                <button
                  type="button"
                  className={`btn ${adjustmentType === 'DEDUCT' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{
                    justifyContent: 'center',
                    height: '40px',
                    ...(adjustmentType === 'DEDUCT' ? { background: '#DC2626', borderColor: '#DC2626' } : {})
                  }}
                  onClick={() => {
                    setAdjustmentType('DEDUCT');
                    setReason('Damaged / Write-Off / Removal');
                  }}
                >
                  <MinusCircle size={16} />
                  <span>Deduct Stock (-)</span>
                </button>
              </div>
            </div>

            {/* Quantity Input */}
            <div className="form-group">
              <label className="form-label">Quantity to {adjustmentType === 'ADD' ? 'Add' : 'Deduct'} *</label>
              <input
                type="number"
                min="1"
                className="form-control"
                style={{ fontSize: '15px', fontWeight: 600 }}
                value={quantity}
                onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 0))}
                required
              />
            </div>

            {/* Reason Input */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Adjustment Reason / Notes</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. New supplier batch arrived / Damage write-off"
                value={reason}
                onChange={e => setReason(e.target.value)}
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <Sliders size={16} />
              <span>{loading ? 'Updating Stock...' : 'Confirm Stock Adjustment'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
