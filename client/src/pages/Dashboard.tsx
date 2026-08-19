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
  Receipt,
  BarChart3,
  Settings,
  Pill,
  ArrowRight
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

  const quickTools = [
    { label: 'POS Counter', icon: ShoppingCart, bg: 'var(--pastel-blue-bg)', color: 'var(--pastel-blue-icon)', tab: 'billing' },
    { label: 'Inventory', icon: Package, bg: 'var(--pastel-green-bg)', color: 'var(--pastel-green-icon)', tab: 'inventory' },
    { label: 'Bill History', icon: Receipt, bg: 'var(--pastel-pink-bg)', color: 'var(--pastel-pink-icon)', tab: 'history' },
    { label: 'Reports', icon: BarChart3, bg: 'var(--pastel-purple-bg)', color: 'var(--pastel-purple-icon)', tab: 'reports' },
    { label: 'Expiry Alert', icon: AlertTriangle, bg: 'var(--pastel-amber-bg)', color: 'var(--pastel-amber-icon)', tab: 'expiry' },
    { label: 'Settings', icon: Settings, bg: 'var(--pastel-cyan-bg)', color: 'var(--pastel-cyan-icon)', tab: 'settings' },
  ];

  return (
    <div>
      {/* Top Welcome Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
        <div>
          <h2 className="page-title">
            Pharmacy Counter Overview
          </h2>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
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
            <span>Add New Medicine</span>
          </button>
        </div>
      </div>

      {/* Common Tools Panel (Matching UI Reference Design) */}
      <div className="common-tools-panel">
        <h3 className="section-title" style={{ fontSize: '15px', marginBottom: '16px' }}>
          Common Tools
        </h3>
        <div className="tools-grid">
          {quickTools.map((tool, idx) => {
            const Icon = tool.icon;
            return (
              <div
                key={idx}
                className="tool-item"
                onClick={() => setActiveTab(tool.tab as ActiveTab)}
              >
                <div className="tool-icon-box" style={{ backgroundColor: tool.bg }}>
                  <Icon size={22} color={tool.color} />
                </div>
                <span className="tool-label">{tool.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Transaction Analysis / KPI Cards Grid */}
      <div style={{ marginBottom: '14px' }}>
        <h3 className="section-title" style={{ fontSize: '15px', marginBottom: '16px' }}>
          Transaction & Inventory Analysis
        </h3>
      </div>

      <div className="kpi-grid">
        {/* Today's Sales */}
        <div className="kpi-card">
          <div className="kpi-title">
            <span>Today's Sales</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--primary-blue-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <IndianRupee size={16} color="var(--primary-blue)" />
            </div>
          </div>
          <div className="kpi-value" style={{ color: 'var(--primary-blue)' }}>
            ₹{summary.todaysSales.toFixed(2)}
          </div>
          <div className="kpi-subtitle" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--status-success)', fontWeight: 600 }}>
            <TrendingUp size={13} />
            <span>{summary.todaysBillCount} bills completed today</span>
          </div>
        </div>

        {/* Total Medicines */}
        <div className="kpi-card">
          <div className="kpi-title">
            <span>Total Medicines</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--pastel-green-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Package size={16} color="var(--pastel-green-icon)" />
            </div>
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
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--pastel-cyan-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Boxes size={16} color="var(--pastel-cyan-icon)" />
            </div>
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
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--pastel-amber-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={16} color="var(--pastel-amber-icon)" />
            </div>
          </div>
          <div className="kpi-value" style={{ color: 'var(--status-warning)' }}>{summary.lowStockCount}</div>
          <div className="kpi-subtitle" style={{ color: 'var(--status-warning)', fontWeight: 600 }}>
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
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={16} color="var(--status-error)" />
            </div>
          </div>
          <div className="kpi-value" style={{ color: 'var(--status-error)' }}>
            {summary.expiringCount + summary.expiredCount}
          </div>
          <div className="kpi-subtitle" style={{ color: 'var(--status-error)', fontWeight: 600 }}>
            {summary.expiredCount > 0 ? `${summary.expiredCount} expired!` : 'Approaching expiry'}
          </div>
        </div>
      </div>

      {/* Recent Bills Table */}
      <div className="table-container">
        <div className="table-header-tools">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 className="section-title" style={{ fontSize: '15px', margin: 0 }}>Recent Sales Invoices</h3>
          </div>

          <button className="btn btn-secondary btn-sm" onClick={() => setActiveTab('history')}>
            <span>View All Bills</span>
            <ArrowRight size={13} />
          </button>
        </div>

        {summary.recentBills.length === 0 ? (
          <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-secondary)' }}>
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
                  <td style={{ fontWeight: 700, color: 'var(--primary-blue)' }}>{bill.invoiceNumber}</td>
                  <td>{bill.time}</td>
                  <td>{bill.items.length} items</td>
                  <td>
                    <span className="badge" style={{ background: '#F1F5F9', color: '#1E293B' }}>
                      {bill.paymentMethod}
                    </span>
                  </td>
                  <td>{bill.createdByName}</td>
                  <td style={{ fontWeight: 800, color: 'var(--primary-blue)' }}>₹{bill.totalAmount.toFixed(2)}</td>
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
