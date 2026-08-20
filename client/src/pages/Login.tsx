import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Pill, Lock, Mail, ShieldAlert } from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const success = await login(email, password);
      if (!success) {
        setError('Invalid email or password.');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        width: '100vw',
        background: 'linear-gradient(135deg, #1F2430 0%, #2563EB 100%)',
        fontFamily: 'Inter, sans-serif'
      }}
    >
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '20px',
          padding: '40px',
          width: '100%',
          maxWidth: '440px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: '60px',
              height: '60px',
              background: '#DBEAFE',
              borderRadius: '16px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '12px'
            }}
          >
            <Pill size={32} color="#2563EB" />
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.5px' }}>
            Pharmacy Admin Login
          </h2>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
            Sign in with administrator credentials
          </p>
        </div>

        {error && (
          <div
            style={{
              background: '#FEE2E2',
              color: '#DC2626',
              padding: '10px 14px',
              borderRadius: '8px',
              marginBottom: '20px',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <ShieldAlert size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Admin Email / Username</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '12px' }} />
              <input
                type="text"
                className="form-control"
                style={{ paddingLeft: '40px' }}
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@pharmacy.com"
                required
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} color="#94A3B8" style={{ position: 'absolute', left: '12px', top: '12px' }} />
              <input
                type="password"
                className="form-control"
                style={{ paddingLeft: '40px' }}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ width: '100%', marginBottom: '16px' }}
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Sign In as Admin'}
          </button>
        </form>
      </div>
    </div>
  );
};
