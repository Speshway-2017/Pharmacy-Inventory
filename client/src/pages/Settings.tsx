import React, { useEffect, useState } from 'react';
import { PharmacySettings, Category } from '../../../shared/types';
import { apiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Save,
  Building,
  Printer,
  Sliders,
  CheckCircle,
  RefreshCw,
  Plus,
  Trash2,
  Tag,
  Receipt,
  FileText,
  ShieldCheck
} from 'lucide-react';

export const Settings: React.FC = () => {
  const { isAdmin } = useAuth();
  const [settings, setSettings] = useState<PharmacySettings>({
    pharmacyName: 'Pharmacy Store',
    address: '',
    phone: '',
    email: '',
    gstin: '',
    invoicePrefix: 'INV',
    invoiceFooter: 'Thank you for your business!',
    printerType: 'THERMAL_80MM',
    printerName: 'Default Printer',
    autoPrintInvoice: true,
    lowStockThresholdDefault: 10,
    expiryWarningDays: 90
  });

  // Printer Scanning State
  const [availablePrinters, setAvailablePrinters] = useState<any[]>([]);
  const [isScanningPrinters, setIsScanningPrinters] = useState<boolean>(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  // Dynamic Category Management State
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCatName, setNewCatName] = useState<string>('');
  const [newCatDesc, setNewCatDesc] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchSettings = async () => {
    try {
      const res = await apiService.getSettings();
      if (res.success && res.settings) {
        setSettings(res.settings);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await apiService.getCategories();
      if (res.success && res.categories) {
        setCategories(res.categories);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const handleScanPrinters = async () => {
    setIsScanningPrinters(true);
    setScanMessage('Scanning system for connected physical & network printers...');
    try {
      if (window.electronAPI?.getPrinters) {
        const printers = await window.electronAPI.getPrinters();
        setAvailablePrinters(printers || []);
        if (printers && printers.length > 0) {
          setScanMessage(`Scan complete! Found ${printers.length} connected printer(s).`);
          const defaultP = printers.find(p => p.isDefault);
          if (defaultP && settings.printerName === 'Default Printer') {
            setSettings(prev => ({ ...prev, printerName: defaultP.name }));
          }
        } else {
          setScanMessage('Scan complete. No hardware printers detected by OS.');
        }
      } else {
        setScanMessage('Browser mode detected: Scanned OS default printing service.');
        setAvailablePrinters([{ name: 'Default System Printer', isDefault: true }]);
      }
    } catch (err) {
      setScanMessage('Error scanning system printers.');
    } finally {
      setIsScanningPrinters(false);
      setTimeout(() => setScanMessage(null), 5000);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchCategories();
    handleScanPrinters();
  }, []);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      const res = await apiService.addCategory(newCatName.trim(), newCatDesc.trim());
      if (res.success) {
        setNewCatName('');
        setNewCatDesc('');
        fetchCategories();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to add category.');
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete category '${name}'?`)) return;
    try {
      await apiService.deleteCategory(id);
      fetchCategories();
    } catch (err) {
      alert('Failed to delete category.');
    }
  };

  const handleSubmitSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg(null);
    try {
      await apiService.updateSettings(settings);
      setSuccessMsg('Pharmacy system & printing configurations saved successfully.');
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      alert('Failed to update settings.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ width: '100%' }}>
      <form onSubmit={handleSubmitSettings}>
        {/* Header Action Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 className="page-title" style={{ margin: 0, fontSize: '20px' }}>
              Pharmacy System & Configuration
            </h2>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Manage business credentials, printer hardware, dynamic categories, and alert thresholds
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            <Save size={16} />
            <span>{loading ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>

        {successMsg && (
          <div
            style={{
              background: '#DCFCE7',
              color: '#15803D',
              padding: '12px 16px',
              borderRadius: '10px',
              marginBottom: '20px',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              border: '1px solid #86EFAC'
            }}
          >
            <CheckCircle size={18} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Full Width 2-Column Responsive Dashboard Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '20px', alignItems: 'start' }}>
          
          {/* LEFT COLUMN: Profile, Invoicing & Thresholds */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Card 1: Pharmacy Business Profile */}
            <div className="table-container" style={{ padding: '20px', background: '#FFFFFF' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid #F1F5F9', paddingBottom: '10px' }}>
                <Building size={18} color="var(--primary-teal)" />
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Pharmacy Business Credentials</h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Pharmacy Store Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. HealthCare Pharmacy"
                    value={settings.pharmacyName}
                    onChange={e => setSettings({ ...settings, pharmacyName: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">GSTIN / Drug License Number</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. 27AAAAA0000A1Z5 / DL-12345"
                    value={settings.gstin}
                    onChange={e => setSettings({ ...settings, gstin: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Pharmacy Store Address</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Street Address, City, State, Pincode"
                  value={settings.address}
                  onChange={e => setSettings({ ...settings, address: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Contact Phone Number</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="+91 98765 43210"
                    value={settings.phone}
                    onChange={e => setSettings({ ...settings, phone: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="contact@pharmacy.com"
                    value={settings.email}
                    onChange={e => setSettings({ ...settings, email: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Card 2: Receipt & Invoicing Defaults */}
            <div className="table-container" style={{ padding: '20px', background: '#FFFFFF' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid #F1F5F9', paddingBottom: '10px' }}>
                <Receipt size={18} color="var(--primary-blue)" />
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Receipt & Invoicing Setup</h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Invoice Number Prefix</label>
                  <input
                    type="text"
                    className="form-control"
                    style={{ fontFamily: 'monospace', fontWeight: 600 }}
                    placeholder="e.g. INV"
                    value={settings.invoicePrefix}
                    onChange={e => setSettings({ ...settings, invoicePrefix: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Invoice Footer Note</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Thank you for your business!"
                    value={settings.invoiceFooter}
                    onChange={e => setSettings({ ...settings, invoiceFooter: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px' }}>
                  <input
                    type="checkbox"
                    checked={settings.autoPrintInvoice}
                    onChange={e => setSettings({ ...settings, autoPrintInvoice: e.target.checked })}
                  />
                  <span>Automatically open print dialog after finishing POS sale transaction</span>
                </label>
              </div>
            </div>

            {/* Card 3: Alert Thresholds */}
            <div className="table-container" style={{ padding: '20px', background: '#FFFFFF' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid #F1F5F9', paddingBottom: '10px' }}>
                <Sliders size={18} color="#D97706" />
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Inventory Alert & Expiry Thresholds</h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group">
                  <label className="form-label">Low Stock Warning Quantity (Units)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={settings.lowStockThresholdDefault}
                    onChange={e => setSettings({ ...settings, lowStockThresholdDefault: Number(e.target.value) || 0 })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Expiry Warning Notice (Days)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={settings.expiryWarningDays}
                    onChange={e => setSettings({ ...settings, expiryWarningDays: Number(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: Hardware Printer Scanner & Dynamic Category Manager */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Card 4: Printer Scanner Module */}
            <div className="table-container" style={{ padding: '20px', background: '#FFFFFF' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #F1F5F9', paddingBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Printer size={18} color="#2563EB" />
                  <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Printer Hardware Scanner</h3>
                </div>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleScanPrinters}
                  disabled={isScanningPrinters}
                >
                  <RefreshCw size={13} className={isScanningPrinters ? 'spin-icon' : ''} />
                  <span>{isScanningPrinters ? 'Scanning...' : 'Scan Hardware'}</span>
                </button>
              </div>

              {scanMessage && (
                <div
                  style={{
                    background: '#EFF6FF',
                    color: '#1D4ED8',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    marginBottom: '14px',
                    fontSize: '12px',
                    border: '1px solid #BFDBFE'
                  }}
                >
                  {scanMessage}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Detected Hardware Printers (Select Active Printer)</label>
                <select
                  className="form-control"
                  value={settings.printerName}
                  onChange={e => setSettings({ ...settings, printerName: e.target.value })}
                >
                  <option value="Default Printer">Default OS Printer</option>
                  {availablePrinters.map((p, i) => (
                    <option key={i} value={p.name}>
                      {p.name} {p.isDefault ? '(System Default)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Receipt Print Format</label>
                <select
                  className="form-control"
                  value={settings.printerType}
                  onChange={e => setSettings({ ...settings, printerType: e.target.value as any })}
                >
                  <option value="THERMAL_80MM">Thermal POS Receipt Printer (80mm Roll)</option>
                  <option value="A4_STANDARD">Standard Desktop Printer (A4 Sheet)</option>
                </select>
              </div>
            </div>

            {/* Card 5: Dynamic Category Manager */}
            <div className="table-container" style={{ padding: '20px', background: '#FFFFFF' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid #F1F5F9', paddingBottom: '10px' }}>
                <Tag size={18} color="#059669" />
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Dynamic Category Manager</h3>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>Add or remove categories populated in inventory forms</div>
                </div>
              </div>

              {/* Add Category Form */}
              <div style={{ background: '#F8FAFC', padding: '14px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '8px', color: '#334155' }}>Add New Medicine Category</div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Category name (e.g. Eye Drops, Pediatric)"
                    value={newCatName}
                    onChange={e => setNewCatName(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleAddCategory}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    <Plus size={15} />
                    <span>Add</span>
                  </button>
                </div>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Optional description..."
                  value={newCatDesc}
                  onChange={e => setNewCatDesc(e.target.value)}
                />
              </div>

              {/* Categories Grid List */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px' }}>
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      borderRadius: '8px',
                      padding: '8px 12px'
                    }}
                  >
                    <span style={{ fontWeight: 600, fontSize: '12px', color: '#334155' }}>{cat.name}</span>
                    {isAdmin && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ color: '#DC2626', padding: '2px 6px' }}
                        onClick={() => handleDeleteCategory(cat.id, cat.name)}
                        title="Delete Category"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Full Width Bottom Action Card */}
        <div
          className="table-container"
          style={{
            marginTop: '20px',
            padding: '16px 20px',
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            background: '#FFFFFF'
          }}
        >
          <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
            <Save size={18} />
            <span>{loading ? 'Saving All Settings...' : 'Save All Settings Changes'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
