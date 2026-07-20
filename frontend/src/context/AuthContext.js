'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { authApi } from '@/lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = Cookies.get('token');
    if (token) {
      authApi.me()
        .then((res) => setUser(res.data.user || res.data))
        .catch(() => Cookies.remove('token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = (token, userData) => {
    if (token) Cookies.set('token', token, { expires: 7 });
    setUser(userData);
  };

  const logout = () => {
    Cookies.remove('token');
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const res = await authApi.me();
      setUser(res.data.user || res.data);
    } catch {}
  };

  const isAdmin = user?.role === 'superadmin' || user?.role === 'subadmin';
  const isSuperAdmin = user?.role === 'superadmin';
  const isLab = user?.role === 'lab';
  const isCustomer = user?.role === 'customer';

  const hasPermission = (key) => {
    if (!user) return false;
    if (user.role === 'superadmin') return true;
    if (user.role === 'subadmin') return Array.isArray(user.permissions) && user.permissions.includes(key);
    return false;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser, isAdmin, isSuperAdmin, isLab, isCustomer, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
