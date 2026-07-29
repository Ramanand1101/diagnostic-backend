'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import AdminSidebar from '@/components/layout/AdminSidebar';
import { PageLoader } from '@/components/ui/Spinner';
import { FiLogOut, FiBell, FiMenu } from 'react-icons/fi';

export default function AdminLayout({ children }) {
  const { user, loading, isAdmin, logout } = useAuth();
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) router.push('/login');
  }, [user, loading, isAdmin]);

  if (loading) return <PageLoader />;
  if (!user || !isAdmin) return null;

  return (
    <div className="flex h-screen overflow-hidden">
      <AdminSidebar mobileOpen={mobileNavOpen} onCloseMobile={() => setMobileNavOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex items-center justify-between flex-shrink-0 gap-3">
          <button onClick={() => setMobileNavOpen(true)} className="lg:hidden text-gray-500 hover:text-gray-700">
            <FiMenu className="text-xl" />
          </button>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-3 sm:gap-4">
            <button className="text-gray-400 hover:text-gray-600 relative">
              <FiBell className="text-xl" />
            </button>
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-bold text-sm">
                {user.name?.[0]?.toUpperCase()}
              </div>
              <span className="text-sm font-medium text-gray-700">{user.name}</span>
            </div>
            <button onClick={() => { logout(); router.push('/login'); }} className="text-gray-400 hover:text-red-500 transition-colors">
              <FiLogOut />
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto bg-gray-50 p-3 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
