'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FiGrid, FiUsers, FiMapPin, FiPackage, FiTag, FiCalendar,
  FiFileText, FiPercent, FiStar, FiBook, FiFile, FiMail,
  FiSettings, FiHelpCircle, FiImage, FiUploadCloud,
} from 'react-icons/fi';
import HealthOnTimeLogo from '@/components/layout/HealthOnTimeLogo';

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: FiGrid },
  { href: '/admin/hero-slides', label: 'Hero Slides', icon: FiImage },
  { href: '/admin/labs', label: 'Labs', icon: FiMapPin },
  { href: '/admin/products', label: 'Products', icon: FiPackage },
  { href: '/admin/bulk-upload', label: 'Bulk Upload', icon: FiUploadCloud },
  { href: '/admin/categories', label: 'Categories', icon: FiTag },
  { href: '/admin/bookings', label: 'Bookings', icon: FiCalendar },
  { href: '/admin/reports', label: 'Reports', icon: FiFileText },
  { href: '/admin/users', label: 'Users', icon: FiUsers },
  { href: '/admin/coupons', label: 'Coupons', icon: FiPercent },
  { href: '/admin/reviews', label: 'Reviews', icon: FiStar },
  { href: '/admin/blogs', label: 'Blogs', icon: FiBook },
  { href: '/admin/pages', label: 'Pages', icon: FiFile },
  { href: '/admin/newsletter', label: 'Newsletter', icon: FiMail },
  { href: '/admin/tickets', label: 'Tickets', icon: FiHelpCircle },
  { href: '/admin/settings', label: 'Settings', icon: FiSettings },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-gray-900 min-h-screen flex flex-col">
      <div className="p-6 border-b border-gray-800">
        <Link href="/">
          <HealthOnTimeLogo dark size="text-lg" />
        </Link>
        <p className="text-xs text-gray-500 mt-1">Admin Panel</p>
      </div>
      <nav className="flex-1 py-4 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/admin' && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-6 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Icon className="text-base flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-gray-800">
        <Link href="/" className="text-xs text-gray-500 hover:text-white transition-colors">
          &larr; Back to Site
        </Link>
      </div>
    </aside>
  );
}
