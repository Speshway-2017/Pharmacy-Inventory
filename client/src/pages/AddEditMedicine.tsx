import React, { useEffect, useState } from 'react';
import { Medicine, Category } from '../../../shared/types';
import { apiService } from '../services/api';
import {
  ArrowLeft,
  Save,
  Barcode,
  Plus,
  Check,
  Pill,
  Calendar,
  IndianRupee,
  Boxes,
  Tag,
  AlertCircle
} from 'lucide-react';

interface AddEditMedicineProps {
  medicineToEdit?: Medicine | null;
  onBack: () => void;
  onSuccess: () => void;
}

export const AddEditMedicine: React.FC<AddEditMedicineProps> = ({
  medicineToEdit,
  onBack,
  onSuccess
}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCatInput, setNewCatInput] = useState<string>('');
  const [showAddCatInput, setShowAddCatInput] = useState<boolean>(false);

  const [formData, setFormData] = useState({
    name: medicineToEdit?.name || '',
    genericName: medicineToEdit?.genericName || '',
    category: medicineToEdit?.category || 'Tablet / Capsule',
    manufacturer: medicineToEdit?.manufacturer || '',
    batchNumber: medicineToEdit?.batchNumber || '',
    expiryDate: medicineToEdit?.expiryDate || '',
    mrp: medicineToEdit?.mrp !== undefined ? medicineToEdit.mrp : '',
    sellingPrice: medicineToEdit?.sellingPrice !== undefined ? medicineToEdit.sellingPrice : '',
    quantity: medicineToEdit?.quantity !== undefined ? medicineToEdit.quantity : '',
    reorderLevel: medicineToEdit?.reorderLevel !== undefined ? medicineToEdit.reorderLevel : 10,
    barcode: medicineToEdit?.barcode || ''
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadCategories = async () => {
    try {
      const res = await apiService.getCategories();
      if (res.success && res.categories) {
        setCategories(res.categories);
        if (!medicineToEdit && res.categories.length > 0 && !formData.category) {
          setFormData(prev => ({ ...prev, category: res.categories[0].name }));
        }
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const generateBarcode = () => {
    const code = `${Math.floor(8900000000000 + Math.random() * 99999999999)}`;
    setFormData(prev => ({ ...prev, barcode: code }));
  };

  const handleAddNewCategory = async () => {
    if (!newCatInput.trim()) return;
    try {
      const res = await apiService.addCategory(newCatInput.trim());
      if (res.success) {
        await loadCategories();
        setFormData(prev => ({ ...prev, category: newCatInput.trim() }));
        setNewCatInput('');
        setShowAddCatInput(false);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to add category');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.batchNumber || !formData.expiryDate || formData.sellingPrice === '' || formData.quantity === '') {
      setError('Please complete all mandatory fields marked with (*).');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (medicineToEdit?.id) {
        await apiService.updateMedicine(medicineToEdit.id, formData as any);
      } else {
        await apiService.addMedicine(formData as any);
      }
      onSuccess();
      onBack();
    } catch (err: any) {
      setError(err.message || 'Failed to save medicine record.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto' }}>
      {/* Redesigned Clean Header Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          background: '#FFFFFF',
          padding: '14px 20px',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onBack}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600 }}
          >
            <ArrowLeft size={16} />
            <span>Back to Inventory</span>
          </button>

          <div style={{ height: '24px', width: '1px', background: '#E2E8F0' }} />

          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {medicineToEdit ? `Edit Record: ${medicineToEdit.name}` : 'New Medicine Registration'}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Configure product attributes, batch tracking, pricing & stock limits
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="badge badge-in-stock" style={{ padding: '6px 12px', fontSize: '12px' }}>
            {medicineToEdit ? 'Editing Mode' : 'New Item Setup'}
          </span>
        </div>
      </div>

      {error && (
        <div
          style={{
            background: '#FEE2E2',
            color: '#DC2626',
            padding: '12px 16px',
            borderRadius: '10px',
            marginBottom: '20px',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            border: '1px solid #FCA5A5'
          }}
        >
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* 2-Column Grid Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', alignItems: 'start' }}>
          
          {/* LEFT COLUMN: Basic Info & Batch Expiry */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Card 1: Basic Information */}
            <div className="table-container" style={{ padding: '20px', background: '#FFFFFF' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid #F1F5F9', paddingBottom: '10px' }}>
                <Pill size={18} color="var(--primary-teal)" />
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Basic Medicine Information</h3>
              </div>

              <div className="form-group">
                <label className="form-label">Medicine Commercial Name *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Paracetamol 500mg, Amoxicillin 250mg..."
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Generic / Composition Name</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Acetaminophen, Azithromycin Dihydrate..."
                  value={formData.genericName}
                  onChange={e => setFormData({ ...formData, genericName: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Category *</label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <select
                      className="form-control"
                      value={formData.category}
                      onChange={e => setFormData({ ...formData, category: e.target.value })}
                    >
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.name}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setShowAddCatInput(!showAddCatInput)}
                      title="Add Custom Category"
                    >
                      <Plus size={16} />
                    </button>
                  </div>

                  {showAddCatInput && (
                    <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="New category..."
                        value={newCatInput}
                        onChange={e => setNewCatInput(e.target.value)}
                      />
                      <button type="button" className="btn btn-primary btn-sm" onClick={handleAddNewCategory}>
                        <Check size={14} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Manufacturer / Brand</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Cipla Ltd, Sun Pharma"
                    value={formData.manufacturer}
                    onChange={e => setFormData({ ...formData, manufacturer: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Card 2: Batch & Expiry */}
            <div className="table-container" style={{ padding: '20px', background: '#FFFFFF' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid #F1F5F9', paddingBottom: '10px' }}>
                <Calendar size={18} color="var(--primary-blue)" />
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Batch & Expiry Tracking</h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Batch Number *</label>
                  <input
                    type="text"
                    className="form-control"
                    style={{ fontFamily: 'monospace', fontWeight: 600 }}
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
            </div>

          </div>

          {/* RIGHT COLUMN: Pricing, Stock & Barcode */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Card 3: Pricing & Stock Limits */}
            <div className="table-container" style={{ padding: '20px', background: '#FFFFFF' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid #F1F5F9', paddingBottom: '10px' }}>
                <IndianRupee size={18} color="#059669" />
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Pricing & Inventory Quantity</h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
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
                    style={{ fontWeight: 700, color: '#0F766E' }}
                    placeholder="0.00"
                    value={formData.sellingPrice}
                    onChange={e => setFormData({ ...formData, sellingPrice: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Initial Stock Qty *</label>
                  <input
                    type="number"
                    className="form-control"
                    style={{ fontWeight: 700 }}
                    placeholder="0"
                    value={formData.quantity}
                    onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Reorder Alert Level</label>
                  <input
                    type="number"
                    className="form-control"
                    value={formData.reorderLevel}
                    onChange={e => setFormData({ ...formData, reorderLevel: Number(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>

            {/* Card 4: Barcode / SKU Code */}
            <div className="table-container" style={{ padding: '20px', background: '#FFFFFF' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid #F1F5F9', paddingBottom: '10px' }}>
                <Barcode size={18} color="#2563EB" />
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Barcode & Identification</h3>
              </div>

              <div className="form-group">
                <label className="form-label">Barcode Number / SKU Code</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className="form-control"
                    style={{ fontFamily: 'monospace', fontWeight: 600 }}
                    placeholder="Scan or generate barcode"
                    value={formData.barcode}
                    onChange={e => setFormData({ ...formData, barcode: e.target.value })}
                  />
                  <button type="button" className="btn btn-secondary" onClick={generateBarcode} title="Generate Barcode">
                    <Barcode size={16} />
                    <span>Generate</span>
                  </button>
                </div>
              </div>

              {formData.barcode && (
                <div
                  style={{
                    background: '#F8FAFC',
                    border: '1px dashed #CBD5E1',
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'center',
                    marginTop: '10px'
                  }}
                >
                  <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '4px' }}>BARCODE PREVIEW</div>
                  <div style={{ fontFamily: 'monospace', fontSize: '16px', fontWeight: 800, letterSpacing: '2px' }}>
                    |||| ||| ||||| {formData.barcode}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Bottom Action Footer Bar */}
        <div
          className="table-container"
          style={{
            marginTop: '20px',
            padding: '16px 20px',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            background: '#FFFFFF'
          }}
        >
          <button type="button" className="btn btn-secondary" onClick={onBack}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
            <Save size={18} />
            <span>{loading ? 'Saving Record...' : medicineToEdit ? 'Update Medicine Record' : 'Save Medicine to Inventory'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
