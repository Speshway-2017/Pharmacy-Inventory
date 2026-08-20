import React, { useEffect, useState } from 'react';
import { Bill, PharmacySettings } from '../../../shared/types';
import { apiService } from '../services/api';
import { Printer, X, Receipt, Check } from 'lucide-react';

interface PrintInvoiceModalProps {
  bill: Bill;
  onClose: () => void;
}

export const PrintInvoiceModal: React.FC<PrintInvoiceModalProps> = ({ bill, onClose }) => {
  const [settings, setSettings] = useState<PharmacySettings | null>(null);
  const [printed, setPrinted] = useState<boolean>(false);

  useEffect(() => {
    apiService.getSettings().then((res) => {
      if (res.success) setSettings(res.settings);
    });
  }, []);

  const handlePrint = async () => {
    const printElement = document.getElementById('printable-invoice');
    if (!printElement) return;

    if (window.electronAPI?.printInvoice) {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invoice - ${bill.invoiceNumber}</title>
          <style>
            body { font-family: 'Inter', Arial, sans-serif; font-size: 12px; margin: 0; padding: 20px; color: #000; }
            .header { text-align: center; margin-bottom: 15px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
            .pharmacy-name { font-size: 18px; font-weight: bold; }
            .details { display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 11px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
            th { border-bottom: 1px solid #000; border-top: 1px solid #000; padding: 6px 4px; text-align: left; font-size: 11px; }
            td { padding: 6px 4px; font-size: 11px; }
            .total-section { border-top: 1px dashed #000; padding-top: 8px; text-align: right; }
            .total-row { font-size: 14px; font-weight: bold; }
            .footer { text-align: center; margin-top: 20px; font-size: 10px; }
          </style>
        </head>
        <body>
          ${printElement.innerHTML}
        </body>
        </html>
      `;
      const result = await window.electronAPI.printInvoice(htmlContent);
      if (result.success) setPrinted(true);
    } else {
      window.print();
      setPrinted(true);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '680px' }}>
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Receipt size={18} color="var(--primary-teal)" />
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Sales Receipt & Print Confirmation</h3>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onClose} style={{ padding: '4px 8px' }}>
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ background: '#F8FAFC', padding: '20px' }}>
          <div
            id="printable-invoice"
            style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
              fontFamily: 'Inter, sans-serif'
            }}
          >
            {/* Pharmacy Header */}
            <div style={{ textAlign: 'center', borderBottom: '2px solid #0F766E', paddingBottom: '14px', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F766E', margin: 0, letterSpacing: '-0.3px' }}>
                {settings?.pharmacyName || 'Pharmacy Store'}
              </h2>
              {settings?.address && (
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
                  {settings.address}
                </div>
              )}
              {(settings?.phone || settings?.gstin) && (
                <div style={{ fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                  {settings.phone ? `Phone: ${settings.phone}` : ''} {settings.phone && settings.gstin ? ' | ' : ''} {settings.gstin ? `GSTIN: ${settings.gstin}` : ''}
                </div>
              )}
            </div>

            {/* Bill Details Box */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                marginBottom: '16px',
                fontSize: '12px',
                background: '#F1F5F9',
                border: '1px solid #E2E8F0',
                padding: '12px 16px',
                borderRadius: '8px'
              }}
            >
              <div>
                <div style={{ marginBottom: '3px' }}>
                  <span style={{ color: '#64748B' }}>Invoice No: </span>
                  <strong style={{ color: 'var(--primary-blue)', fontFamily: 'monospace' }}>{bill.invoiceNumber}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B' }}>Date & Time: </span>
                  <strong>{bill.date} {bill.time}</strong>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ marginBottom: '3px' }}>
                  <span style={{ color: '#64748B' }}>Payment Method: </span>
                  <strong style={{ background: '#E2E8F0', padding: '2px 6px', borderRadius: '4px' }}>{bill.paymentMethod}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B' }}>Cashier: </span>
                  <strong>{bill.createdByName}</strong>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0', textTransform: 'uppercase', fontSize: '11px', color: '#64748B' }}>
                  <th style={{ padding: '8px 10px', textAlign: 'left' }}>Item Description</th>
                  <th style={{ padding: '8px 10px', textAlign: 'left' }}>Batch</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>Qty</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Unit Price</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Total (₹)</th>
                </tr>
              </thead>
              <tbody>
                {bill?.items && bill.items.map((item, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '8px 10px' }}>
                      <div style={{ fontWeight: 600, color: '#0F172A' }}>{item.name}</div>
                      {item.genericName && (
                        <div style={{ fontSize: '10px', color: '#64748B' }}>{item.genericName}</div>
                      )}
                    </td>
                    <td style={{ padding: '8px 10px', fontFamily: 'monospace' }}>{item.batchNumber}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700 }}>
                      {item.quantity} {item.unitType === 'LOOSE' ? `(${item.looseUnitName || 'Loose'})` : 'Pkg'}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'right' }}>₹{(Number(item.unitPrice) || 0).toFixed(2)}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#0F766E' }}>
                      ₹{(Number(item.totalPrice) || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals Summary */}
            <div
              style={{
                borderTop: '2px solid #E2E8F0',
                paddingTop: '12px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: '4px',
                fontSize: '13px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '220px', color: '#64748B' }}>
                <span>Subtotal:</span>
                <span style={{ fontWeight: 600, color: '#0F172A' }}>₹{(Number(bill.subtotal) || 0).toFixed(2)}</span>
              </div>

              {(Number(bill.discountAmount) || 0) > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '220px', color: '#16A34A' }}>
                  <span>Discount ({bill.discountPercentage || 0}%):</span>
                  <span style={{ fontWeight: 600 }}>-₹{(Number(bill.discountAmount) || 0).toFixed(2)}</span>
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  width: '220px',
                  fontSize: '16px',
                  fontWeight: 800,
                  color: '#0F766E',
                  marginTop: '6px',
                  borderTop: '1px dashed #CBD5E1',
                  paddingTop: '6px'
                }}
              >
                <span>TOTAL:</span>
                <span>₹{(Number(bill.totalAmount) || 0).toFixed(2)}</span>
              </div>
            </div>

            {/* Footer Note */}
            <div
              style={{
                textAlign: 'center',
                marginTop: '20px',
                paddingTop: '12px',
                borderTop: '1px dashed #E2E8F0',
                fontSize: '11px',
                color: '#64748B'
              }}
            >
              {settings?.invoiceFooter || 'Thank you for your business!'}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close Window
          </button>
          <button className="btn btn-primary btn-lg" onClick={handlePrint}>
            <Printer size={18} />
            <span>Print Official Invoice</span>
          </button>
        </div>
      </div>
    </div>
  );
};
