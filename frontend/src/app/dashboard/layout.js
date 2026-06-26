'use client';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { FiGrid, FiCalendar, FiFileText, FiUser, FiMessageSquare, FiMapPin, FiPackage } from 'react-icons/fi';
import { PageLoader } from '@/components/ui/Spinner';

const customerNav = [
  { href: '/dashboard', label: 'Overview', icon: FiGrid },
  { href: '/dashboard/bookings', label: 'My Bookings', icon: FiCalendar },
  { href: '/dashboard/reports', label: 'My Reports', icon: FiFileText },
  { href: '/dashboard/tickets', label: 'Support', icon: FiMessageSquare },
  { href: '/dashboard/profile', label: 'Profile', icon: FiUser },
];

const labNav = [
  { href: '/dashboard', label: 'Overview', icon: FiGrid },
  { href: '/dashboard/lab', label: 'My Lab', icon: FiMapPin },
  { href: '/dashboard/lab/products', label: 'Tests & Packages', icon: FiPackage },
  { href: '/dashboard/lab/bookings', label: 'Bookings', icon: FiCalendar },
  { href: '/dashboard/tickets', label: 'Support', icon: FiMessageSquare },
  { href: '/dashboard/profile', label: 'Profile', icon: FiUser },
];

export default function DashboardLayout({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading]);

  if (loading) return <PageLoader />;
  if (!user) return null;

  const navItems = user.role === 'lab' ? labNav : customerNav;

  return (
    <>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <aside className="lg:w-56 flex-shrink-0">
            <div className="card p-3">
              <div className="flex items-center gap-3 px-3 py-3 mb-2 border-b border-gray-100">
                <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-bold">
                  {user.name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-sm text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-400 capitalize">{user.role}</p>
                </div>
              </div>
              <nav className="space-y-1">
                {navItems.map(({ href, label, icon: Icon }) => {
                  const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        active ? 'bg-primary-50 text-primary-600' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <Icon className="text-base flex-shrink-0" /> {label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </aside>
          {/* Content */}
          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
      <Footer />
    </>
  );
}
