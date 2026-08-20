import React, { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import { StockValuationReport } from './StockValuationReport';
import { ExpiryRiskReport } from './ExpiryRiskReport';
import { BarChart3, Boxes, AlertTriangle, Printer } from 'lucide-react';

interface ReportsProps {
  defaultSubTab?: 'sales' | 'stock' | 'expiry';
}

export const Reports: React.FC<ReportsProps> = ({ defaultSubTab = 'sales' }) => {
  const [activeTab, setActiveTab] = useState<'sales' | 'stock' | 'expiry'>(defaultSubTab);
  const [salesReportData, setSalesReportData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchSalesReport = async () => {
    setLoading(true);
    try {
      const res = await apiService.getDashboardSummary();
      const billsRes = await apiService.getBills();
      const bills = billsRes.bills || [];
      const totalSales = bills.reduce((sum: number, b: any) => sum + b.totalAmount, 0);
      setSalesReportData({
        totalSales,
        totalBills: bills.length,
        avgBill: bills.length ? totalSales / bills.length : 0,
        cash: bills.filter((b: any) => b.paymentMethod === 'CASH').reduce((s: number, b: any) => s + b.totalAmount, 0),
        upi: bills.filter((b: any) => b.paymentMethod === 'UPI').reduce((s: number, b: any) => s + b.totalAmount, 0),
        card: bills.filter((b: any) => b.paymentMethod === 'CARD').reduce((s: number, b: any) => s + b.totalAmount, 0),
        bills
      });
    } catch (err) {
      console.error('Error fetching sales report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'sales') {
      fetchSalesReport();
    }
  }, [activeTab]);

  return (
    <div>
      {/* Top Report Tab Switcher Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '8px', background: '#FFFFFF', padding: '4px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
          <button
            className={`btn ${activeTab === 'sales' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ border: 'none' }}
            onClick={() => setActiveTab('sales')}
          >
            <BarChart3 size={16} />
            <span>Sales Report</span>
          </button>
          <button
            className={`btn ${activeTab === 'stock' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ border: 'none' }}
            onClick={() => setActiveTab('stock')}
          >
            <Boxes size={16} />
            <span>Stock Valuation Report</span>
          </button>
          <button
            className={`btn ${activeTab === 'expiry' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ border: 'none' }}
            onClick={() => setActiveTab('expiry')}
          >
            <AlertTriangle size={16} />
            <span>Expiry Risk Report</span>
          </button>
        </div>

        {activeTab === 'sales' && (
          <button className="btn btn-secondary" onClick={() => window.print()}>
            <Printer size={16} />
            <span>Print Sales Summary</span>
          </button>
        )}
      </div>

      {/* SALES REPORT VIEW */}
      {activeTab === 'sales' && salesReportData && (
        <div>
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-title">Total Sales Revenue</div>
              <div className="kpi-value" style={{ color: '#0F766E' }}>₹{salesReportData.totalSales.toFixed(2)}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-title">Total Bills Completed</div>
              <div className="kpi-value">{salesReportData.totalBills}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-title">Average Bill Amount</div>
              <div className="kpi-value">₹{salesReportData.avgBill.toFixed(2)}</div>
            </div>
          </div>

          <div className="table-container">
            <div className="table-header-tools">
              <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Payment Methods Breakdown</h3>
            </div>
            <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#64748B' }}>CASH Sales</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#16A34A', marginTop: '4px' }}>
                  ₹{salesReportData.cash.toFixed(2)}
                </div>
              </div>
              <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#64748B' }}>UPI Digital Sales</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#0F766E', marginTop: '4px' }}>
                  ₹{salesReportData.upi.toFixed(2)}
                </div>
              </div>
              <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#64748B' }}>CARD Payments</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#2563EB', marginTop: '4px' }}>
                  ₹{salesReportData.card.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DEDICATED STOCK VALUATION REPORT PAGE */}
      {activeTab === 'stock' && <StockValuationReport />}

      {/* DEDICATED EXPIRY RISK REPORT PAGE */}
      {activeTab === 'expiry' && <ExpiryRiskReport />}
    </div>
  );
};
