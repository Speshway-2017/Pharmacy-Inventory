import React, { useState } from 'react';
import { Medicine } from '../../../shared/types';
import { apiService } from '../services/api';
import { X, Save, Barcode } from 'lucide-react';

interface MedicineFormModalProps {
  medicine?: Medicine | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const MedicineFormModal: React.FC<MedicineFormModalProps> = ({ medicine, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: medicine?.name || '',
    genericName: medicine?.genericName || '',
    category: medicine?.category || 'Tablet / Capsule',
    manufacturer: medicine?.manufacturer || 'Cipla Ltd',
    batchNumber: medicine?.batchNumber || '',
    expiryDate: medicine?.expiryDate || '2027-12-31',
    mrp: medicine?.mrp !== undefined ? medicine.mrp : '',
    sellingPrice: medicine?.sellingPrice !== undefined ? medicine.sellingPrice : '',
    quantity: medicine?.quantity !== undefined ? medicine.quantity : '',
    reorderLevel: medicine?.reorderLevel !== undefined ? medicine.reorderLevel : 10,
    barcode: medicine?.barcode || ''
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const generateBarcode = () => {
    const code = `${Math.floor(8900000000000 + Math.random() * 99999999999)}`;
    setFormData(prev => ({ ...prev, barcode: code }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.batchNumber || !formData.expiryDate || formData.sellingPrice === '' || formData.quantity === '') {
      setError('Please fill in all mandatory fields.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (medicine?.id) {
        await apiService.updateMedicine(medicine.id, formData as any);
      } else {
        await apiService.addMedicine(formData as any);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save medicine.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3 style={{ fontSize: '16px', fontWeight: 700 }}>
            {medicine ? 'Edit Medicine Record' : 'Add New Medicine to Inventory'}
          </h3>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div style={{ background: '#FEE2E2', color: '#DC2626', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Medicine Name *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Paracetamol 500mg"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Generic Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Acetaminophen"
                  value={formData.genericName}
                  onChange={e => setFormData({ ...formData, genericName: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select
                  className="form-control"
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="Tablet / Capsule">Tablet / Capsule</option>
                  <option value="Syrup / Liquid">Syrup / Liquid</option>
                  <option value="Injection">Injection</option>
                  <option value="Ointment / Cream">Ointment / Cream</option>
                  <option value="Antibiotic">Antibiotic</option>
                  <option value="Analgesic">Analgesic</option>
                  <option value="Supplements">Supplements</option>
                  <option value="General">General</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Manufacturer</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Cipla Ltd"
                  value={formData.manufacturer}
                  onChange={e => setFormData({ ...formData, manufacturer: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Batch Number *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. PCM-2026-A1"
                  value={formData.batchNumber}
                  onChange={e => setFormData({ ...formData, batchNumber: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Expiry Date *</label>
                <input
                  type="date"
                  className="form-control"
                  value={formData.expiryDate}
                  onChange={e => setFormData({ ...formData, expiryDate: e.target.value })}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">MRP (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-control"
                  placeholder="0.00"
                  value={formData.mrp}
                  onChange={e => setFormData({ ...formData, mrp: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Selling Price (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-control"
                  placeholder="0.00"
                  value={formData.sellingPrice}
                  onChange={e => setFormData({ ...formData, sellingPrice: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Stock Quantity *</label>
                <input
                  type="number"
                  className="form-control"
                  placeholder="0"
                  value={formData.quantity}
                  onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Reorder Level (Alert Threshold)</label>
                <input
                  type="number"
                  className="form-control"
                  value={formData.reorderLevel}
                  onChange={e => setFormData({ ...formData, reorderLevel: Number(e.target.value) || 0 })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Barcode / SKU</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Barcode number"
                    value={formData.barcode}
                    onChange={e => setFormData({ ...formData, barcode: e.target.value })}
                  />
                  <button type="button" className="btn btn-secondary" onClick={generateBarcode} title="Generate Barcode">
                    <Barcode size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <Save size={16} />
              <span>{loading ? 'Saving...' : 'Save Medicine'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
