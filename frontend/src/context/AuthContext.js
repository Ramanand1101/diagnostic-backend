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
    // Fire-and-forget — purely records the logout in the Activity Log; the token is
    // cleared client-side regardless of whether this call succeeds.
    if (Cookies.get('token')) authApi.logout().catch(() => {});
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
  const isCorporate = user?.role === 'corporate';
  const isEmployee = user?.role === 'employee';
  const isCustomer = user?.role === 'customer';

  // `action` defaults to 'view' — enough for nav-visibility checks; pages that gate
  // create/edit/delete UI (buttons, forms) should pass the specific action explicitly.
  const hasPermission = (module, action = 'view') => {
    if (!user) return false;
    if (user.role === 'superadmin') return true;
    if (user.role === 'subadmin') {
      const entry = Array.isArray(user.permissions) ? user.permissions.find((p) => p.module === module) : null;
      return !!entry && Array.isArray(entry.actions) && entry.actions.includes(action);
    }
    return false;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser, isAdmin, isSuperAdmin, isLab, isCorporate, isEmployee, isCustomer, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
