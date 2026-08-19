import React, { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import {
  IndianRupee,
  Package,
  Boxes,
  AlertTriangle,
  Clock,
  ShoppingCart,
  PlusCircle,
  TrendingUp,
  Receipt
} from 'lucide-react';
import { Bill } from '../../../shared/types';
import { ActiveTab } from '../components/Sidebar';

interface DashboardProps {
  setActiveTab: (tab: ActiveTab) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ setActiveTab }) => {
  const [summary, setSummary] = useState<{
    todaysSales: number;
    todaysBillCount: number;
    totalMedicines: number;
    currentStockCount: number;
    lowStockCount: number;
    expiringCount: number;
    expiredCount: number;
    recentBills: Bill[];
  }>({
    todaysSales: 0,
    todaysBillCount: 0,
    totalMedicines: 0,
    currentStockCount: 0,
    lowStockCount: 0,
    expiringCount: 0,
    expiredCount: 0,
    recentBills: []
  });

  const [loading, setLoading] = useState<boolean>(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await apiService.getDashboardSummary();
      if (res.success && res.summary) {
        setSummary(res.summary);
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return (
    <div>
      {/* Top Quick Actions Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
            Pharmacy Counter Overview
          </h2>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Live status of daily billing, inventory & alerts
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-primary btn-lg" onClick={() => setActiveTab('billing')}>
            <ShoppingCart size={18} />
            <span>Open POS Billing Counter</span>
          </button>

          <button className="btn btn-secondary" onClick={() => setActiveTab('inventory')}>
            <PlusCircle size={16} />
            <span>Manage Inventory</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="kpi-grid">
        {/* Today's Sales */}
        <div className="kpi-card">
          <div className="kpi-title">
            <span>Today's Sales</span>
            <IndianRupee size={18} color="#0F766E" />
          </div>
          <div className="kpi-value" style={{ color: '#0F766E' }}>
            ₹{summary.todaysSales.toFixed(2)}
          </div>
          <div className="kpi-subtitle text-success" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <TrendingUp size={12} />
            <span>{summary.todaysBillCount} bills completed today</span>
          </div>
        </div>

        {/* Total Medicines */}
        <div className="kpi-card">
          <div className="kpi-title">
            <span>Total Medicines</span>
            <Package size={18} color="#64748B" />
          </div>
          <div className="kpi-value">{summary.totalMedicines}</div>
          <div className="kpi-subtitle" style={{ color: 'var(--text-secondary)' }}>
            Unique SKUs registered
          </div>
        </div>

        {/* Current Stock */}
        <div className="kpi-card">
          <div className="kpi-title">
            <span>Current Stock</span>
            <Boxes size={18} color="#64748B" />
          </div>
          <div className="kpi-value">{summary.currentStockCount}</div>
          <div className="kpi-subtitle" style={{ color: 'var(--text-secondary)' }}>
            Total units on shelves
          </div>
        </div>

        {/* Low Stock Warning */}
        <div
          className="kpi-card"
          style={{ cursor: 'pointer' }}
          onClick={() => setActiveTab('inventory')}
        >
          <div className="kpi-title">
            <span>Low Stock Items</span>
            <AlertTriangle size={18} color="#F59E0B" />
          </div>
          <div className="kpi-value text-warning">{summary.lowStockCount}</div>
          <div className="kpi-subtitle text-warning">
            Requires immediate reorder
          </div>
        </div>

        {/* Expiring / Expired Warning */}
        <div
          className="kpi-card"
          style={{ cursor: 'pointer' }}
          onClick={() => setActiveTab('expiry')}
        >
          <div className="kpi-title">
            <span>Expiring / Expired</span>
            <Clock size={18} color="#DC2626" />
          </div>
          <div className="kpi-value text-error">
            {summary.expiringCount + summary.expiredCount}
          </div>
          <div className="kpi-subtitle text-error">
            {summary.expiredCount > 0 ? `${summary.expiredCount} expired!` : 'Approaching expiry'}
          </div>
        </div>
      </div>

      {/* Recent Bills Table */}
      <div className="table-container">
        <div className="table-header-tools">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Receipt size={18} color="var(--primary-teal)" />
            <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Recent Sales Invoices</h3>
          </div>

          <button className="btn btn-secondary btn-sm" onClick={() => setActiveTab('history')}>
            View All Bills History
          </button>
        </div>

        {summary.recentBills.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No sales completed yet today.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice No</th>
                <th>Time</th>
                <th>Items Count</th>
                <th>Payment</th>
                <th>Billed By</th>
                <th>Total Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {summary.recentBills.map((bill) => (
                <tr key={bill.id}>
                  <td style={{ fontWeight: 600 }}>{bill.invoiceNumber}</td>
                  <td>{bill.time}</td>
                  <td>{bill.items.length} items</td>
                  <td>
                    <span className="badge" style={{ background: '#F1F5F9', color: '#0F172A' }}>
                      {bill.paymentMethod}
                    </span>
                  </td>
                  <td>{bill.createdByName}</td>
                  <td style={{ fontWeight: 700, color: '#0F766E' }}>₹{bill.totalAmount.toFixed(2)}</td>
                  <td>
                    {bill.isOfflineCreated && bill.syncStatus === 'PENDING' ? (
                      <span className="badge badge-low-stock">Offline Pending</span>
                    ) : (
                      <span className="badge badge-in-stock">Synced</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
