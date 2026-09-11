import React, { useEffect, useState } from 'react';
import { Bill } from '../../../shared/types';
import { apiService } from '../services/api';
import { PrintInvoiceModal } from '../components/PrintInvoiceModal';
import { Search, Printer, Receipt, RefreshCw } from 'lucide-react';

export const BillHistory: React.FC = () => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedBillForPrint, setSelectedBillForPrint] = useState<Bill | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchBills = async () => {
    setLoading(true);
    try {
      const res = await apiService.getBills({ invoiceNumber: searchTerm });
      if (res.success) {
        setBills(res.bills);
      }
    } catch (err) {
      console.error('Error loading bill history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();

    const handleRestored = () => fetchBills();
    window.addEventListener('pharmacy:data-restored', handleRestored);
    return () => {
      window.removeEventListener('pharmacy:data-restored', handleRestored);
    };
  }, [searchTerm]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 className="page-title">
            Sales Bill History & Invoices
          </h2>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Total {bills.length} invoices generated
          </div>
        </div>

        <button className="btn btn-secondary" onClick={fetchBills}>
          <RefreshCw size={14} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="table-container">
        <div className="table-header-tools">
          <div style={{ position: 'relative', width: '320px' }}>
            <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '11px' }} />
            <input
              type="text"
              className="form-control"
              style={{ paddingLeft: '36px' }}
              placeholder="Search invoice number (e.g. INV-2026...)"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {bills.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <Receipt size={32} color="#94A3B8" style={{ marginBottom: '8px' }} />
            <div>No sales bills found.</div>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice Number</th>
                <th>Date & Time</th>
                <th>Payment Method</th>
                <th>Items Count</th>
                <th>Cashier / Pharmacist</th>
                <th>Total Amount</th>
                <th>Sync Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {bills.map((bill) => (
                <tr key={bill.id}>
                  <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{bill.invoiceNumber}</td>
                  <td>{bill.date} {bill.time}</td>
                  <td>
                    <span className="badge" style={{ background: '#F1F5F9', color: '#0F172A' }}>
                      {bill.paymentMethod}
                    </span>
                  </td>
                  <td>{bill.items.length} items</td>
                  <td>{bill.createdByName}</td>
                  <td style={{ fontWeight: 800, color: '#0F766E', fontSize: '15px' }}>
                    ₹{bill.totalAmount.toFixed(2)}
                  </td>
                  <td>
                    {bill.isOfflineCreated && bill.syncStatus === 'PENDING' ? (
                      <span className="badge badge-low-stock">Offline Pending</span>
                    ) : (
                      <span className="badge badge-in-stock">Synced</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => setSelectedBillForPrint(bill)}
                      title="Reprint Invoice"
                    >
                      <Printer size={14} />
                      <span>Reprint</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedBillForPrint && (
        <PrintInvoiceModal
          bill={selectedBillForPrint}
          onClose={() => setSelectedBillForPrint(null)}
        />
      )}
    </div>
  );
};
