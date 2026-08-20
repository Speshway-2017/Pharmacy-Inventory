import React, { useEffect, useState } from 'react';
import { Medicine, Category, SellingMode } from '../../../shared/types';
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
  MapPin,
  PackageCheck,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

interface AddEditMedicineProps {
  medicineToEdit?: Medicine | null;
  onBack: () => void;
  onSuccess: () => void;
}

const DOSAGE_FORMS = ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Syringe', 'Bottle', 'Vial', 'Other'];
const PACKAGE_TYPES = ['Strip', 'Bottle', 'Box', 'Pack', 'Vial', 'Blister', 'Other'];

export const AddEditMedicine: React.FC<AddEditMedicineProps> = ({
  medicineToEdit,
  onBack,
  onSuccess
}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCatInput, setNewCatInput] = useState<string>('');
  const [showAddCatInput, setShowAddCatInput] = useState<boolean>(false);

  // Derive initial package & loose quantities if editing existing stock
  const initialUnitsPerPkg = medicineToEdit?.unitsPerPackage || 1;
  const initialBaseQty = medicineToEdit?.quantity || 0;
  const initialPkgQty = Math.floor(initialBaseQty / initialUnitsPerPkg);
  const initialLooseQty = initialBaseQty % initialUnitsPerPkg;

  const [packageQty, setPackageQty] = useState<number | ''>(medicineToEdit ? initialPkgQty : '');
  const [looseQty, setLooseQty] = useState<number | ''>(medicineToEdit ? initialLooseQty : '');

  const generatePermanentCode = (): string => {
    const num = Math.floor(100000 + Math.random() * 900000);
    return `MED-${num}`;
  };

  const generateBatchNumber = (): string => {
    const year = new Date().getFullYear();
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `BTC-${year}-${rand}`;
  };

  const [formData, setFormData] = useState({
    code: medicineToEdit?.code || generatePermanentCode(),
    name: medicineToEdit?.name || '',
    genericName: medicineToEdit?.genericName || '',
    category: medicineToEdit?.category || 'Tablet / Capsule',
    manufacturer: medicineToEdit?.manufacturer || '',
    strength: medicineToEdit?.strength || '',
    dosageForm: medicineToEdit?.dosageForm || 'Tablet',
    packageType: medicineToEdit?.packageType || 'Strip',
    unitsPerPackage: medicineToEdit?.unitsPerPackage !== undefined ? medicineToEdit.unitsPerPackage : 10,
    sellingMode: (medicineToEdit?.sellingMode || 'FULL_PACKAGE_ONLY') as SellingMode,
    looseUnitName: medicineToEdit?.looseUnitName || 'Tablet',
    batchNumber: medicineToEdit?.batchNumber || generateBatchNumber(),
    expiryDate: medicineToEdit?.expiryDate || '',
    mrp: medicineToEdit?.mrp !== undefined ? medicineToEdit.mrp : '',
    sellingPrice: medicineToEdit?.sellingPrice !== undefined ? medicineToEdit.sellingPrice : '',
    reorderLevel: medicineToEdit?.reorderLevel !== undefined ? medicineToEdit.reorderLevel : 10,
    barcode: medicineToEdit?.barcode || '',
    rack: medicineToEdit?.rack || '',
    row: medicineToEdit?.row || '',
    column: medicineToEdit?.column || '',
    shelfBin: medicineToEdit?.shelfBin || ''
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
    if (medicineToEdit) {
      const uPerPkg = medicineToEdit.unitsPerPackage || 1;
      const bQty = medicineToEdit.quantity || 0;
      setPackageQty(Math.floor(bQty / uPerPkg));
      setLooseQty(bQty % uPerPkg);
      setFormData({
        code: medicineToEdit.code || generatePermanentCode(),
        name: medicineToEdit.name || '',
        genericName: medicineToEdit.genericName || '',
        category: medicineToEdit.category || 'Tablet / Capsule',
        manufacturer: medicineToEdit.manufacturer || '',
        strength: medicineToEdit.strength || '',
        dosageForm: medicineToEdit.dosageForm || 'Tablet',
        packageType: medicineToEdit.packageType || 'Strip',
        unitsPerPackage: medicineToEdit.unitsPerPackage !== undefined ? medicineToEdit.unitsPerPackage : 10,
        sellingMode: (medicineToEdit.sellingMode || 'FULL_PACKAGE_ONLY') as SellingMode,
        looseUnitName: medicineToEdit.looseUnitName || 'Tablet',
        batchNumber: medicineToEdit.batchNumber || generateBatchNumber(),
        expiryDate: medicineToEdit.expiryDate || '',
        mrp: medicineToEdit.mrp !== undefined ? medicineToEdit.mrp : '',
        sellingPrice: medicineToEdit.sellingPrice !== undefined ? medicineToEdit.sellingPrice : '',
        reorderLevel: medicineToEdit.reorderLevel !== undefined ? medicineToEdit.reorderLevel : 10,
        barcode: medicineToEdit.barcode || '',
        rack: medicineToEdit.rack || '',
        row: medicineToEdit.row || '',
        column: medicineToEdit.column || '',
        shelfBin: medicineToEdit.shelfBin || ''
      });
    }
  }, [medicineToEdit]);

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

  // Calculate total base units
  const unitsPerPkg = Math.max(1, Number(formData.unitsPerPackage) || 1);
  const calculatedTotalBaseUnits = (Number(packageQty || 0) * unitsPerPkg) + Number(looseQty || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.batchNumber || !formData.expiryDate || formData.sellingPrice === '') {
      setError('Please complete all mandatory fields marked with (*).');
      return;
    }

    if (unitsPerPkg < 1) {
      setError('Units per package must be at least 1.');
      return;
    }

    setLoading(true);
    setError(null);

    const payload = {
      ...formData,
      unitsPerPackage: unitsPerPkg,
      quantity: calculatedTotalBaseUnits
    };

    try {
      if (medicineToEdit?.id) {
        await apiService.updateMedicine(medicineToEdit.id, payload as any);
      } else {
        await apiService.addMedicine(payload as any);
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to save medicine record.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto' }}>
      {/* Top Header Card */}
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
              {medicineToEdit ? `Edit Medicine: ${medicineToEdit.name}` : 'New Medicine Registration'}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Configure product details, packaging mode, stock levels, storage rack, and expiry
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="badge badge-in-stock" style={{ padding: '6px 12px', fontSize: '12px' }}>
            {medicineToEdit ? `Code: ${medicineToEdit.code || medicineToEdit.id}` : 'New Item Setup'}
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
          
          {/* LEFT COLUMN: Basic Info, Packaging & Batch/Expiry */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* SECTION 1: Basic Medicine Information */}
            <div className="table-container" style={{ padding: '20px', background: '#FFFFFF' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid #F1F5F9', paddingBottom: '10px' }}>
                <Pill size={18} color="var(--primary-teal)" />
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>1. Basic Identification</h3>
              </div>

              <div className="form-group">
                <label className="form-label">Medicine Commercial Name *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Paracetamol 650mg"
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
                  placeholder="e.g. Acetaminophen"
                  value={formData.genericName}
                  onChange={e => setFormData({ ...formData, genericName: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Strength / Size</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. 650 mg, 100 ml, 5 ml"
                    value={formData.strength}
                    onChange={e => setFormData({ ...formData, strength: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Dosage Form</label>
                  <select
                    className="form-control"
                    value={formData.dosageForm}
                    onChange={e => setFormData({ ...formData, dosageForm: e.target.value })}
                  >
                    {DOSAGE_FORMS.map(form => (
                      <option key={form} value={form}>{form}</option>
                    ))}
                  </select>
                </div>
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

            {/* SECTION 2: Packaging & Selling Configuration */}
            <div className="table-container" style={{ padding: '20px', background: '#FFFFFF' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid #F1F5F9', paddingBottom: '10px' }}>
                <PackageCheck size={18} color="var(--primary-blue)" />
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>2. Packaging & Selling Configuration</h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Package Type</label>
                  <select
                    className="form-control"
                    value={formData.packageType}
                    onChange={e => setFormData({ ...formData, packageType: e.target.value })}
                  >
                    {PACKAGE_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Units Per Package (e.g. 10)</label>
                  <input
                    type="number"
                    min="1"
                    className="form-control"
                    placeholder="e.g. 10"
                    value={formData.unitsPerPackage}
                    onChange={e => setFormData({ ...formData, unitsPerPackage: Math.max(1, parseInt(e.target.value) || 1) })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Selling Mode *</label>
                  <select
                    className="form-control"
                    value={formData.sellingMode}
                    onChange={e => setFormData({ ...formData, sellingMode: e.target.value as SellingMode })}
                  >
                    <option value="FULL_PACKAGE_ONLY">Full Package Only</option>
                    <option value="FULL_PACKAGE_AND_LOOSE">Full Package + Loose Unit</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Loose Unit Name</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Tablet, Capsule, ml"
                    value={formData.looseUnitName}
                    onChange={e => setFormData({ ...formData, looseUnitName: e.target.value })}
                    disabled={formData.sellingMode === 'FULL_PACKAGE_ONLY'}
                  />
                </div>
              </div>
            </div>

            {/* SECTION 4: Batch & Expiry Tracking */}
            <div className="table-container" style={{ padding: '20px', background: '#FFFFFF' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid #F1F5F9', paddingBottom: '10px' }}>
                <Calendar size={18} color="#D97706" />
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>4. Batch & Expiry Details</h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Batch Number *</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      className="form-control"
                      style={{ fontFamily: 'monospace', fontWeight: 600 }}
                      placeholder="e.g. BTC-2026-9182"
                      value={formData.batchNumber}
                      onChange={e => setFormData({ ...formData, batchNumber: e.target.value })}
                      required
                    />
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setFormData(prev => ({ ...prev, batchNumber: generateBatchNumber() }))}
                      title="Generate New Batch Number"
                      style={{ padding: '0 12px' }}
                    >
                      <RefreshCw size={14} />
                      <span>Generate</span>
                    </button>
                  </div>
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

          {/* RIGHT COLUMN: Pricing, Location & Barcode */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* SECTION 3: Pricing & Stock Inventory */}
            <div className="table-container" style={{ padding: '20px', background: '#FFFFFF' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid #F1F5F9', paddingBottom: '10px' }}>
                <IndianRupee size={18} color="#059669" />
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>3. Pricing & Initial Stock</h3>
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

              {/* Stock Quantity in Packages & Loose Units */}
              <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: '8px', marginBottom: '14px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
                  Initial Stock Quantity Entry
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: '11px' }}>Full {formData.packageType}s</label>
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
                    <label className="form-label" style={{ fontSize: '11px' }}>Loose {formData.looseUnitName}s</label>
                    <input
                      type="number"
                      min="0"
                      className="form-control"
                      placeholder="0"
                      value={looseQty}
                      onChange={e => setLooseQty(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))}
                      disabled={formData.sellingMode === 'FULL_PACKAGE_ONLY'}
                    />
                  </div>
                </div>

                <div style={{ marginTop: '10px', fontSize: '12px', color: '#0F766E', fontWeight: 600 }}>
                  Calculated Total Stock: {calculatedTotalBaseUnits} base {formData.looseUnitName.toLowerCase()}s
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Reorder Alert Threshold (Base Units)</label>
                <input
                  type="number"
                  className="form-control"
                  value={formData.reorderLevel}
                  onChange={e => setFormData({ ...formData, reorderLevel: Number(e.target.value) || 0 })}
                />
              </div>
            </div>

            {/* SECTION 5: Physical Pharmacy Storage Location */}
            <div className="table-container" style={{ padding: '20px', background: '#FFFFFF' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid #F1F5F9', paddingBottom: '10px' }}>
                <MapPin size={18} color="#7C3AED" />
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>5. Physical Storage Location</h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Rack</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. A"
                    value={formData.rack}
                    onChange={e => setFormData({ ...formData, rack: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Row</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. 03"
                    value={formData.row}
                    onChange={e => setFormData({ ...formData, row: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Column</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. 05"
                    value={formData.column}
                    onChange={e => setFormData({ ...formData, column: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Shelf / Bin</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. B-12"
                    value={formData.shelfBin}
                    onChange={e => setFormData({ ...formData, shelfBin: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* SECTION 6: Barcode & Identification */}
            <div className="table-container" style={{ padding: '20px', background: '#FFFFFF' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid #F1F5F9', paddingBottom: '10px' }}>
                <Barcode size={18} color="#2563EB" />
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>6. Barcode & Permanent Code</h3>
              </div>

              <div className="form-group">
                <label className="form-label">Permanent Item Code *</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    className="form-control"
                    style={{ fontFamily: 'monospace', fontWeight: 700, background: '#F8FAFC' }}
                    value={formData.code}
                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                    placeholder="e.g. MED-000124"
                    required
                  />
                  {!medicineToEdit && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setFormData(prev => ({ ...prev, code: generatePermanentCode() }))}
                      title="Regenerate Item Code"
                      style={{ padding: '0 12px' }}
                    >
                      <RefreshCw size={14} />
                      <span>Generate</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Barcode / SKU Code</label>
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
