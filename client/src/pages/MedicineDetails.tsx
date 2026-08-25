import React, { useState } from 'react';
import { Medicine, MedicineStatus } from '../../../shared/types';
import { StockAdjustModal } from '../components/StockAdjustModal';
import { AddStockModal } from '../components/AddStockModal';
import { apiService } from '../services/api';
import {
  ArrowLeft,
  Edit2,
  PlusCircle,
  Sliders,
  Package,
  Calendar,
  DollarSign,
  MapPin,
  Barcode,
  ShieldAlert,
  Tag,
  Layers,
  FileText,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Clock
} from 'lucide-react';

interface MedicineDetailsProps {
  medicine: Medicine;
  onBack: () => void;
  onEdit: (med: Medicine) => void;
  onRefresh?: () => void;
}

export const MedicineDetails: React.FC<MedicineDetailsProps> = ({
  medicine: initialMedicine,
  onBack,
  onEdit,
  onRefresh
}) => {
  const [medicine, setMedicine] = useState<Medicine>(initialMedicine);
  const [showAddStockModal, setShowAddStockModal] = useState<boolean>(false);
  const [showAdjustModal, setShowAdjustModal] = useState<boolean>(false);

  const fetchUpdatedMedicine = async () => {
    try {
      const res = await apiService.getMedicines({});
      if (res.success && res.medicines) {
        const updated = res.medicines.find((m: Medicine) => m.id === medicine.id);
        if (updated) setMedicine(updated);
      }
    } catch (err) {
      console.error('Failed to reload medicine details:', err);
    }
    if (onRefresh) onRefresh();
  };

  const renderStatusBadge = (status: MedicineStatus) => {
    switch (status) {
      case 'IN_STOCK':
        return (
          <span className="badge badge-in-stock" style={{ padding: '6px 14px', fontSize: '12px' }}>
            <CheckCircle2 size={13} style={{ marginRight: '4px' }} /> In Stock
          </span>
        );
      case 'LOW_STOCK':
        return (
          <span className="badge badge-low-stock" style={{ padding: '6px 14px', fontSize: '12px' }}>
            <AlertTriangle size={13} style={{ marginRight: '4px' }} /> Low Stock Alert
          </span>
        );
      case 'EXPIRING':
        return (
          <span className="badge badge-expiring" style={{ padding: '6px 14px', fontSize: '12px' }}>
            <Clock size={13} style={{ marginRight: '4px' }} /> Expiring Soon
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="badge badge-expired" style={{ padding: '6px 14px', fontSize: '12px' }}>
            <ShieldAlert size={13} style={{ marginRight: '4px' }} /> Expired
          </span>
        );
      case 'INACTIVE':
        return (
          <span className="badge badge-inactive" style={{ padding: '6px 14px', fontSize: '12px' }}>
            Inactive
          </span>
        );
      default:
        return <span className="badge badge-inactive">{status}</span>;
    }
  };

  const unitsPerPkg = Math.max(1, medicine.unitsPerPackage || 1);
  const totalBaseQty = medicine.quantity || 0;
  const pkgQty = Math.floor(totalBaseQty / unitsPerPkg);
  const looseQty = totalBaseQty % unitsPerPkg;
  const pkgName = medicine.packageType || 'Strip';
  const looseName = medicine.looseUnitName || 'Tablet';

  const sellingPrice = Number(medicine.sellingPrice) || 0;
  const mrpPrice = Number(medicine.mrp) || sellingPrice;
  const loosePrice = sellingPrice / unitsPerPkg;
  const totalValuation = (totalBaseQty / unitsPerPkg) * sellingPrice;

  const locParts = [];
  if (medicine.rack) locParts.push(`Rack ${medicine.rack}`);
  if (medicine.row) locParts.push(`Row ${medicine.row}`);
  if (medicine.column) locParts.push(`Col ${medicine.column}`);
  if (medicine.shelfBin) locParts.push(`Bin ${medicine.shelfBin}`);

  return (
    <div style={{ paddingBottom: '40px' }}>
      {/* Header Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button className="btn btn-secondary" onClick={onBack} style={{ padding: '8px 14px' }}>
            <ArrowLeft size={16} />
            <span>Back to Inventory</span>
          </button>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 className="page-title" style={{ margin: 0, fontSize: '22px' }}>
                {medicine.name} {medicine.strength ? `(${medicine.strength})` : ''}
              </h2>
              {renderStatusBadge(medicine.status)}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Code: <strong style={{ fontFamily: 'monospace', color: 'var(--primary-blue)' }}>{medicine.code || `MED-${medicine.id.slice(-6).toUpperCase()}`}</strong>
              {medicine.manufacturer && ` • Manufacturer: ${medicine.manufacturer}`}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="btn btn-secondary"
            onClick={() => setShowAddStockModal(true)}
            style={{ color: '#0F766E' }}
          >
            <PlusCircle size={15} />
            <span>Add Stock</span>
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => setShowAdjustModal(true)}
          >
            <Sliders size={15} />
            <span>Adjust Stock</span>
          </button>
          <button
            className="btn btn-primary"
            onClick={() => onEdit(medicine)}
          >
            <Edit2 size={15} />
            <span>Edit Details</span>
          </button>
        </div>
      </div>

      {/* Top Highlights Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {/* Stock Level Card */}
        <div style={{ background: '#FFFFFF', padding: '18px 20px', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Current Stock
            </span>
            <div style={{ width: '32px', height: '32px', background: '#DBEAFE', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Package size={16} color="#2563EB" />
            </div>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A' }}>
            {pkgQty} <span style={{ fontSize: '14px', fontWeight: 600, color: '#475569' }}>{pkgName}s</span>
            {looseQty > 0 && <span style={{ fontSize: '14px', fontWeight: 600, color: '#0F766E', marginLeft: '6px' }}>+ {looseQty} {looseName}s</span>}
          </div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
            Total Base: <strong>{totalBaseQty} {looseName}s</strong> (Reorder Level: {medicine.reorderLevel || 10})
          </div>
        </div>

        {/* Selling Price Card */}
        <div style={{ background: '#FFFFFF', padding: '18px 20px', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Selling Price
            </span>
            <div style={{ width: '32px', height: '32px', background: '#D1FAE5', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={16} color="#10B981" />
            </div>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#0F766E' }}>
            ₹{sellingPrice.toFixed(2)} <span style={{ fontSize: '12px', fontWeight: 500, color: '#64748B' }}>/ {pkgName}</span>
          </div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
            MRP: <strong>₹{mrpPrice.toFixed(2)}</strong> | Loose Unit: <strong>₹{loosePrice.toFixed(2)} / {looseName}</strong>
          </div>
        </div>

        {/* Batch & Expiry Card */}
        <div style={{ background: '#FFFFFF', padding: '18px 20px', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Batch & Expiry
            </span>
            <div style={{ width: '32px', height: '32px', background: '#FEF3C7', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calendar size={16} color="#F59E0B" />
            </div>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'monospace', color: '#1E293B' }}>
            {medicine.batchNumber || 'N/A'}
          </div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
            Expires: <strong>{medicine.expiryDate || 'N/A'}</strong>
          </div>
        </div>

        {/* Location Card */}
        <div style={{ background: '#FFFFFF', padding: '18px 20px', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              Shelf Location
            </span>
            <div style={{ width: '32px', height: '32px', background: '#EDE9FE', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MapPin size={16} color="#8B5CF6" />
            </div>
          </div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#1E293B' }}>
            {locParts.length > 0 ? locParts.join(' → ') : 'Unassigned'}
          </div>
          <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
            Status: {medicine.status}
          </div>
        </div>
      </div>

      {/* Main Details Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        {/* Left Column: Specifications */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* General & Pharmaceutical Information */}
          <div className="table-container" style={{ padding: '20px' }}>
            <h3 className="section-title" style={{ fontSize: '16px', marginBottom: '16px' }}>
              General & Pharmaceutical Specifications
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '13.5px' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Medicine Name</div>
                <div style={{ fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>{medicine.name}</div>
              </div>

              <div>
                <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Generic Name</div>
                <div style={{ fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>{medicine.genericName || 'N/A'}</div>
              </div>

              <div>
                <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Dosage Form & Strength</div>
                <div style={{ fontWeight: 600, color: '#334155', marginTop: '2px' }}>
                  {medicine.dosageForm || 'Tablet'} {medicine.strength ? `(${medicine.strength})` : ''}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Category</div>
                <div style={{ fontWeight: 600, color: '#334155', marginTop: '2px' }}>{medicine.category || 'General'}</div>
              </div>

              <div>
                <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Manufacturer / Brand</div>
                <div style={{ fontWeight: 600, color: '#334155', marginTop: '2px' }}>{medicine.manufacturer || 'Standard Pharma'}</div>
              </div>

              <div>
                <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Batch Number</div>
                <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>
                  {medicine.batchNumber}
                </div>
              </div>
            </div>
          </div>

          {/* Packaging & Unit Configuration */}
          <div className="table-container" style={{ padding: '20px' }}>
            <h3 className="section-title" style={{ fontSize: '16px', marginBottom: '16px' }}>
              Packaging & Counter Selling Config
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '13.5px' }}>
              <div>
                <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Package Container Type</div>
                <div style={{ fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>{pkgName}</div>
              </div>

              <div>
                <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Base Loose Unit Name</div>
                <div style={{ fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>{looseName}</div>
              </div>

              <div>
                <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Units Per Package</div>
                <div style={{ fontWeight: 700, color: '#2563EB', marginTop: '2px' }}>
                  {unitsPerPkg} {looseName}s per {pkgName}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Allowed Counter Selling Mode</div>
                <div style={{ marginTop: '2px' }}>
                  {medicine.sellingMode === 'FULL_PACKAGE_AND_LOOSE' ? (
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#0F766E', background: '#E0F2FE', padding: '3px 8px', borderRadius: '4px' }}>
                      Full Package + Loose Units Allowed
                    </span>
                  ) : (
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', background: '#F1F5F9', padding: '3px 8px', borderRadius: '4px' }}>
                      Full Package Only
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Identifiers & Financials */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Identifiers & Codes */}
          <div className="table-container" style={{ padding: '20px' }}>
            <h3 className="section-title" style={{ fontSize: '15px', marginBottom: '14px' }}>
              Identifiers & Barcodes
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>System Item Code</div>
                <div style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary-blue)', fontSize: '14px', marginTop: '2px' }}>
                  {medicine.code || `MED-${medicine.id.slice(-6).toUpperCase()}`}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 600 }}>EAN / Barcode Number</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'monospace', fontWeight: 700, color: '#1E293B', marginTop: '2px' }}>
                  <Barcode size={16} color="#64748B" />
                  <span>{medicine.barcode || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing & Financial Summary */}
          <div className="table-container" style={{ padding: '20px' }}>
            <h3 className="section-title" style={{ fontSize: '15px', marginBottom: '14px' }}>
              Financial Summary
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px dashed #E2E8F0' }}>
                <span style={{ color: '#64748B' }}>MRP Price:</span>
                <strong>₹{mrpPrice.toFixed(2)} / {pkgName}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px dashed #E2E8F0' }}>
                <span style={{ color: '#64748B' }}>Selling Price:</span>
                <strong style={{ color: '#0F766E' }}>₹{sellingPrice.toFixed(2)} / {pkgName}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px dashed #E2E8F0' }}>
                <span style={{ color: '#64748B' }}>Loose Unit Selling Price:</span>
                <strong>₹{loosePrice.toFixed(2)} / {looseName}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '4px' }}>
                <span style={{ color: '#64748B' }}>Total Asset Valuation:</span>
                <strong style={{ color: 'var(--primary-blue)', fontSize: '14px' }}>₹{totalValuation.toFixed(2)}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Stock Shipment Modal */}
      {showAddStockModal && (
        <AddStockModal
          medicine={medicine}
          onClose={() => setShowAddStockModal(false)}
          onSuccess={() => {
            setShowAddStockModal(false);
            fetchUpdatedMedicine();
          }}
        />
      )}

      {/* Stock Adjustment Modal */}
      {showAdjustModal && (
        <StockAdjustModal
          medicine={medicine}
          onClose={() => setShowAdjustModal(false)}
          onSuccess={() => {
            setShowAdjustModal(false);
            fetchUpdatedMedicine();
          }}
        />
      )}
    </div>
  );
};
