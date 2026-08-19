import React, { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import { BarChart3, IndianRupee, Boxes, AlertTriangle, Printer } from 'lucide-react';

export const Reports: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'sales' | 'stock' | 'expiry'>('sales');
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchReport = async () => {
    setLoading(true);
    try {
      if (activeTab === 'sales') {
        const res = await apiService.getDashboardSummary();
        const billsRes = await apiService.getBills();
        const bills = billsRes.bills || [];
        const totalSales = bills.reduce((sum: number, b: any) => sum + b.totalAmount, 0);
        setReportData({
          totalSales,
          totalBills: bills.length,
          avgBill: bills.length ? totalSales / bills.length : 0,
          cash: bills.filter((b: any) => b.paymentMethod === 'CASH').reduce((s: number, b: any) => s + b.totalAmount, 0),
          upi: bills.filter((b: any) => b.paymentMethod === 'UPI').reduce((s: number, b: any) => s + b.totalAmount, 0),
          card: bills.filter((b: any) => b.paymentMethod === 'CARD').reduce((s: number, b: any) => s + b.totalAmount, 0),
          bills
        });
      } else if (activeTab === 'stock') {
        const res = await apiService.getMedicines();
        const meds = res.medicines || [];
        const totalValuation = meds.reduce((s: number, m: any) => s + (m.sellingPrice * m.quantity), 0);
        const totalQty = meds.reduce((s: number, m: any) => s + m.quantity, 0);
        setReportData({
          totalValuation,
          totalQty,
          meds
        });
      } else if (activeTab === 'expiry') {
        const res = await apiService.getMedicines();
        const meds = res.medicines || [];
        const today = new Date();
        today.setHours(0,0,0,0);

        const expired = meds.filter((m: any) => new Date(m.expiryDate) < today);
        const expiring = meds.filter((m: any) => {
          const exp = new Date(m.expiryDate);
          exp.setHours(0,0,0,0);
          const diff = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          return exp >= today && diff <= 90;
        });

        setReportData({ expired, expiring });
      }
    } catch (err) {
      console.error('Error fetching report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [activeTab]);

  return (
    <div>
      {/* Tab Navigation */}
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

        <button className="btn btn-secondary" onClick={() => window.print()}>
          <Printer size={16} />
          <span>Print Summary Report</span>
        </button>
      </div>

      {/* SALES REPORT VIEW */}
      {activeTab === 'sales' && reportData && (
        <div>
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-title">Total Sales Revenue</div>
              <div className="kpi-value" style={{ color: '#0F766E' }}>₹{reportData.totalSales.toFixed(2)}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-title">Total Bills Completed</div>
              <div className="kpi-value">{reportData.totalBills}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-title">Average Bill Amount</div>
              <div className="kpi-value">₹{reportData.avgBill.toFixed(2)}</div>
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
                  ₹{reportData.cash.toFixed(2)}
                </div>
              </div>
              <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#64748B' }}>UPI Digital Sales</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#0F766E', marginTop: '4px' }}>
                  ₹{reportData.upi.toFixed(2)}
                </div>
              </div>
              <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#64748B' }}>CARD Payments</div>
                <div style={{ fontSize: '20px', fontWeight: 800, color: '#2563EB', marginTop: '4px' }}>
                  ₹{reportData.card.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STOCK REPORT VIEW */}
      {activeTab === 'stock' && reportData && (
        <div>
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-title">Total Inventory Valuation</div>
              <div className="kpi-value" style={{ color: '#0F766E' }}>₹{reportData.totalValuation.toFixed(2)}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-title">Total Shelf Stock Units</div>
              <div className="kpi-value">{reportData.totalQty} units</div>
            </div>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Medicine</th>
                  <th>Category</th>
                  <th>Batch</th>
                  <th>Stock Qty</th>
                  <th>Selling Price</th>
                  <th>Total Asset Value</th>
                </tr>
              </thead>
              <tbody>
                {reportData.meds.map((m: any) => (
                  <tr key={m.id}>
                    <td style={{ fontWeight: 600 }}>{m.name}</td>
                    <td>{m.category}</td>
                    <td>{m.batchNumber}</td>
                    <td><strong>{m.quantity}</strong></td>
                    <td>₹{m.sellingPrice.toFixed(2)}</td>
                    <td style={{ fontWeight: 700, color: '#0F766E' }}>₹{(m.sellingPrice * m.quantity).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* EXPIRY REPORT VIEW */}
      {activeTab === 'expiry' && reportData && (
        <div>
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-title text-error">Expired Medicines Count</div>
              <div className="kpi-value text-error">{reportData.expired.length}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-title text-warning">Expiring within 90 Days</div>
              <div className="kpi-value text-warning">{reportData.expiring.length}</div>
            </div>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Medicine Name</th>
                  <th>Batch</th>
                  <th>Expiry Date</th>
                  <th>Quantity</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {reportData.expired.map((m: any) => (
                  <tr key={m.id} style={{ background: '#FEF2F2' }}>
                    <td style={{ fontWeight: 700, color: '#DC2626' }}>{m.name}</td>
                    <td>{m.batchNumber}</td>
                    <td style={{ fontWeight: 700, color: '#DC2626' }}>{m.expiryDate}</td>
                    <td>{m.quantity}</td>
                    <td><span className="badge badge-expired">EXPIRED</span></td>
                  </tr>
                ))}
                {reportData.expiring.map((m: any) => (
                  <tr key={m.id}>
                    <td style={{ fontWeight: 600 }}>{m.name}</td>
                    <td>{m.batchNumber}</td>
                    <td>{m.expiryDate}</td>
                    <td>{m.quantity}</td>
                    <td><span className="badge badge-expiring">EXPIRING SOON</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
