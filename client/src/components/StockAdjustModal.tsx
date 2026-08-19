import React, { useState } from 'react';
import { Medicine } from '../../../shared/types';
import { apiService } from '../services/api';
import { X, Sliders } from 'lucide-react';

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
        <div className="modal-header">
          <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Adjust Stock Quantity</h3>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div style={{ background: '#F1F5F9', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#0F766E' }}>{medicine.name}</div>
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
                Batch: {medicine.batchNumber} | Current Stock: <strong>{medicine.quantity} units</strong>
              </div>
            </div>

            {error && (
              <div style={{ background: '#FEE2E2', color: '#DC2626', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
                {error}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Action</label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                  <input
                    type="radio"
                    name="adjType"
                    checked={adjustmentType === 'ADD'}
                    onChange={() => setAdjustmentType('ADD')}
                  />
                  <span>Add Stock (+)</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                  <input
                    type="radio"
                    name="adjType"
                    checked={adjustmentType === 'DEDUCT'}
                    onChange={() => setAdjustmentType('DEDUCT')}
                  />
                  <span>Deduct Stock (-)</span>
                </label>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Quantity to Adjust *</label>
              <input
                type="number"
                min="1"
                className="form-control"
                value={quantity}
                onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 0))}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Reason / Notes</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. New supplier batch arrived / Damage write-off"
                value={reason}
                onChange={e => setReason(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <Sliders size={16} />
              <span>{loading ? 'Updating...' : 'Confirm Stock Adjustment'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
