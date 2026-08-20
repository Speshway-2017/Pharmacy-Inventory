import React, { useEffect, useState } from 'react';
import { Pill } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState<number>(15);
  const [statusMessage, setStatusMessage] = useState<string>('Initializing system modules...');

  useEffect(() => {
    const timer1 = setTimeout(() => {
      setProgress(50);
      setStatusMessage('Loading local data & offline engine...');
    }, 400);

    const timer2 = setTimeout(() => {
      setProgress(85);
      setStatusMessage('Verifying system configurations...');
    }, 800);

    const timer3 = setTimeout(() => {
      setProgress(100);
      setStatusMessage('System ready');
    }, 1100);

    const timer4 = setTimeout(() => {
      onComplete();
    }, 1400);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
    };
  }, [onComplete]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#0F172A',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#F8FAFC',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '380px',
          padding: '32px 24px',
          textAlign: 'center'
        }}
      >
        {/* Minimal Icon Container */}
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '14px',
            background: '#1E293B',
            border: '1px solid #334155',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px'
          }}
        >
          <Pill size={28} color="#2563EB" />
        </div>

        {/* Minimal Title & Version */}
        <h1 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 4px 0', color: '#F8FAFC', letterSpacing: '-0.3px' }}>
          XingLin Pharmacy
        </h1>
        <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '32px' }}>
          Inventory & POS Billing Desktop System v1.0
        </div>

        {/* Minimal Progress Bar */}
        <div
          style={{
            width: '100%',
            height: '4px',
            background: '#1E293B',
            borderRadius: '4px',
            overflow: 'hidden',
            marginBottom: '14px'
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: '100%',
              background: '#2563EB',
              borderRadius: '4px',
              transition: 'width 0.3s ease'
            }}
          />
        </div>

        {/* Minimal Status Message */}
        <div style={{ fontSize: '12px', color: '#94A3B8', fontWeight: 400 }}>
          {statusMessage}
        </div>
      </div>
    </div>
  );
};
