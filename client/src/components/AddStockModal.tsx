import React, { useState } from 'react';
import { Medicine } from '../../../shared/types';
import { apiService } from '../services/api';
import { X, PlusCircle, Calendar, PackageCheck, AlertCircle, RefreshCw } from 'lucide-react';

interface AddStockModalProps {
  medicine: Medicine;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddStockModal: React.FC<AddStockModalProps> = ({ medicine, onClose, onSuccess }) => {
  const unitsPerPkg = Math.max(1, medicine.unitsPerPackage || 1);

  const generateBatchNumber = (): string => {
    const year = new Date().getFullYear();
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `BTC-${year}-${rand}`;
  };

  const [batchNumber, setBatchNumber] = useState<string>(medicine.batchNumber || generateBatchNumber());
  const [expiryDate, setExpiryDate] = useState<string>(medicine.expiryDate || '');
  const [packageQty, setPackageQty] = useState<number | ''>(10);
  const [looseQty, setLooseQty] = useState<number | ''>(0);
  const [mrp, setMrp] = useState<number | ''>(medicine.mrp || '');
  const [sellingPrice, setSellingPrice] = useState<number | ''>(medicine.sellingPrice || '');
  const [reason, setReason] = useState<string>('New Stock Shipment');

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const calculatedAddedBaseUnits = (Number(packageQty || 0) * unitsPerPkg) + Number(looseQty || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (calculatedAddedBaseUnits <= 0) {
      setError('Please enter a valid stock quantity to add.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await apiService.addStockToMedicine(medicine.id, {
        batchNumber: batchNumber.trim(),
        expiryDate,
        packageQuantity: Number(packageQty || 0),
        looseQuantity: Number(looseQty || 0),
        mrp: mrp === '' ? undefined : Number(mrp),
        sellingPrice: sellingPrice === '' ? undefined : Number(sellingPrice),
        reason
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Stock addition failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '520px' }}>
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PlusCircle size={18} color="var(--primary-teal)" />
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Add New Stock Shipment</h3>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onClose} style={{ padding: '4px 8px' }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Modal Body */}
          <div className="modal-body">
            {/* Medicine Summary Header */}
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '12px 16px', borderRadius: '10px', marginBottom: '16px' }}>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#0F766E' }}>{medicine.name}</div>
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px', display: 'flex', justifyContent: 'space-between' }}>
                <span>Code: <strong style={{ fontFamily: 'monospace' }}>{medicine.code || medicine.id}</strong></span>
                <span>Current Stock: <strong>{medicine.quantity} base units</strong></span>
              </div>
            </div>

            {error && (
              <div style={{ background: '#FEE2E2', color: '#DC2626', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Batch & Expiry Entry */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Batch Number *</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    type="text"
                    className="form-control"
                    style={{ fontFamily: 'monospace', fontWeight: 600 }}
                    value={batchNumber}
                    onChange={e => setBatchNumber(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setBatchNumber(generateBatchNumber())}
                    title="Generate New Batch"
                    style={{ padding: '0 8px' }}
                  >
                    <RefreshCw size={13} />
                  </button>
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Expiry Date *</label>
                <input
                  type="date"
                  className="form-control"
                  value={expiryDate}
                  onChange={e => setExpiryDate(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Stock Addition Entry */}
            <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '12px 14px', borderRadius: '8px', marginBottom: '14px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#1E40AF', marginBottom: '8px' }}>
                Incoming Stock Quantities
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '11px' }}>Full {medicine.packageType || 'Strip'}s</label>
                  <input
                    type="number"
                    min="0"
                    className="form-control"
                    placeholder="0"
                    value={packageQty}
                    onChange={e => setPackageQty(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))}
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ fontSize: '11px' }}>Loose {medicine.looseUnitName || 'Tablet'}s</label>
                  <input
                    type="number"
                    min="0"
                    className="form-control"
                    placeholder="0"
                    value={looseQty}
                    onChange={e => setLooseQty(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))}
                    disabled={medicine.sellingMode === 'FULL_PACKAGE_ONLY'}
                  />
                </div>
              </div>

              <div style={{ marginTop: '8px', fontSize: '12px', color: '#1E40AF', fontWeight: 700 }}>
                Incoming Total: +{calculatedAddedBaseUnits} base {medicine.looseUnitName?.toLowerCase() || 'tablet'}s
                <span style={{ fontWeight: 400, color: '#475569', marginLeft: '6px' }}>
                  (New Total: {medicine.quantity + calculatedAddedBaseUnits})
                </span>
              </div>
            </div>

            {/* Pricing Adjustments if required */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">MRP (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-control"
                  value={mrp}
                  onChange={e => setMrp(e.target.value === '' ? '' : Number(e.target.value))}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Selling Price (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-control"
                  value={sellingPrice}
                  onChange={e => setSellingPrice(e.target.value === '' ? '' : Number(e.target.value))}
                />
              </div>
            </div>

            {/* Reason Notes */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Stock Addition Notes / Supplier Invoice</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Supplier Invoice #8821 / Direct Stock Arrival"
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
              <PlusCircle size={16} />
              <span>{loading ? 'Adding Stock...' : 'Confirm Stock Addition'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
