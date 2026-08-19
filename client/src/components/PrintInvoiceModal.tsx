import React, { useEffect, useState } from 'react';
import { Bill, PharmacySettings } from '../../../shared/types';
import { apiService } from '../services/api';
import { Printer, X, Check } from 'lucide-react';

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
      <div className="modal-content" style={{ maxWidth: '650px' }}>
        <div className="modal-header">
          <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Invoice & Print Preview</h3>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body" style={{ background: '#F8FAFC', padding: '16px' }}>
          <div
            id="printable-invoice"
            style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '8px',
              padding: '24px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
              fontFamily: 'Inter, sans-serif'
            }}
          >
            {/* Pharmacy Header */}
            <div style={{ textAlign: 'center', borderBottom: '2px solid #0F766E', paddingBottom: '12px', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#0F766E', margin: 0 }}>
                {settings?.pharmacyName || 'MedPlus Health Pharmacy'}
              </h2>
              <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
                {settings?.address || '123 Healthcare Boulevard, Tech City'}
              </div>
              <div style={{ fontSize: '11px', color: '#64748B' }}>
                Phone: {settings?.phone || '+91 98765 43210'} | GSTIN: {settings?.gstin || '36AAACM1234F1Z5'}
              </div>
            </div>

            {/* Bill Details */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '12px', background: '#F1F5F9', padding: '10px 14px', borderRadius: '6px' }}>
              <div>
                <div><strong>Invoice No:</strong> {bill.invoiceNumber}</div>
                <div><strong>Date & Time:</strong> {bill.date} {bill.time}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div><strong>Payment:</strong> {bill.paymentMethod}</div>
                <div><strong>Billed By:</strong> {bill.createdByName}</div>
              </div>
            </div>

            {/* Items Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '16px', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', textTransform: 'uppercase', fontSize: '11px', color: '#64748B' }}>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Item</th>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Batch</th>
                  <th style={{ padding: '8px', textAlign: 'center' }}>Qty</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Price</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {bill.items.map((item, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '8px' }}>
                      <div style={{ fontWeight: 600 }}>{item.name}</div>
                      <div style={{ fontSize: '10px', color: '#64748B' }}>{item.genericName}</div>
                    </td>
                    <td style={{ padding: '8px' }}>{item.batchNumber}</td>
                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: 600 }}>{item.quantity}</td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>₹{item.unitPrice.toFixed(2)}</td>
                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600 }}>₹{item.totalPrice.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals Summary */}
            <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '12px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', fontSize: '13px' }}>
              <div>Subtotal: ₹{bill.subtotal.toFixed(2)}</div>
              {bill.discountAmount > 0 && (
                <div style={{ color: '#16A34A' }}>
                  Discount: -₹{bill.discountAmount.toFixed(2)} ({bill.discountPercentage}%)
                </div>
              )}
              <div style={{ fontSize: '16px', fontWeight: 800, color: '#0F766E', marginTop: '6px' }}>
                TOTAL AMOUNT: ₹{bill.totalAmount.toFixed(2)}
              </div>
            </div>

            {/* Footer */}
            <div style={{ textAlign: 'center', marginTop: '24px', paddingTop: '12px', borderTop: '1px dashed #E2E8F0', fontSize: '11px', color: '#64748B' }}>
              {settings?.invoiceFooter || 'Thank you for choosing MedPlus Health. Wishing you good health!'}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          <button className="btn btn-primary" onClick={handlePrint}>
            <Printer size={16} />
            <span>Print Invoice</span>
          </button>
        </div>
      </div>
    </div>
  );
};
