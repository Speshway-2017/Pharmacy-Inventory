import React, { useEffect, useState } from 'react';
import { Medicine } from '../../../shared/types';
import { apiService } from '../services/api';
import { AlertTriangle, AlertOctagon, Clock, ShieldAlert, Printer, ArrowLeft, RefreshCw } from 'lucide-react';

interface ExpiryRiskReportProps {
  onBack?: () => void;
}

export const ExpiryRiskReport: React.FC<ExpiryRiskReportProps> = ({ onBack }) => {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchExpiryData = async () => {
    setLoading(true);
    try {
      const res = await apiService.getMedicines();
      if (res.success) {
        setMedicines(res.medicines);
      }
    } catch (err) {
      console.error('Failed to load expiry data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpiryData();
  }, []);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expired: (Medicine & { days: number; lossValue: number })[] = [];
  const expiring30: (Medicine & { days: number; riskValue: number })[] = [];
  const expiring60: (Medicine & { days: number; riskValue: number })[] = [];
  const expiring90: (Medicine & { days: number; riskValue: number })[] = [];

  medicines.forEach((m) => {
    const exp = new Date(m.expiryDate);
    exp.setHours(0, 0, 0, 0);
    const diffTime = exp.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const totalVal = m.sellingPrice * m.quantity;

    if (exp < today) {
      expired.push({ ...m, days: diffDays, lossValue: totalVal });
    } else if (diffDays <= 30) {
      expiring30.push({ ...m, days: diffDays, riskValue: totalVal });
    } else if (diffDays <= 60) {
      expiring60.push({ ...m, days: diffDays, riskValue: totalVal });
    } else if (diffDays <= 90) {
      expiring90.push({ ...m, days: diffDays, riskValue: totalVal });
    }
  });

  const totalExpiredLoss = expired.reduce((sum, item) => sum + item.lossValue, 0);
  const totalRisk30Value = expiring30.reduce((sum, item) => sum + item.riskValue, 0);
  const totalRiskAllValue = [...expiring30, ...expiring60, ...expiring90].reduce((sum, item) => sum + item.riskValue, 0);

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
              Expiry Risk Audit & Loss Prevention Report
            </h2>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Detailed audit of expired medicine stock and inventory approaching expiration
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={fetchExpiryData}>
            <RefreshCw size={14} />
            <span>Refresh</span>
          </button>
          <button className="btn btn-primary" onClick={() => window.print()}>
            <Printer size={16} />
            <span>Print Expiry Audit</span>
          </button>
        </div>
      </div>

      {/* KPI Warning Cards */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '24px' }}>
        <div className="kpi-card" style={{ borderLeft: '4px solid #DC2626' }}>
          <div className="kpi-title text-error">
            <span>Expired Batches</span>
            <AlertOctagon size={18} color="#DC2626" />
          </div>
          <div className="kpi-value text-error">{expired.length}</div>
          <div className="kpi-subtitle" style={{ color: '#DC2626', fontWeight: 600 }}>
            Loss Value: ₹{totalExpiredLoss.toFixed(2)}
          </div>
        </div>

        <div className="kpi-card" style={{ borderLeft: '4px solid #EA580C' }}>
          <div className="kpi-title" style={{ color: '#EA580C' }}>
            <span>Expiring &lt; 30 Days</span>
            <AlertTriangle size={18} color="#EA580C" />
          </div>
          <div className="kpi-value" style={{ color: '#EA580C' }}>{expiring30.length}</div>
          <div className="kpi-subtitle" style={{ color: '#EA580C', fontWeight: 600 }}>
            Capital at Risk: ₹{totalRisk30Value.toFixed(2)}
          </div>
        </div>

        <div className="kpi-card" style={{ borderLeft: '4px solid #D97706' }}>
          <div className="kpi-title text-warning">
            <span>Expiring 31-60 Days</span>
            <Clock size={18} color="#D97706" />
          </div>
          <div className="kpi-value text-warning">{expiring60.length}</div>
          <div className="kpi-subtitle text-warning">
            Monitor sales velocity
          </div>
        </div>

        <div className="kpi-card" style={{ borderLeft: '4px solid #059669' }}>
          <div className="kpi-title" style={{ color: '#059669' }}>
            <span>Total 90-Day Risk Pool</span>
            <Clock size={18} color="#059669" />
          </div>
          <div className="kpi-value" style={{ color: '#059669' }}>
            {expiring30.length + expiring60.length + expiring90.length} items
          </div>
          <div className="kpi-subtitle" style={{ color: '#059669', fontWeight: 600 }}>
            Total Value: ₹{totalRiskAllValue.toFixed(2)}
          </div>
        </div>
      </div>

      {/* EXPIRED MEDICINES TABLE */}
      <div className="table-container" style={{ marginBottom: '24px', borderColor: '#FCA5A5' }}>
        <div className="table-header-tools" style={{ background: '#FEF2F2' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#DC2626' }}>
            <ShieldAlert size={20} />
            <h3 style={{ fontSize: '15px', fontWeight: 800 }}>EXPIRED MEDICINES (STRICTLY BLOCKED FROM POS)</h3>
          </div>
        </div>

        {expired.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#16A34A', fontWeight: 600 }}>
            🟢 Excellent! No expired medicines currently in pharmacy inventory.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr style={{ background: '#FEE2E2' }}>
                <th>Medicine Name</th>
                <th>Batch Number</th>
                <th>Expiry Date</th>
                <th>Days Past Expiry</th>
                <th>Stock Qty</th>
                <th>Financial Loss (₹)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {expired.map((m) => (
                <tr key={m.id} style={{ background: '#FFF5F5' }}>
                  <td style={{ fontWeight: 700, color: '#DC2626' }}>{m.name}</td>
                  <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{m.batchNumber}</td>
                  <td style={{ fontWeight: 700, color: '#DC2626' }}>{m.expiryDate}</td>
                  <td style={{ color: '#DC2626', fontWeight: 600 }}>{Math.abs(m.days)} days ago</td>
                  <td><strong>{m.quantity} units</strong></td>
                  <td style={{ fontWeight: 800, color: '#DC2626' }}>₹{m.lossValue.toFixed(2)}</td>
                  <td><span className="badge badge-expired">EXPIRED (QUARANTINED)</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* UPCOMING EXPIRATIONS TIMELINE TABLE */}
      <div className="table-container">
        <div className="table-header-tools">
          <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Medicines Expiring Within Next 90 Days</h3>
        </div>

        {[...expiring30, ...expiring60, ...expiring90].length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No medicine inventory items expiring in the next 90 days.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Medicine Name</th>
                <th>Category</th>
                <th>Batch Number</th>
                <th>Expiry Date</th>
                <th>Days Remaining</th>
                <th>Stock Qty</th>
                <th>Valuation at Risk (₹)</th>
                <th>Risk Warning Level</th>
              </tr>
            </thead>
            <tbody>
              {[...expiring30, ...expiring60, ...expiring90].map((m) => (
                <tr key={m.id}>
                  <td style={{ fontWeight: 600 }}>{m.name}</td>
                  <td>{m.category}</td>
                  <td style={{ fontFamily: 'monospace' }}>{m.batchNumber}</td>
                  <td style={{ fontWeight: 600 }}>{m.expiryDate}</td>
                  <td style={{ fontWeight: 700, color: m.days <= 30 ? '#EA580C' : '#D97706' }}>
                    {m.days} days
                  </td>
                  <td><strong>{m.quantity}</strong></td>
                  <td style={{ fontWeight: 700, color: '#0F766E' }}>₹{m.riskValue.toFixed(2)}</td>
                  <td>
                    {m.days <= 30 ? (
                      <span className="badge badge-expiring">Urgent: 30 Days</span>
                    ) : m.days <= 60 ? (
                      <span className="badge badge-low-stock">Warning: 60 Days</span>
                    ) : (
                      <span className="badge badge-in-stock">Notice: 90 Days</span>
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
