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

  const loginHandler = async (email: string, pass: string) => {
    const res = await apiService.login(email, pass);
    if (res.success && res.user) {
      setUser(res.user);
      setToken(res.token);
      return true;
    }
    return false;
  };

  const logoutHandler = () => {
    localStorage.removeItem('pharmacy_jwt_token');
    localStorage.removeItem('pharmacy_user');
    setUser(null);
    setToken(null);
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
