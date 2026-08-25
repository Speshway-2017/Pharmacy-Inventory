import React, { useState, useMemo } from 'react';
import { Medicine, MedicineStatus } from '../../../shared/types';
import {
  MapPin,
  Package,
  Layers,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldAlert,
  Grid,
  Box,
  CornerDownRight
} from 'lucide-react';

interface PhysicalStorageMapProps {
  medicines: Medicine[];
  onViewMedicineDetails?: (med: Medicine) => void;
}

export const PhysicalStorageMap: React.FC<PhysicalStorageMapProps> = ({
  medicines,
  onViewMedicineDetails
}) => {
  const [selectedRack, setSelectedRack] = useState<string>('ALL');
  const [mapSearchTerm, setMapSearchTerm] = useState<string>('');

  // Extract unique racks
  const availableRacks = useMemo(() => {
    const rackSet = new Set<string>();
    medicines.forEach(m => {
      if (m.rack) rackSet.add(m.rack.trim().toUpperCase());
    });
    return Array.from(rackSet).sort();
  }, [medicines]);

  // Filter medicines for the physical map
  const filteredMedicines = useMemo(() => {
    return medicines.filter(m => {
      const rackUpper = (m.rack || '').trim().toUpperCase();
      const matchesRack =
        selectedRack === 'ALL'
          ? true
          : selectedRack === 'UNASSIGNED'
          ? !m.rack
          : rackUpper === selectedRack;

      const term = mapSearchTerm.toLowerCase().trim();
      const matchesSearch =
        !term ||
        [
          m.name,
          m.code,
          m.genericName,
          m.rack,
          m.row,
          m.column,
          m.shelfBin
        ].some(val => val && val.toLowerCase().includes(term));

      return matchesRack && matchesSearch;
    });
  }, [medicines, selectedRack, mapSearchTerm]);

  // Group medicines by Rack -> Row -> Column
  const rackGroups = useMemo(() => {
    const groups: Record<
      string,
      Record<string, Record<string, Medicine[]>>
    > = {};

    filteredMedicines.forEach(med => {
      const rackKey = med.rack ? `Rack ${med.rack.toUpperCase()}` : 'Unassigned Location';
      const rowKey = med.row ? `Row ${med.row}` : 'Row Unspecified';
      const colKey = med.column ? `Column ${med.column}` : 'Col Unspecified';

      if (!groups[rackKey]) groups[rackKey] = {};
      if (!groups[rackKey][rowKey]) groups[rackKey][rowKey] = {};
      if (!groups[rackKey][rowKey][colKey]) groups[rackKey][rowKey][colKey] = [];

      groups[rackKey][rowKey][colKey].push(med);
    });

    return groups;
  }, [filteredMedicines]);

  // Stat Counts
  const totalAssigned = useMemo(() => medicines.filter(m => m.rack || m.row || m.column || m.shelfBin).length, [medicines]);
  const totalUnassigned = useMemo(() => medicines.filter(m => !m.rack && !m.row && !m.column && !m.shelfBin).length, [medicines]);

  const renderStatusBadge = (status: MedicineStatus) => {
    switch (status) {
      case 'IN_STOCK':
        return (
          <span style={{ fontSize: '10.5px', background: '#DCFCE7', color: '#15803D', padding: '2px 7px', borderRadius: '4px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
            <CheckCircle2 size={10} /> In Stock
          </span>
        );
      case 'LOW_STOCK':
        return (
          <span style={{ fontSize: '10.5px', background: '#FEF3C7', color: '#B45309', padding: '2px 7px', borderRadius: '4px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
            <AlertTriangle size={10} /> Low Stock
          </span>
        );
      case 'EXPIRING':
        return (
          <span style={{ fontSize: '10.5px', background: '#FFEDD5', color: '#C2410C', padding: '2px 7px', borderRadius: '4px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
            <Clock size={10} /> Expiring
          </span>
        );
      case 'EXPIRED':
        return (
          <span style={{ fontSize: '10.5px', background: '#FEE2E2', color: '#B91C1C', padding: '2px 7px', borderRadius: '4px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
            <ShieldAlert size={10} /> Expired
          </span>
        );
      default:
        return (
          <span style={{ fontSize: '10.5px', background: '#F1F5F9', color: '#64748B', padding: '2px 7px', borderRadius: '4px', fontWeight: 600 }}>
            {status}
          </span>
        );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Storage Overview Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
          borderRadius: '16px',
          padding: '20px 24px',
          color: '#FFFFFF',
          boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.25)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <MapPin size={22} color="#60A5FA" />
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#F8FAFC' }}>
              Physical Storage Layout Map
            </h3>
          </div>
          <p style={{ margin: '4px 0 0 32px', fontSize: '13px', color: '#94A3B8' }}>
            Graphical 2D representation of pharmacy physical racks, rows, columns & shelf bins
          </p>
        </div>

        {/* Quick Stats Badges */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '8px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>Active Racks</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#60A5FA' }}>{availableRacks.length}</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '8px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>Mapped Items</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#34D399' }}>{totalAssigned}</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '8px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase' }}>Unassigned</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#F87171' }}>{totalUnassigned}</div>
          </div>
        </div>
      </div>

      {/* Racks Selector & Search Controls Bar */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '14px',
          padding: '14px 18px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          {/* Rack Selector Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginRight: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Layers size={14} color="#6366F1" /> RACK SELECTOR:
            </span>

            <button
              className={`btn btn-sm ${selectedRack === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ borderRadius: '8px', padding: '5px 12px', fontSize: '12px', fontWeight: 700 }}
              onClick={() => setSelectedRack('ALL')}
            >
              All Racks ({medicines.length})
            </button>

            {availableRacks.map(rack => (
              <button
                key={rack}
                className={`btn btn-sm ${selectedRack === rack ? 'btn-primary' : 'btn-secondary'}`}
                style={{ borderRadius: '8px', padding: '5px 12px', fontSize: '12px', fontWeight: 700 }}
                onClick={() => setSelectedRack(rack)}
              >
                Rack {rack}
              </button>
            ))}

            {totalUnassigned > 0 && (
              <button
                className={`btn btn-sm ${selectedRack === 'UNASSIGNED' ? 'btn-danger' : 'btn-secondary'}`}
                style={{ borderRadius: '8px', padding: '5px 12px', fontSize: '12px', fontWeight: 700 }}
                onClick={() => setSelectedRack('UNASSIGNED')}
              >
                Unassigned ({totalUnassigned})
              </button>
            )}
          </div>

          {/* Map Search Bar */}
          <div style={{ position: 'relative', width: '260px' }}>
            <Search size={15} color="#94A3B8" style={{ position: 'absolute', left: '10px', top: '10px' }} />
            <input
              type="text"
              className="form-control"
              style={{ paddingLeft: '32px', borderRadius: '8px', height: '34px', fontSize: '12.5px' }}
              placeholder="Search rack, row, col, bin or med..."
              value={mapSearchTerm}
              onChange={e => setMapSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Graphical Storage Grid Layout */}
      {Object.keys(rackGroups).length === 0 ? (
        <div style={{ padding: '60px 40px', textAlign: 'center', background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', color: '#64748B' }}>
          <Package size={40} color="#94A3B8" style={{ marginBottom: '10px' }} />
          <div style={{ fontSize: '16px', fontWeight: 700, color: '#334155' }}>No physical storage locations match your filter.</div>
          <p style={{ fontSize: '13px', color: '#94A3B8', marginTop: '4px' }}>Try switching rack selector or clearing map search term.</p>
        </div>
      ) : (
        Object.entries(rackGroups).map(([rackTitle, rowMap]) => (
          <div
            key={rackTitle}
            style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 4px 16px rgba(15,23,42,0.04)'
            }}
          >
            {/* Rack Header Bar */}
            <div
              style={{
                background: 'linear-gradient(90deg, #F8FAFC 0%, #EEF2FF 100%)',
                padding: '14px 20px',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ background: '#4F46E5', color: '#FFFFFF', padding: '6px 12px', borderRadius: '8px', fontWeight: 800, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Grid size={14} />
                  <span>{rackTitle}</span>
                </div>
                <span style={{ fontSize: '12.5px', color: '#64748B', fontWeight: 600 }}>
                  Contains {Object.values(rowMap).reduce((acc, colMap) => acc + Object.values(colMap).flat().length, 0)} medicines
                </span>
              </div>
            </div>

            {/* Row & Column Matrix Container */}
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {Object.entries(rowMap).map(([rowTitle, colMap]) => (
                <div
                  key={rowTitle}
                  style={{
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '12px',
                    padding: '16px'
                  }}
                >
                  {/* Row Title */}
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#334155', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CornerDownRight size={14} color="#6366F1" />
                    <span>{rowTitle}</span>
                  </div>

                  {/* Graphical Columns Grid */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                      gap: '14px'
                    }}
                  >
                    {Object.entries(colMap).map(([colTitle, meds]) => (
                      <div
                        key={colTitle}
                        style={{
                          background: '#FFFFFF',
                          border: '1px dashed #CBD5E1',
                          borderRadius: '10px',
                          padding: '12px'
                        }}
                      >
                        {/* Column Header */}
                        <div style={{ fontSize: '11.5px', fontWeight: 700, color: '#4F46E5', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ background: '#EEF2FF', padding: '2px 8px', borderRadius: '4px', border: '1px solid #C7D2FE' }}>
                            {colTitle}
                          </span>
                        </div>

                        {/* Medicine Storage Cards inside Column */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {meds.map(med => (
                            <div
                              key={med.id}
                              style={{
                                background: '#F8FAFC',
                                border: '1px solid #E2E8F0',
                                borderRadius: '8px',
                                padding: '10px 12px',
                                transition: 'all 0.15s ease',
                                cursor: onViewMedicineDetails ? 'pointer' : 'default'
                              }}
                              onClick={() => {
                                if (onViewMedicineDetails) onViewMedicineDetails(med);
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563EB', background: '#EFF6FF', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', border: '1px solid #BFDBFE' }}>
                                  {med.code || `MED-${med.id.slice(-6).toUpperCase()}`}
                                </span>
                                {renderStatusBadge(med.status)}
                              </div>

                              <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '13px', marginBottom: '4px' }}>
                                {med.name} {med.strength ? `(${med.strength})` : ''}
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: '#64748B' }}>
                                <span>Batch: <strong style={{ fontFamily: 'monospace', color: '#475569' }}>{med.batchNumber}</strong></span>
                                <span style={{ fontWeight: 700, color: '#0F766E' }}>{med.quantity} Base Units</span>
                              </div>

                              {/* Shelf Bin Coordinate Pill */}
                              {med.shelfBin && (
                                <div style={{ marginTop: '8px', fontSize: '10.5px', background: '#EEF2FF', color: '#4338CA', padding: '3px 8px', borderRadius: '6px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px', border: '1px solid #C7D2FE' }}>
                                  <Box size={10} color="#6366F1" />
                                  <span>Bin: {med.shelfBin}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
};
