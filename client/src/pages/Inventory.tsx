import React, { useEffect, useState } from 'react';
import { Medicine, MedicineStatus, Category } from '../../../shared/types';
import { apiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { StockAdjustModal } from '../components/StockAdjustModal';
import { AddStockModal } from '../components/AddStockModal';
import {
  Search,
  Plus,
  Edit2,
  Sliders,
  Trash2,
  Package,
  RefreshCw,
  PlusCircle,
  MapPin
} from 'lucide-react';

interface InventoryProps {
  onOpenAddEditPage?: (medToEdit?: Medicine | null) => void;
}

const DOSAGE_FORMS = ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Syringe', 'Bottle', 'Vial', 'Other'];

export const Inventory: React.FC<InventoryProps> = ({ onOpenAddEditPage }) => {
  const { isAdmin } = useAuth();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedDosageForm, setSelectedDosageForm] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  // Modals
  const [selectedMedicineForAdjust, setSelectedMedicineForAdjust] = useState<Medicine | null>(null);
  const [selectedMedicineForAddStock, setSelectedMedicineForAddStock] = useState<Medicine | null>(null);

  const fetchMedicines = async () => {
    setLoading(true);
    try {
      const res = await apiService.getMedicines({
        search: searchTerm,
        category: selectedCategory,
        dosageForm: selectedDosageForm,
        status: selectedStatus
      });
      if (res.success) {
        setMedicines(res.medicines);
      }
    } catch (err) {
      console.error('Failed to load medicines:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await apiService.getCategories();
      if (res.success && res.categories) {
        setCategories(res.categories);
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  useEffect(() => {
    fetchMedicines();
    fetchCategories();
  }, [searchTerm, selectedCategory, selectedDosageForm, selectedStatus]);

  const handleDeactivate = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to deactivate ${name}?`)) return;
    try {
      await apiService.updateMedicine(id, { status: 'INACTIVE' });
      fetchMedicines();
    } catch (err) {
      alert('Deactivation failed.');
    }
  };

  const renderStatusBadge = (status: MedicineStatus) => {
    switch (status) {
      case 'IN_STOCK':
        return <span className="badge badge-in-stock">In Stock</span>;
      case 'LOW_STOCK':
        return <span className="badge badge-low-stock">Low Stock</span>;
      case 'EXPIRING':
        return <span className="badge badge-expiring">Expiring</span>;
      case 'EXPIRED':
        return <span className="badge badge-expired">Expired</span>;
      case 'INACTIVE':
        return <span className="badge badge-inactive">Inactive</span>;
      default:
        return <span className="badge badge-inactive">{status}</span>;
    }
  };

  // Helper to format stock into Packages + Loose Units string
  const formatStockDisplay = (med: Medicine) => {
    const unitsPerPkg = Math.max(1, med.unitsPerPackage || 1);
    const totalBase = med.quantity || 0;
    const pkgQty = Math.floor(totalBase / unitsPerPkg);
    const looseQty = totalBase % unitsPerPkg;
    const pkgName = med.packageType || 'Strip';
    const looseName = med.looseUnitName || 'Tablet';

    if (unitsPerPkg === 1) {
      return <strong>{totalBase} {looseName}s</strong>;
    }

    if (pkgQty > 0 && looseQty > 0) {
      return (
        <div>
          <strong>{pkgQty} {pkgName}s</strong>
          <span style={{ fontSize: '11px', color: '#0F766E', marginLeft: '4px' }}>
            + {looseQty} {looseName}s
          </span>
        </div>
      );
    } else if (pkgQty > 0) {
      return <strong>{pkgQty} {pkgName}s</strong>;
    } else {
      return <strong>{looseQty} {looseName}s</strong>;
    }
  };

  // Helper to format location
  const formatLocation = (med: Medicine) => {
    const locs = [];
    if (med.rack) locs.push(`Rack ${med.rack}`);
    if (med.row) locs.push(`R-${med.row}`);
    if (med.column) locs.push(`C-${med.column}`);
    if (med.shelfBin) locs.push(med.shelfBin);
    if (!locs.length) return <span style={{ color: '#94A3B8', fontSize: '11px' }}>Unassigned</span>;
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', background: '#F1F5F9', padding: '2px 6px', borderRadius: '4px', color: '#475569' }}>
        <MapPin size={11} color="#7C3AED" />
        <span>{locs.join(' → ')}</span>
      </div>
    );
  };

  return (
    <div>
      {/* Header Tools */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 className="page-title">
            Medicine Inventory Directory
          </h2>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Total {medicines.length} medicines listed
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={fetchMedicines}>
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              if (onOpenAddEditPage) onOpenAddEditPage(null);
            }}
          >
            <Plus size={16} />
            <span>Add New Medicine</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="table-container" style={{ marginBottom: '20px' }}>
        <div className="table-header-tools" style={{ flexWrap: 'wrap', gap: '10px' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '11px' }} />
            <input
              type="text"
              className="form-control"
              style={{ paddingLeft: '36px' }}
              placeholder="Search by code (MED-xxx), name, generic, strength, barcode..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Category Filter */}
          <div style={{ width: '180px' }}>
            <select
              className="form-control"
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Dosage Form Filter */}
          <div style={{ width: '150px' }}>
            <select
              className="form-control"
              value={selectedDosageForm}
              onChange={e => setSelectedDosageForm(e.target.value)}
            >
              <option value="">All Dosage Forms</option>
              {DOSAGE_FORMS.map((form) => (
                <option key={form} value={form}>{form}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div style={{ width: '150px' }}>
            <select
              className="form-control"
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
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

        {/* Medicines Data Table */}
        {medicines.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <Package size={32} color="#94A3B8" style={{ marginBottom: '8px' }} />
            <div>No medicines found matching criteria.</div>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Medicine Details</th>
                <th>Category</th>
                <th>Batch / Expiry</th>
                <th>Location</th>
                <th>Selling Price</th>
                <th>Stock Units</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {medicines.map((med) => (
                <tr key={med.id}>
                  <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary-blue)', fontSize: '12px' }}>
                    {med.code || `MED-${med.id.slice(-6).toUpperCase()}`}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {med.name} {med.strength ? `(${med.strength})` : ''}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {med.genericName} | {med.dosageForm || 'Tablet'} | Barcode: {med.barcode}
                    </div>
                  </td>
                  <td>{med.category}</td>
                  <td>
                    <div style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '12px' }}>{med.batchNumber}</div>
                    <div style={{ fontSize: '11px', color: '#64748B' }}>Exp: {med.expiryDate}</div>
                  </td>
                  <td>{formatLocation(med)}</td>
                  <td style={{ fontWeight: 700, color: '#0F766E' }}>
                    ₹{(Number(med.sellingPrice) || 0).toFixed(2)}
                    <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 400 }}>
                      per {med.packageType || 'Strip'}
                    </div>
                  </td>
                  <td>
                    {formatStockDisplay(med)}
                    <div style={{ fontSize: '10px', color: '#64748B' }}>
                      ({med.quantity} total base units)
                    </div>
                  </td>
                  <td>{renderStatusBadge(med.status)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setSelectedMedicineForAddStock(med)}
                        title="Add Stock Shipment"
                        style={{ color: '#0F766E' }}
                      >
                        <PlusCircle size={14} />
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setSelectedMedicineForAdjust(med)}
                        title="Adjust Stock"
                      >
                        <Sliders size={14} />
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          if (onOpenAddEditPage) onOpenAddEditPage(med);
                        }}
                        title="Edit Details"
                      >
                        <Edit2 size={14} />
                      </button>
                      {isAdmin && (
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ color: '#DC2626' }}
                          onClick={() => handleDeactivate(med.id, med.name)}
                          title="Deactivate"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Stock Modal */}
      {selectedMedicineForAddStock && (
        <AddStockModal
          medicine={selectedMedicineForAddStock}
          onClose={() => setSelectedMedicineForAddStock(null)}
          onSuccess={fetchMedicines}
        />
      )}

      {/* Stock Adjustment Modal */}
      {selectedMedicineForAdjust && (
        <StockAdjustModal
          medicine={selectedMedicineForAdjust}
          onClose={() => setSelectedMedicineForAdjust(null)}
          onSuccess={fetchMedicines}
        />
      )}
    </div>
  );
};
