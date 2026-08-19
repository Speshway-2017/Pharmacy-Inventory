import React, { useEffect, useState } from 'react';
import { PharmacySettings } from '../../../shared/types';
import { apiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Save, Building, Printer, Sliders, CheckCircle } from 'lucide-react';

export const Settings: React.FC = () => {
  const { isAdmin } = useAuth();
  const [settings, setSettings] = useState<PharmacySettings>({
    pharmacyName: 'MedPlus Health Pharmacy',
    address: '123 Healthcare Boulevard, Station Road, Tech City',
    phone: '+91 98765 43210',
    email: 'contact@medplushealth.com',
    gstin: '36AAACM1234F1Z5',
    invoicePrefix: 'INV',
    invoiceFooter: 'Thank you for choosing MedPlus Health. Wishing you good health!',
    printerType: 'THERMAL_80MM',
    printerName: 'Default Printer',
    autoPrintInvoice: true,
    lowStockThresholdDefault: 10,
    expiryWarningDays: 90
  });

  const [availablePrinters, setAvailablePrinters] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    apiService.getSettings().then((res) => {
      if (res.success && res.settings) {
        setSettings(res.settings);
      }
    });

    if (window.electronAPI?.getPrinters) {
      window.electronAPI.getPrinters().then((printers) => {
        setAvailablePrinters(printers || []);
      });
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg(null);
    try {
      await apiService.updateSettings(settings);
      setSuccessMsg('Pharmacy settings updated successfully.');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      alert('Failed to update settings.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
          System & Pharmacy Settings
        </h2>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Configure invoice header, printer integration, and alert thresholds
        </div>
      </div>

      {successMsg && (
        <div
          style={{
            background: '#DCFCE7',
            color: '#15803D',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <CheckCircle size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Pharmacy Profile Section */}
        <div className="table-container" style={{ padding: '20px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid #E2E8F0', paddingBottom: '10px' }}>
            <Building size={18} color="var(--primary-teal)" />
            <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Pharmacy Profile</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Pharmacy Name *</label>
              <input
                type="text"
                className="form-control"
                value={settings.pharmacyName}
                onChange={e => setSettings({ ...settings, pharmacyName: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">GSTIN / License Number</label>
              <input
                type="text"
                className="form-control"
                value={settings.gstin}
                onChange={e => setSettings({ ...settings, gstin: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Full Address</label>
            <input
              type="text"
              className="form-control"
              value={settings.address}
              onChange={e => setSettings({ ...settings, address: e.target.value })}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input
                type="text"
                className="form-control"
                value={settings.phone}
                onChange={e => setSettings({ ...settings, phone: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-control"
                value={settings.email}
                onChange={e => setSettings({ ...settings, email: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Invoice & Printer Configuration */}
        <div className="table-container" style={{ padding: '20px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid #E2E8F0', paddingBottom: '10px' }}>
            <Printer size={18} color="var(--primary-teal)" />
            <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Invoice & Thermal Printing Settings</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Invoice Prefix</label>
              <input
                type="text"
                className="form-control"
                value={settings.invoicePrefix}
                onChange={e => setSettings({ ...settings, invoicePrefix: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Printer Format</label>
              <select
                className="form-control"
                value={settings.printerType}
                onChange={e => setSettings({ ...settings, printerType: e.target.value as any })}
              >
                <option value="THERMAL_80MM">Thermal Printer (80mm Receipt)</option>
                <option value="A4_STANDARD">Standard Printer (A4 Paper)</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Select System Printer Hardware</label>
            <select
              className="form-control"
              value={settings.printerName}
              onChange={e => setSettings({ ...settings, printerName: e.target.value })}
            >
              <option value="Default Printer">Default OS Printer</option>
              {availablePrinters.map((p, i) => (
                <option key={i} value={p.name}>{p.name} {p.isDefault ? '(Default)' : ''}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Invoice Footer Note</label>
            <input
              type="text"
              className="form-control"
              value={settings.invoiceFooter}
              onChange={e => setSettings({ ...settings, invoiceFooter: e.target.value })}
            />
          </div>
        </div>

        {/* Threshold Settings */}
        <div className="table-container" style={{ padding: '20px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid #E2E8F0', paddingBottom: '10px' }}>
            <Sliders size={18} color="var(--primary-teal)" />
            <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Alert Thresholds</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Default Low Stock Alert Quantity</label>
              <input
                type="number"
                className="form-control"
                value={settings.lowStockThresholdDefault}
                onChange={e => setSettings({ ...settings, lowStockThresholdDefault: Number(e.target.value) })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Expiry Warning Range (Days)</label>
              <input
                type="number"
                className="form-control"
                value={settings.expiryWarningDays}
                onChange={e => setSettings({ ...settings, expiryWarningDays: Number(e.target.value) })}
              />
            </div>
          </div>
        </div>

        <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
          <Save size={18} />
          <span>{loading ? 'Saving...' : 'Save All Settings'}</span>
        </button>
      </form>
    </div>
  );
};
