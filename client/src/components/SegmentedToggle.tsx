import React from 'react';
import { motion } from 'framer-motion';
import { Table, MapPin } from 'lucide-react';

interface SegmentedToggleProps {
  value: 'table' | 'map';
  onChange: (value: 'table' | 'map') => void;
}

export const SegmentedToggle: React.FC<SegmentedToggleProps> = ({ value, onChange }) => {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: '#F1F5F9',
        padding: '4px',
        borderRadius: '14px',
        border: '1px solid #CBD5E1',
        boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.05)',
        position: 'relative'
      }}
    >
      {/* Option 1: Table Directory */}
      <button
        type="button"
        onClick={() => onChange('table')}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: '7px',
          padding: '7px 16px',
          fontSize: '13px',
          fontWeight: 700,
          borderRadius: '10px',
          border: 'none',
          background: 'transparent',
          color: value === 'table' ? '#FFFFFF' : '#475569',
          cursor: 'pointer',
          zIndex: 1,
          transition: 'color 0.2s ease',
          outline: 'none'
        }}
      >
        {value === 'table' && (
          <motion.div
            layoutId="segmentedToggleActivePill"
            transition={{
              type: 'spring',
              stiffness: 600,
              damping: 38,
              mass: 0.6
            }}
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '10px',
              background: '#2563EB',
              boxShadow: '0 3px 10px rgba(37, 99, 235, 0.32), 0 1px 2px rgba(0, 0, 0, 0.1)',
              zIndex: -1
            }}
          />
        )}
        <Table size={16} color={value === 'table' ? '#FFFFFF' : '#64748B'} />
        <span>Table Directory</span>
      </button>

      {/* Option 2: Physical Storage Map */}
      <button
        type="button"
        onClick={() => onChange('map')}
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: '7px',
          padding: '7px 16px',
          fontSize: '13px',
          fontWeight: 700,
          borderRadius: '10px',
          border: 'none',
          background: 'transparent',
          color: value === 'map' ? '#FFFFFF' : '#475569',
          cursor: 'pointer',
          zIndex: 1,
          transition: 'color 0.2s ease',
          outline: 'none'
        }}
      >
        {value === 'map' && (
          <motion.div
            layoutId="segmentedToggleActivePill"
            transition={{
              type: 'spring',
              stiffness: 600,
              damping: 38,
              mass: 0.6
            }}
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '10px',
              background: '#2563EB',
              boxShadow: '0 3px 10px rgba(37, 99, 235, 0.32), 0 1px 2px rgba(0, 0, 0, 0.1)',
              zIndex: -1
            }}
          />
        )}
        <MapPin size={16} color={value === 'map' ? '#FFFFFF' : '#64748B'} />
        <span>Physical Storage Map</span>
      </button>
    </div>
  );
};
