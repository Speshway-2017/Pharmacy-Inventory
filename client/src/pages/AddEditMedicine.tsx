import React, { useEffect, useState, useMemo, useRef } from 'react';
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
  RefreshCw,
  Sparkles,
  Layers,
  Search,
  ChevronDown
} from 'lucide-react';

interface AddEditMedicineProps {
  medicineToEdit?: Medicine | null;
  onBack: () => void;
  onSuccess: () => void;
}

const DOSAGE_FORMS = ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Syringe', 'Bottle', 'Vial', 'Other'];
const PACKAGE_TYPES = ['Strip', 'Bottle', 'Box', 'Pack', 'Vial', 'Blister', 'Other'];

interface ComboboxInputProps {
  label: string;
  placeholder: string;
  value: string;
  options: string[];
  onChange: (val: string) => void;
  onSelectOption?: (val: string) => void;
}

const ComboboxInput: React.FC<ComboboxInputProps> = ({
  label,
  placeholder,
  value,
  options,
  onChange,
  onSelectOption
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="form-group" style={{ position: 'relative' }} ref={containerRef}>
      <label className="form-label">{label}</label>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          type="text"
          className="form-control"
          placeholder={placeholder}
          value={value}
          onChange={e => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          style={{ paddingRight: '36px' }}
        />
        {options.length > 0 && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setIsOpen(prev => !prev)}
            style={{
              position: 'absolute',
              right: '8px',
              background: 'transparent',
              border: 'none',
              color: '#64748B',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <ChevronDown size={16} />
          </button>
        )}
      </div>

      {isOpen && options.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 999,
            background: '#FFFFFF',
            border: '1px solid #CBD5E1',
            borderRadius: '10px',
            boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)',
            marginTop: '4px',
            maxHeight: '180px',
            overflowY: 'auto'
          }}
        >
          <div style={{ padding: '6px 12px', background: '#F8FAFC', fontSize: '11px', fontWeight: 700, color: '#64748B', borderBottom: '1px solid #E2E8F0' }}>
            Select existing or type custom:
          </div>
          {options.map(opt => (
            <div
              key={opt}
              style={{
                padding: '9px 14px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#1E293B',
                cursor: 'pointer',
                borderBottom: '1px solid #F1F5F9',
                background: value.toUpperCase() === opt.toUpperCase() ? '#EEF2FF' : '#FFFFFF'
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(opt);
                if (onSelectOption) onSelectOption(opt);
                setIsOpen(false);
              }}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const AddEditMedicine: React.FC<AddEditMedicineProps> = ({
  medicineToEdit,
  onBack,
  onSuccess
}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [allExistingMedicines, setAllExistingMedicines] = useState<Medicine[]>([]);
  const [showNameSuggestions, setShowNameSuggestions] = useState<boolean>(false);
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

  const loadExistingMedicines = async () => {
    try {
      const res = await apiService.getMedicines();
      if (res.success && res.medicines) {
        setAllExistingMedicines(res.medicines);
      }
    } catch (err) {
      console.error('Failed to load existing medicines for suggestions:', err);
    }
  };

  useEffect(() => {
    loadCategories();
    loadExistingMedicines();
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

  // Location Hierarchy Map (Rack -> Rows, Cols, Bins)
  const locationHierarchy = useMemo(() => {
    const rackMap: Record<string, { rows: Set<string>; cols: Set<string>; bins: Set<string> }> = {};

    allExistingMedicines.forEach(med => {
      const rack = med.rack ? med.rack.trim().toUpperCase() : '';
      if (!rack) return;

      if (!rackMap[rack]) {
        rackMap[rack] = { rows: new Set(), cols: new Set(), bins: new Set() };
      }

      if (med.row) rackMap[rack].rows.add(med.row.trim());
      if (med.column) rackMap[rack].cols.add(med.column.trim());
      if (med.shelfBin) rackMap[rack].bins.add(med.shelfBin.trim());
    });

    return rackMap;
  }, [allExistingMedicines]);

  const availableRacks = useMemo(() => {
    return Object.keys(locationHierarchy).sort();
  }, [locationHierarchy]);

  const availableRowsForRack = useMemo(() => {
    const currentRack = (formData.rack || '').trim().toUpperCase();
    if (currentRack && locationHierarchy[currentRack]) {
      return Array.from(locationHierarchy[currentRack].rows).sort();
    }
    const allRows = new Set<string>();
    allExistingMedicines.forEach(m => { if (m.row) allRows.add(m.row.trim()); });
    return Array.from(allRows).sort();
  }, [formData.rack, locationHierarchy, allExistingMedicines]);

  const availableColsForRack = useMemo(() => {
    const currentRack = (formData.rack || '').trim().toUpperCase();
    if (currentRack && locationHierarchy[currentRack]) {
      return Array.from(locationHierarchy[currentRack].cols).sort();
    }
    const allCols = new Set<string>();
    allExistingMedicines.forEach(m => { if (m.column) allCols.add(m.column.trim()); });
    return Array.from(allCols).sort();
  }, [formData.rack, locationHierarchy, allExistingMedicines]);

  const availableBinsForRack = useMemo(() => {
    const currentRack = (formData.rack || '').trim().toUpperCase();
    if (currentRack && locationHierarchy[currentRack]) {
      return Array.from(locationHierarchy[currentRack].bins).sort();
    }
    const allBins = new Set<string>();
    allExistingMedicines.forEach(m => { if (m.shelfBin) allBins.add(m.shelfBin.trim()); });
    return Array.from(allBins).sort();
  }, [formData.rack, locationHierarchy, allExistingMedicines]);

  // Cascading Rack Selection Handler
  const handleSelectRack = (selectedRack: string) => {
    const rackUpper = selectedRack.trim().toUpperCase();
    const info = locationHierarchy[rackUpper];

    const defaultRow = info && info.rows.size > 0 ? Array.from(info.rows)[0] : '';
    const defaultCol = info && info.cols.size > 0 ? Array.from(info.cols)[0] : '';
    const defaultBin = info && info.bins.size > 0 ? Array.from(info.bins)[0] : '';

    setFormData(prev => ({
      ...prev,
      rack: selectedRack,
      row: defaultRow || prev.row,
      column: defaultCol || prev.column,
      shelfBin: defaultBin || prev.shelfBin
    }));
  };

  // Derived Medicine Commercial Name Suggestions
  const nameSuggestions = useMemo(() => {
    if (!formData.name || formData.name.trim().length < 2) return [];
    const q = formData.name.toLowerCase().trim();
    return allExistingMedicines.filter(m =>
      m.name.toLowerCase().includes(q) ||
      (m.genericName && m.genericName.toLowerCase().includes(q))
    ).slice(0, 6);
  }, [formData.name, allExistingMedicines]);

  // Handle Auto-Fill from Medicine Suggestion
  const handleSelectMedicineSuggestion = (med: Medicine) => {
    // Extract base commercial name (remove strength pattern like "(650mg)")
    const cleanBaseName = med.name.replace(/\s*\([\d\s\w,.-]+\)/, '').trim();

    setFormData(prev => ({
      ...prev,
      name: cleanBaseName || med.name,
      genericName: med.genericName || prev.genericName,
      category: med.category || prev.category,
      manufacturer: med.manufacturer || prev.manufacturer,
      dosageForm: med.dosageForm || prev.dosageForm,
      packageType: med.packageType || prev.packageType,
      unitsPerPackage: med.unitsPerPackage || prev.unitsPerPackage,
      sellingMode: (med.sellingMode || prev.sellingMode) as SellingMode,
      looseUnitName: med.looseUnitName || prev.looseUnitName,
      mrp: med.mrp !== undefined ? med.mrp : prev.mrp,
      sellingPrice: med.sellingPrice !== undefined ? med.sellingPrice : prev.sellingPrice,
      rack: med.rack || prev.rack,
      row: med.row || prev.row,
      column: med.column || prev.column,
      shelfBin: med.shelfBin || prev.shelfBin
    }));
    setShowNameSuggestions(false);
  };

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

              <div className="form-group" style={{ position: 'relative' }}>
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Medicine Commercial Name *</span>
                  {allExistingMedicines.length > 0 && (
                    <span style={{ fontSize: '11px', color: '#6366F1', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 600 }}>
                      <Sparkles size={12} /> Auto-suggest active ({allExistingMedicines.length} in DB)
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Paracetamol 650mg"
                  value={formData.name}
                  onChange={e => {
                    setFormData({ ...formData, name: e.target.value });
                    setShowNameSuggestions(true);
                  }}
                  onFocus={() => setShowNameSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowNameSuggestions(false), 200)}
                  required
                />

                {/* Autocomplete Dropdown List */}
                {showNameSuggestions && nameSuggestions.length > 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      zIndex: 100,
                      background: '#FFFFFF',
                      border: '1px solid #C7D2FE',
                      borderRadius: '10px',
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)',
                      marginTop: '4px',
                      maxHeight: '220px',
                      overflowY: 'auto'
                    }}
                  >
                    <div style={{ padding: '6px 12px', background: '#EEF2FF', fontSize: '11px', fontWeight: 700, color: '#4338CA', borderBottom: '1px solid #E0E7FF' }}>
                      ⚡ Click existing medicine to auto-fill common details:
                    </div>
                    {nameSuggestions.map((med) => (
                      <div
                        key={med.id}
                        style={{
                          padding: '10px 14px',
                          borderBottom: '1px solid #F1F5F9',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          background: '#FFFFFF'
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSelectMedicineSuggestion(med);
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '13px' }}>
                            {med.name} {med.strength ? `(${med.strength})` : ''}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                            Generic: {med.genericName || 'N/A'} • {med.category}
                          </div>
                        </div>
                        <span style={{ fontSize: '11px', background: '#EFF6FF', color: '#2563EB', padding: '3px 8px', borderRadius: '6px', fontWeight: 700, border: '1px solid #BFDBFE' }}>
                          Auto-fill
                        </span>
                      </div>
                    ))}
                  </div>
                )}
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid #F1F5F9', paddingBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MapPin size={18} color="#7C3AED" />
                  <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>5. Physical Storage Location</h3>
                </div>
                {availableRacks.length > 0 && (
                  <span style={{ fontSize: '11px', color: '#7C3AED', fontWeight: 600, background: '#F3E8FF', padding: '2px 8px', borderRadius: '6px' }}>
                    ⚡ Cascading Location Auto-Fetch ({availableRacks.length} Racks)
                  </span>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                {/* Single Combined Rack Input + Dropdown */}
                <ComboboxInput
                  label="Rack"
                  placeholder="Type rack (e.g. A, B, C, P)..."
                  value={formData.rack}
                  options={availableRacks}
                  onChange={val => setFormData(prev => ({ ...prev, rack: val }))}
                  onSelectOption={handleSelectRack}
                />

                {/* Single Combined Row Input + Dropdown */}
                <ComboboxInput
                  label={`Row ${formData.rack ? `(for Rack ${formData.rack.toUpperCase()})` : ''}`}
                  placeholder="Type row (e.g. 01, 02, 03)..."
                  value={formData.row}
                  options={availableRowsForRack}
                  onChange={val => setFormData(prev => ({ ...prev, row: val }))}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                {/* Single Combined Column Input + Dropdown */}
                <ComboboxInput
                  label={`Column ${formData.rack ? `(for Rack ${formData.rack.toUpperCase()})` : ''}`}
                  placeholder="Type column (e.g. 01, 05)..."
                  value={formData.column}
                  options={availableColsForRack}
                  onChange={val => setFormData(prev => ({ ...prev, column: val }))}
                />

                {/* Single Combined Shelf / Bin Input + Dropdown */}
                <ComboboxInput
                  label={`Shelf / Bin ${formData.rack ? `(for Rack ${formData.rack.toUpperCase()})` : ''}`}
                  placeholder="Type bin (e.g. C-1, P-1, B-12)..."
                  value={formData.shelfBin}
                  options={availableBinsForRack}
                  onChange={val => setFormData(prev => ({ ...prev, shelfBin: val }))}
                />
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
