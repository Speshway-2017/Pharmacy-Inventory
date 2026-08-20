import React, { useEffect, useState } from 'react';
import { Medicine, MedicineStatus, Category } from '../../../shared/types';
import { apiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { StockAdjustModal } from '../components/StockAdjustModal';
import {
  Search,
  Plus,
  Edit2,
  Sliders,
  Trash2,
  Package,
  RefreshCw
} from 'lucide-react';

interface InventoryProps {
  onOpenAddEditPage?: (medToEdit?: Medicine | null) => void;
}

export const Inventory: React.FC<InventoryProps> = ({ onOpenAddEditPage }) => {
  const { isAdmin } = useAuth();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  // Stock Adjustment Modal
  const [selectedMedicineForStock, setSelectedMedicineForStock] = useState<Medicine | null>(null);

  const fetchMedicines = async () => {
    setLoading(true);
    try {
      const res = await apiService.getMedicines({
        search: searchTerm,
        category: selectedCategory,
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
  }, [searchTerm, selectedCategory, selectedStatus]);

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
        <div className="table-header-tools" style={{ flexWrap: 'wrap' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '11px' }} />
            <input
              type="text"
              className="form-control"
              style={{ paddingLeft: '36px' }}
              placeholder="Search medicine name, generic name, barcode, batch..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Category Filter */}
          <div style={{ width: '200px' }}>
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

          {/* Status Filter */}
          <div style={{ width: '160px' }}>
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
                <th>Medicine Name</th>
                <th>Category</th>
                <th>Batch</th>
                <th>Expiry Date</th>
                <th>MRP</th>
                <th>Selling Price</th>
                <th>Stock Qty</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {medicines.map((med) => (
                <tr key={med.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{med.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {med.genericName} | {med.barcode}
                    </div>
                  </td>
                  <td>{med.category}</td>
                  <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{med.batchNumber}</td>
                  <td>{med.expiryDate}</td>
                  <td>₹{med.mrp.toFixed(2)}</td>
                  <td style={{ fontWeight: 700, color: '#0F766E' }}>₹{med.sellingPrice.toFixed(2)}</td>
                  <td>
                    <strong style={{ fontSize: '14px' }}>{med.quantity}</strong>
                    <span style={{ fontSize: '11px', color: '#64748B', marginLeft: '4px' }}>
                      (Min: {med.reorderLevel})
                    </span>
                  </td>
                  <td>{renderStatusBadge(med.status)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setSelectedMedicineForStock(med)}
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

      {/* Stock Adjustment Modal */}
      {selectedMedicineForStock && (
        <StockAdjustModal
          medicine={selectedMedicineForStock}
          onClose={() => setSelectedMedicineForStock(null)}
          onSuccess={fetchMedicines}
        />
      )}
    </div>
  );
};
