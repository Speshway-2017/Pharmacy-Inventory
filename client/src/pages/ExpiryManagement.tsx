import React, { useEffect, useState } from 'react';
import { Medicine } from '../../../shared/types';
import { apiService } from '../services/api';
import { AlertOctagon, AlertTriangle, Clock, ShieldAlert } from 'lucide-react';

export const ExpiryManagement: React.FC = () => {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchMedicines = async () => {
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
    fetchMedicines();
  }, []);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expired: (Medicine & { days: number })[] = [];
  const expiring30: (Medicine & { days: number })[] = [];
  const expiring60: (Medicine & { days: number })[] = [];
  const expiring90: (Medicine & { days: number })[] = [];

  medicines.forEach((m) => {
    const exp = new Date(m.expiryDate);
    exp.setHours(0, 0, 0, 0);
    const diffTime = exp.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (exp < today) {
      expired.push({ ...m, days: diffDays });
    } else if (diffDays <= 30) {
      expiring30.push({ ...m, days: diffDays });
    } else if (diffDays <= 60) {
      expiring60.push({ ...m, days: diffDays });
    } else if (diffDays <= 90) {
      expiring90.push({ ...m, days: diffDays });
    }
  });

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
          Batch & Expiry Date Tracker
        </h2>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Identify expired stock and medicines approaching expiration
        </div>
      </div>

      {/* Summary Warning Cards */}
      <div className="kpi-grid">
        <div className="kpi-card" style={{ borderLeft: '4px solid #DC2626' }}>
          <div className="kpi-title text-error">
            <span>Expired Medicines</span>
            <AlertOctagon size={18} color="#DC2626" />
          </div>
          <div className="kpi-value text-error">{expired.length}</div>
          <div className="kpi-subtitle" style={{ color: '#B91C1C' }}>
            Strictly blocked from POS billing
          </div>
        </div>

        <div className="kpi-card" style={{ borderLeft: '4px solid #F97316' }}>
          <div className="kpi-title" style={{ color: '#EA580C' }}>
            <span>Expiring in 30 Days</span>
            <AlertTriangle size={18} color="#F97316" />
          </div>
          <div className="kpi-value" style={{ color: '#EA580C' }}>{expiring30.length}</div>
          <div className="kpi-subtitle" style={{ color: '#EA580C' }}>
            High priority clearance needed
          </div>
        </div>

        <div className="kpi-card" style={{ borderLeft: '4px solid #F59E0B' }}>
          <div className="kpi-title text-warning">
            <span>Expiring in 60 Days</span>
            <Clock size={18} color="#F59E0B" />
          </div>
          <div className="kpi-value text-warning">{expiring60.length}</div>
          <div className="kpi-subtitle text-warning">
            Monitor inventory sales rate
          </div>
        </div>

        <div className="kpi-card" style={{ borderLeft: '4px solid #10B981' }}>
          <div className="kpi-title" style={{ color: '#059669' }}>
            <span>Expiring in 90 Days</span>
            <Clock size={18} color="#10B981" />
          </div>
          <div className="kpi-value" style={{ color: '#059669' }}>{expiring90.length}</div>
          <div className="kpi-subtitle" style={{ color: '#059669' }}>
            Normal operational watch
          </div>
        </div>
      </div>

      {/* EXPIRED MEDICINES SECTION */}
      <div className="table-container" style={{ marginBottom: '24px', borderColor: '#FCA5A5' }}>
        <div className="table-header-tools" style={{ background: '#FEF2F2' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#DC2626' }}>
            <ShieldAlert size={20} />
            <h3 style={{ fontSize: '15px', fontWeight: 800 }}>EXPIRED MEDICINES (ACTION REQUIRED)</h3>
          </div>
        </div>

        {expired.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: '#16A34A', fontWeight: 600 }}>
            🟢 No expired medicines currently in inventory.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr style={{ background: '#FEE2E2' }}>
                <th>Medicine Name</th>
                <th>Batch Number</th>
                <th>Expiry Date</th>
                <th>Overdue Days</th>
                <th>Stock Qty</th>
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
                  <td><span className="badge badge-expired">EXPIRED (BLOCKED)</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* EXPIRING SOON SECTION */}
      <div className="table-container">
        <div className="table-header-tools">
          <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Medicines Expiring Within 90 Days</h3>
        </div>

        {[...expiring30, ...expiring60, ...expiring90].length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No medicines expiring in the next 90 days.
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
                <th>Alert Level</th>
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
                  <td>
                    {m.days <= 30 ? (
                      <span className="badge badge-expiring">30 Days Warning</span>
                    ) : m.days <= 60 ? (
                      <span className="badge badge-low-stock">60 Days Warning</span>
                    ) : (
                      <span className="badge badge-in-stock">90 Days Notice</span>
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
