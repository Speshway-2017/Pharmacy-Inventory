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
  logout: () => {},
  isAdmin: false
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem('pharmacy_user');
    return raw ? JSON.parse(raw) : null;
  });

  const [token, setToken] = useState<string | null>(() => localStorage.getItem('pharmacy_jwt_token'));

  // On mount: Restore session from disk (session.json) if localStorage was cleared
  useEffect(() => {
    const restoreDiskSession = async () => {
      try {
        if (!user || !token) {
          if (window.electronAPI?.readLocalJson) {
            const diskSession = await window.electronAPI.readLocalJson('session.json');
            if (diskSession && diskSession.user && diskSession.token) {
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
