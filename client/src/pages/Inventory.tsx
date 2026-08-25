import React, { useState, useEffect } from 'react';
import { Medicine, MedicineStatus, Category } from '../../../shared/types';
import { StockAdjustModal } from '../components/StockAdjustModal';
import { AddStockModal } from '../components/AddStockModal';
import { apiService } from '../services/api';
import {
  Search,
  Plus,
  Edit2,
  Package,
  AlertTriangle,
  Clock,
  CheckCircle2,
  MapPin,
  ChevronDown,
  Trash2,
  ShieldAlert,
  RefreshCw,
  Eye,
  PlusCircle,
  Sliders,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface InventoryProps {
  medicines?: Medicine[];
  categories?: Category[];
  searchTerm?: string;
  setSearchTerm?: (term: string) => void;
  selectedCategory?: string;
  setSelectedCategory?: (cat: string) => void;
  selectedDosageForm?: string;
  setSelectedDosageForm?: (form: string) => void;
  selectedStatus?: string;
  setSelectedStatus?: (status: string) => void;
  onOpenAddEditPage?: (medicine?: Medicine | null) => void;
  onViewMedicineDetails?: (medicine: Medicine) => void;
  fetchMedicines?: () => void;
  isAdmin?: boolean;
}

const DOSAGE_FORMS = [
  'Tablet',
  'Capsule',
  'Syrup',
  'Injection',
  'Ointment',
  'Drops',
  'Inhaler',
  'Powder',
  'Cream',
  'Gel',
  'Lotion',
  'Suspension',
  'Solution'
];

export const Inventory: React.FC<InventoryProps> = ({
  medicines: propMedicines,
  categories: propCategories,
  searchTerm: propSearchTerm,
  setSearchTerm: propSetSearchTerm,
  selectedCategory: propSelectedCategory,
  setSelectedCategory: propSetSelectedCategory,
  selectedDosageForm: propSelectedDosageForm,
  setSelectedDosageForm: propSetSelectedDosageForm,
  selectedStatus: propSelectedStatus,
  setSelectedStatus: propSetSelectedStatus,
  onOpenAddEditPage,
  onViewMedicineDetails,
  fetchMedicines: propFetchMedicines,
  isAdmin = true
}) => {
  // Internal State Fallbacks
  const [internalMedicines, setInternalMedicines] = useState<Medicine[]>([]);
  const [internalCategories, setInternalCategories] = useState<Category[]>([]);
  const [internalSearchTerm, setInternalSearchTerm] = useState<string>('');
  const [internalSelectedCategory, setInternalSelectedCategory] = useState<string>('');
  const [internalSelectedDosageForm, setInternalSelectedDosageForm] = useState<string>('');
  const [internalSelectedStatus, setInternalSelectedStatus] = useState<string>('');

  const [selectedMedicineForAddStock, setSelectedMedicineForAddStock] = useState<Medicine | null>(null);
  const [selectedMedicineForAdjust, setSelectedMedicineForAdjust] = useState<Medicine | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  const loadData = async () => {
    try {
      const resM = await apiService.getMedicines({
        search: propSearchTerm !== undefined ? propSearchTerm : internalSearchTerm,
        category: propSelectedCategory !== undefined ? propSelectedCategory : internalSelectedCategory,
        dosageForm: propSelectedDosageForm !== undefined ? propSelectedDosageForm : internalSelectedDosageForm,
        status: propSelectedStatus !== undefined ? propSelectedStatus : internalSelectedStatus
      });
      if (resM.success && resM.medicines) setInternalMedicines(resM.medicines);

      const resC = await apiService.getCategories();
      if (resC.success && resC.categories) setInternalCategories(resC.categories);
    } catch (err) {
      console.error('Failed to load inventory:', err);
    }
  };

  useEffect(() => {
    if (!propMedicines) {
      loadData();
    }
  }, [propSearchTerm, propSelectedCategory, propSelectedDosageForm, propSelectedStatus]);

  const handleRefresh = () => {
    if (propFetchMedicines) {
      propFetchMedicines();
    } else {
      loadData();
    }
  };

  const medicines = propMedicines || internalMedicines;
  const categories = propCategories || internalCategories;
  const searchTerm = propSearchTerm !== undefined ? propSearchTerm : internalSearchTerm;
  const setSearchTerm = propSetSearchTerm || setInternalSearchTerm;
  const selectedCategory = propSelectedCategory !== undefined ? propSelectedCategory : internalSelectedCategory;
  const setSelectedCategory = propSetSelectedCategory || setInternalSelectedCategory;
  const selectedDosageForm = propSelectedDosageForm !== undefined ? propSelectedDosageForm : internalSelectedDosageForm;
  const setSelectedDosageForm = propSetSelectedDosageForm || setInternalSelectedDosageForm;
  const selectedStatus = propSelectedStatus !== undefined ? propSelectedStatus : internalSelectedStatus;
  const setSelectedStatus = propSetSelectedStatus || setInternalSelectedStatus;

  const handleDeactivate = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to deactivate ${name}?`)) {
      try {
        await apiService.updateMedicine(id, { status: 'INACTIVE' });
        handleRefresh();
      } catch (err) {
        alert('Failed to deactivate medicine.');
      }
    }
  };

  const renderStatusBadge = (status: MedicineStatus) => {
    switch (status) {
      case 'IN_STOCK':
        return (
          <span className="badge badge-in-stock">
            <CheckCircle2 size={12} style={{ marginRight: '4px' }} /> In Stock
          </span>
        );
      case 'LOW_STOCK':
        return (
          <span className="badge badge-low-stock">
            <AlertTriangle size={12} style={{ marginRight: '4px' }} /> Low Stock
          </span>
        );
      case 'EXPIRING':
        return (
          <span className="badge badge-expiring">
            <Clock size={12} style={{ marginRight: '4px' }} /> Expiring
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="badge badge-expired">
            <ShieldAlert size={12} style={{ marginRight: '4px' }} /> Expired
          </span>
        );
      case 'INACTIVE':
        return <span className="badge badge-inactive">Inactive</span>;
      default:
        return <span className="badge badge-inactive">{status}</span>;
    }
  };

  const formatStockDisplay = (med: Medicine) => {
    const unitsPerPkg = Math.max(1, med.unitsPerPackage || 1);
    const pkgQty = Math.floor(med.quantity / unitsPerPkg);
    const looseQty = med.quantity % unitsPerPkg;
    const pkgName = med.packageType || 'Strip';
    const looseName = med.looseUnitName || 'Tablet';

    if (pkgQty > 0 && looseQty > 0) {
      return (
        <div>
          <strong style={{ color: '#0F172A' }}>{pkgQty} {pkgName}s</strong>
          <span style={{ fontSize: '11px', color: '#0F766E', fontWeight: 600, marginLeft: '4px' }}>
            + {looseQty} {looseName}s
          </span>
        </div>
      );
    } else if (pkgQty > 0) {
      return <strong style={{ color: '#0F172A' }}>{pkgQty} {pkgName}s</strong>;
    } else {
      return <strong style={{ color: '#0F172A' }}>{looseQty} {looseName}s</strong>;
    }
  };

  const formatLocation = (med: Medicine) => {
    const locs = [];
    if (med.rack) locs.push(`Rack ${med.rack}`);
    if (med.row) locs.push(`R-${med.row}`);
    if (med.column) locs.push(`C-${med.column}`);
    if (med.shelfBin) locs.push(med.shelfBin);
    if (!locs.length) return <span style={{ color: '#94A3B8', fontSize: '11px' }}>Unassigned</span>;
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 600, background: '#F3E8FF', padding: '4px 10px', borderRadius: '8px', color: '#7E22CE', whiteSpace: 'nowrap' }}>
        <MapPin size={12} color="#9333EA" />
        <span>{locs.join(' → ')}</span>
      </div>
    );
  };

  // Pagination Math
  const totalItems = medicines.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedMedicines = medicines.slice(startIndex, endIndex);

  return (
    <div>
      {/* Header Tools */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.3px' }}>
            Medicine Inventory Directory
          </h2>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '3px' }}>
            Managing <strong style={{ color: 'var(--text-primary)' }}>{medicines.length}</strong> active medicines in database
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={handleRefresh} style={{ borderRadius: '10px', gap: '6px' }}>
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              if (onOpenAddEditPage) onOpenAddEditPage(null);
            }}
            style={{ borderRadius: '10px', gap: '6px' }}
          >
            <Plus size={16} />
            <span>Add New Medicine</span>
          </button>
        </div>
      </div>

      {/* Floating Filter Bar Card */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '14px',
          padding: '14px 18px',
          marginBottom: '18px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center'
        }}
      >
        {/* Search Box */}
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '11px' }} />
          <input
            type="text"
            className="form-control"
            style={{ paddingLeft: '36px', borderRadius: '10px', height: '38px', fontSize: '13px' }}
            placeholder="Search by code (MED-xxx), name, generic, strength, barcode..."
            value={searchTerm}
            onChange={e => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        {/* Category Filter */}
        <div style={{ flex: '1 1 140px', maxWidth: '190px' }}>
          <select
            className="form-control"
            style={{ borderRadius: '10px', height: '38px', fontSize: '13px' }}
            value={selectedCategory}
            onChange={e => {
              setSelectedCategory(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.name}>{cat.name}</option>
            ))}
          </select>
        </div>

        {/* Dosage Form Filter */}
        <div style={{ flex: '1 1 130px', maxWidth: '160px' }}>
          <select
            className="form-control"
            style={{ borderRadius: '10px', height: '38px', fontSize: '13px' }}
            value={selectedDosageForm}
            onChange={e => {
              setSelectedDosageForm(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">All Dosage Forms</option>
            {DOSAGE_FORMS.map((form) => (
              <option key={form} value={form}>{form}</option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div style={{ flex: '1 1 130px', maxWidth: '160px' }}>
          <select
            className="form-control"
            style={{ borderRadius: '10px', height: '38px', fontSize: '13px' }}
            value={selectedStatus}
            onChange={e => {
              setSelectedStatus(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">All Statuses</option>
            <option value="IN_STOCK">In Stock</option>
            <option value="LOW_STOCK">Low Stock</option>
            <option value="EXPIRING">Expiring</option>
            <option value="EXPIRED">Expired</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      {/* Standalone Data Table Card */}
      <div className="table-card-container" style={{ minHeight: '280px' }}>
        {medicines.length === 0 ? (
          <div style={{ padding: '60px 40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <Package size={36} color="#94A3B8" style={{ marginBottom: '10px' }} />
            <div style={{ fontSize: '15px', fontWeight: 600 }}>No medicines found matching criteria.</div>
          </div>
        ) : (
          <table className="data-table" style={{ width: '100%', tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '27%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '15%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '12%' }} />
            </colgroup>
            <thead>
              <tr>
                <th style={{ padding: '12px 14px', textAlign: 'left', whiteSpace: 'nowrap' }}>Medicine Code & Name</th>
                <th style={{ padding: '12px 14px', textAlign: 'left', whiteSpace: 'nowrap' }}>Category & Batch</th>
                <th style={{ padding: '12px 14px', textAlign: 'left', whiteSpace: 'nowrap' }}>Storage Location</th>
                <th style={{ padding: '12px 14px', textAlign: 'left', whiteSpace: 'nowrap' }}>Selling Price</th>
                <th style={{ padding: '12px 14px', textAlign: 'left', whiteSpace: 'nowrap' }}>Stock Units</th>
                <th style={{ padding: '12px 14px', textAlign: 'center', whiteSpace: 'nowrap' }}>Status</th>
                <th style={{ padding: '12px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedMedicines.map((med, rowIndex) => {
                const openUpwards = paginatedMedicines.length > 3 && rowIndex >= paginatedMedicines.length - 2;

                return (
                  <tr
                    key={med.id}
                    onClick={() => {
                      if (onViewMedicineDetails) onViewMedicineDetails(med);
                    }}
                    style={{ cursor: 'pointer' }}
                    title="Click row to view full medicine details"
                  >
                      {/* Code & Name */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563EB', background: '#EFF6FF', padding: '3px 8px', borderRadius: '6px', fontSize: '11.5px', border: '1px solid #BFDBFE', whiteSpace: 'nowrap' }}>
                            {med.code || `MED-${med.id.slice(-6).toUpperCase()}`}
                          </span>
                          <span style={{ fontWeight: 700, color: '#0F172A', fontSize: '14px', whiteSpace: 'nowrap' }}>
                            {med.name} {med.strength ? `(${med.strength})` : ''}
                          </span>
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#64748B', whiteSpace: 'nowrap' }}>
                          {med.genericName} {med.dosageForm ? `• ${med.dosageForm}` : ''} {med.barcode ? `• Barcode: ${med.barcode}` : ''}
                        </div>
                      </td>

                      {/* Category & Batch */}
                      <td style={{ padding: '14px 18px', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 600, color: '#334155', fontSize: '13px' }}>{med.category}</div>
                        <div style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace', marginTop: '2px' }}>
                          Batch: {med.batchNumber} | Exp: {med.expiryDate}
                        </div>
                      </td>

                      {/* Location */}
                      <td style={{ padding: '14px 18px', whiteSpace: 'nowrap' }}>
                        {formatLocation(med)}
                      </td>

                      {/* Selling Price */}
                      <td style={{ padding: '14px 18px', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 800, color: '#0F766E', fontSize: '14.5px' }}>
                          ₹{(Number(med.sellingPrice) || 0).toFixed(2)}
                        </div>
                        <div style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 500 }}>
                          per {med.packageType || 'Strip'}
                        </div>
                      </td>

                      {/* Stock Units */}
                      <td style={{ padding: '14px 18px', whiteSpace: 'nowrap' }}>
                        {formatStockDisplay(med)}
                        <div style={{ fontSize: '10.5px', color: '#64748B' }}>
                          ({med.quantity} base units)
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 18px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                        {renderStatusBadge(med.status)}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '10px 14px', textAlign: 'right', position: 'relative', whiteSpace: 'nowrap' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '5px 10px', fontSize: '11.5px', gap: '4px', fontWeight: 600, borderRadius: '6px', background: '#F1F5F9', border: '1px solid #CBD5E1' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === med.id ? null : med.id);
                          }}
                        >
                          <span>Actions</span>
                          <ChevronDown size={12} />
                        </button>

                        {openMenuId === med.id && (
                          <div
                            style={{
                              position: 'absolute',
                              right: '8px',
                              ...(openUpwards ? { bottom: '38px' } : { top: '38px' }),
                              background: '#FFFFFF',
                              border: '1px solid #CBD5E1',
                              borderRadius: '10px',
                              boxShadow: '0 14px 30px -4px rgba(0,0,0,0.18), 0 4px 10px -2px rgba(0,0,0,0.08)',
                              zIndex: 9999,
                              minWidth: '170px',
                              padding: '6px 0',
                              textAlign: 'left'
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              style={{
                                width: '100%',
                                padding: '8px 14px',
                                border: 'none',
                                background: 'none',
                                textAlign: 'left',
                                fontSize: '12.5px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                color: 'var(--primary-blue)'
                              }}
                              onClick={() => {
                                if (onViewMedicineDetails) onViewMedicineDetails(med);
                                setOpenMenuId(null);
                              }}
                            >
                              <Eye size={14} />
                              <span>View Full Details</span>
                            </button>

                            <button
                              type="button"
                              style={{
                                width: '100%',
                                padding: '8px 14px',
                                border: 'none',
                                background: 'none',
                                textAlign: 'left',
                                fontSize: '12.5px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                color: '#0F766E',
                                borderTop: '1px solid #F1F5F9',
                                marginTop: '2px',
                                paddingTop: '8px'
                              }}
                              onClick={() => {
                                setSelectedMedicineForAddStock(med);
                                setOpenMenuId(null);
                              }}
                            >
                              <PlusCircle size={14} />
                              <span>Add Stock Shipment</span>
                            </button>

                            <button
                              type="button"
                              style={{
                                width: '100%',
                                padding: '8px 14px',
                                border: 'none',
                                background: 'none',
                                textAlign: 'left',
                                fontSize: '12.5px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                color: '#334155'
                              }}
                              onClick={() => {
                                setSelectedMedicineForAdjust(med);
                                setOpenMenuId(null);
                              }}
                            >
                              <Sliders size={14} />
                              <span>Adjust Stock</span>
                            </button>

                            <button
                              type="button"
                              style={{
                                width: '100%',
                                padding: '8px 14px',
                                border: 'none',
                                background: 'none',
                                textAlign: 'left',
                                fontSize: '12.5px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                color: '#334155'
                              }}
                              onClick={() => {
                                if (onOpenAddEditPage) onOpenAddEditPage(med);
                                setOpenMenuId(null);
                              }}
                            >
                              <Edit2 size={14} />
                              <span>Edit Details</span>
                            </button>

                            {isAdmin && (
                              <button
                                type="button"
                                style={{
                                  width: '100%',
                                  padding: '8px 14px',
                                  border: 'none',
                                  background: 'none',
                                  textAlign: 'left',
                                  fontSize: '12.5px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  color: '#DC2626',
                                  borderTop: '1px solid #F1F5F9',
                                  marginTop: '4px',
                                  paddingTop: '8px'
                                }}
                                onClick={() => {
                                  handleDeactivate(med.id, med.name);
                                  setOpenMenuId(null);
                                }}
                              >
                                <Trash2 size={14} />
                                <span>Deactivate</span>
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
        )}

        {/* Pagination Footer */}
        {medicines.length > 0 && (
          <div
            style={{
              padding: '14px 22px',
              borderTop: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              background: '#FFFFFF',
              borderRadius: '0 0 16px 16px'
            }}
          >
            {/* Left Info & Page Size Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '13px', color: '#64748B' }}>
              <span>
                Showing <strong>{totalItems > 0 ? startIndex + 1 : 0}</strong> to <strong>{endIndex}</strong> of <strong>{totalItems}</strong> medicines
              </span>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12px' }}>Rows per page:</span>
                <select
                  className="form-control"
                  style={{ width: '65px', padding: '2px 6px', height: '28px', fontSize: '12px', borderRadius: '6px' }}
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            {/* Right Page Controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                className="btn btn-secondary btn-sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                style={{ padding: '4px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', borderRadius: '6px' }}
              >
                <ChevronLeft size={14} />
                <span>Prev</span>
              </button>

              <div style={{ display: 'flex', gap: '4px' }}>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                  .map((page, index, array) => {
                    const showEllipsis = index > 0 && page - array[index - 1] > 1;
                    return (
                      <React.Fragment key={page}>
                        {showEllipsis && <span style={{ padding: '2px 4px', color: '#94A3B8' }}>...</span>}
                        <button
                          className={`btn btn-sm ${currentPage === page ? 'btn-primary' : 'btn-secondary'}`}
                          style={{
                            padding: '4px 10px',
                            fontSize: '12px',
                            minWidth: '32px',
                            justifyContent: 'center',
                            fontWeight: currentPage === page ? 700 : 500,
                            borderRadius: '6px'
                          }}
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </button>
                      </React.Fragment>
                    );
                  })}
              </div>

              <button
                className="btn btn-secondary btn-sm"
                disabled={currentPage === totalPages || totalPages === 0}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                style={{ padding: '4px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', borderRadius: '6px' }}
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Stock Modal */}
      {selectedMedicineForAddStock && (
        <AddStockModal
          medicine={selectedMedicineForAddStock}
          onClose={() => setSelectedMedicineForAddStock(null)}
          onSuccess={handleRefresh}
        />
      )}

      {/* Stock Adjust Modal */}
      {selectedMedicineForAdjust && (
        <StockAdjustModal
          medicine={selectedMedicineForAdjust}
          onClose={() => setSelectedMedicineForAdjust(null)}
          onSuccess={handleRefresh}
        />
      )}
    </div>
  );
};
