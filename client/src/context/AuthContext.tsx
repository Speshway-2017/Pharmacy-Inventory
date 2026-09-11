import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../../../shared/types';
import { apiService } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  login: async () => false,
  logout: () => { },
  isAdmin: false
});

const isTokenExpired = (tokenStr: string | null): boolean => {
  if (!tokenStr) return true;
  if (tokenStr === 'mock_offline_admin_token') return false;
  try {
    const parts = tokenStr.split('.');
    if (parts.length !== 3) return false;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const decoded = JSON.parse(jsonPayload);
    if (decoded && decoded.exp && decoded.exp * 1000 <= Date.now()) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const currentToken = localStorage.getItem('pharmacy_jwt_token');
    if (!currentToken || isTokenExpired(currentToken)) {
      localStorage.removeItem('pharmacy_jwt_token');
      localStorage.removeItem('pharmacy_user');
      return null;
    }
    const raw = localStorage.getItem('pharmacy_user');
    return raw ? JSON.parse(raw) : null;
  });

  const [token, setToken] = useState<string | null>(() => {
    const currentToken = localStorage.getItem('pharmacy_jwt_token');
    if (!currentToken || isTokenExpired(currentToken)) {
      return null;
    }
    return currentToken;
  });

  // Listen for unauthorized 401 events to cleanly reset auth state
  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      setToken(null);
      localStorage.removeItem('pharmacy_jwt_token');
      localStorage.removeItem('pharmacy_user');
      if (window.electronAPI?.writeLocalJson) {
        window.electronAPI.writeLocalJson('session.json', null);
      }
    };

    window.addEventListener('pharmacy:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('pharmacy:unauthorized', handleUnauthorized);
    };
  }, []);

  // On mount: Restore session from disk (session.json) if localStorage was cleared
  useEffect(() => {
    const restoreDiskSession = async () => {
      try {
        if (!user || !token) {
          if (window.electronAPI?.readLocalJson) {
            const diskSession = await window.electronAPI.readLocalJson('session.json');
            if (diskSession && diskSession.user && diskSession.token) {
              if (isTokenExpired(diskSession.token)) {
                // Clear expired disk session so it does not resurrect stale sessions
                await window.electronAPI.writeLocalJson('session.json', null);
                localStorage.removeItem('pharmacy_jwt_token');
                localStorage.removeItem('pharmacy_user');
                return;
              }
              setUser(diskSession.user);
              setToken(diskSession.token);
              localStorage.setItem('pharmacy_user', JSON.stringify(diskSession.user));
              localStorage.setItem('pharmacy_jwt_token', diskSession.token);
            }
          }
        }
      } catch (err) {
        console.error('Failed to restore persistent session:', err);
      }
    };
    restoreDiskSession();
  }, []);

  const loginHandler = async (email: string, pass: string) => {
    const res = await apiService.login(email, pass);
    if (res.success && res.user && res.token) {
      setUser(res.user);
      setToken(res.token);
      localStorage.setItem('pharmacy_user', JSON.stringify(res.user));
      localStorage.setItem('pharmacy_jwt_token', res.token);

      // Persist session to disk so app restart retains login state
      if (window.electronAPI?.writeLocalJson) {
        window.electronAPI.writeLocalJson('session.json', {
          user: res.user,
          token: res.token,
          loginTime: new Date().toISOString()
        });
      }
      return true;
    }
    return false;
  };

  const logoutHandler = () => {
    localStorage.removeItem('pharmacy_jwt_token');
    localStorage.removeItem('pharmacy_user');
    setUser(null);
    setToken(null);

    // Clear disk session file on explicit logout
    if (window.electronAPI?.writeLocalJson) {
      window.electronAPI.writeLocalJson('session.json', null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login: loginHandler,
        logout: logoutHandler,
        isAdmin: user?.role === 'ADMIN'
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
