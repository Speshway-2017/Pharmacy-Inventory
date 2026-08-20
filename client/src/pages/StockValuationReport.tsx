import React, { useEffect, useState } from 'react';
import { Medicine } from '../../../shared/types';
import { apiService } from '../services/api';
import { Boxes, IndianRupee, Printer, ArrowLeft, RefreshCw, PackageCheck } from 'lucide-react';

interface StockValuationReportProps {
  onBack?: () => void;
}

export const StockValuationReport: React.FC<StockValuationReportProps> = ({ onBack }) => {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const fetchStockData = async () => {
    setLoading(true);
    try {
      const res = await apiService.getMedicines();
      if (res.success) {
        setMedicines(res.medicines);
      }
    } catch (err) {
      console.error('Failed to load stock valuation data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStockData();
  }, []);

  const filteredMeds = selectedCategory
    ? medicines.filter(m => m.category === selectedCategory)
    : medicines;

  const totalValuation = filteredMeds.reduce((sum, m) => sum + m.sellingPrice * m.quantity, 0);
  const totalMrpValuation = filteredMeds.reduce((sum, m) => sum + (m.mrp || m.sellingPrice) * m.quantity, 0);
  const totalUnits = filteredMeds.reduce((sum, m) => sum + m.quantity, 0);

  // Group by category
  const categorySummary: { [key: string]: { count: number; qty: number; valuation: number } } = {};
  filteredMeds.forEach(m => {
    const cat = m.category || 'General';
    if (!categorySummary[cat]) {
      categorySummary[cat] = { count: 0, qty: 0, valuation: 0 };
    }
    categorySummary[cat].count += 1;
    categorySummary[cat].qty += m.quantity;
    categorySummary[cat].valuation += m.sellingPrice * m.quantity;
  });

  return (
    <div>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {onBack && (
            <button className="btn btn-secondary" onClick={onBack}>
              <ArrowLeft size={16} />
              <span>Back</span>
            </button>
          )}
          <div>
            <h2 className="page-title" style={{ margin: 0 }}>
              Stock Valuation Analytics Report
            </h2>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Real-time financial asset valuation of current pharmacy shelf stock
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={fetchStockData}>
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
          <button className="btn btn-primary" onClick={() => window.print()}>
            <Printer size={16} />
            <span>Print Valuation Report</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '24px' }}>
        <div className="kpi-card" style={{ borderLeft: '4px solid #0F766E' }}>
          <div className="kpi-title">
            <span>Total Stock Asset Value</span>
            <IndianRupee size={18} color="#0F766E" />
          </div>
          <div className="kpi-value" style={{ color: '#0F766E' }}>
            ₹{totalValuation.toFixed(2)}
          </div>
          <div className="kpi-subtitle" style={{ color: '#0F766E', fontWeight: 600 }}>
            Based on current selling price
          </div>
        </div>

        <div className="kpi-card" style={{ borderLeft: '4px solid #2563EB' }}>
          <div className="kpi-title">
            <span>Total MRP Asset Value</span>
            <IndianRupee size={18} color="#2563EB" />
          </div>
          <div className="kpi-value" style={{ color: '#2563EB' }}>
            ₹{totalMrpValuation.toFixed(2)}
          </div>
          <div className="kpi-subtitle" style={{ color: '#2563EB', fontWeight: 600 }}>
            Maximum potential retail revenue
          </div>
        </div>

        <div className="kpi-card" style={{ borderLeft: '4px solid #10B981' }}>
          <div className="kpi-title">
            <span>Total Inventory Units</span>
            <Boxes size={18} color="#10B981" />
          </div>
          <div className="kpi-value">{totalUnits} units</div>
          <div className="kpi-subtitle" style={{ color: 'var(--text-secondary)' }}>
            Across {filteredMeds.length} medicine SKUs
          </div>
        </div>
      </div>

      {/* Category Wise Summary Breakdown */}
      <div className="table-container" style={{ marginBottom: '24px' }}>
        <div className="table-header-tools">
          <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Valuation Breakdown by Category</h3>
        </div>
        <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
          {Object.keys(categorySummary).map((catName) => (
            <div key={catName} style={{ background: '#F8FAFC', padding: '14px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{catName}</div>
              <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                {categorySummary[catName].count} SKUs | {categorySummary[catName].qty} units
              </div>
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F766E', marginTop: '6px' }}>
                ₹{categorySummary[catName].valuation.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detailed Stock Valuation Table */}
      <div className="table-container">
        <div className="table-header-tools">
          <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Detailed Inventory Item Valuation</h3>

          <div style={{ width: '200px' }}>
            <select
              className="form-control"
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {Object.keys(categorySummary).map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {filteredMeds.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No medicine inventory items found.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Medicine Name</th>
                <th>Category</th>
                <th>Batch Number</th>
                <th>Expiry Date</th>
                <th>MRP (₹)</th>
                <th>Selling Price (₹)</th>
                <th>Quantity</th>
                <th>Total Asset Value (₹)</th>
              </tr>
            </thead>
            <tbody>
              {filteredMeds.map((med) => {
                const lineValuation = med.sellingPrice * med.quantity;
                return (
                  <tr key={med.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{med.name}</div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>{med.genericName}</div>
                    </td>
                    <td>{med.category}</td>
                    <td style={{ fontFamily: 'monospace' }}>{med.batchNumber}</td>
                    <td>{med.expiryDate}</td>
                    <td>₹{med.mrp.toFixed(2)}</td>
                    <td>₹{med.sellingPrice.toFixed(2)}</td>
                    <td><strong>{med.quantity}</strong></td>
                    <td style={{ fontWeight: 800, color: '#0F766E', fontSize: '14px' }}>
                      ₹{lineValuation.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
