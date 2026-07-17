'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FiGrid, FiUsers, FiMapPin, FiPackage, FiTag, FiCalendar,
  FiFileText, FiPercent, FiStar, FiBook, FiFile, FiMail,
  FiSettings, FiHelpCircle, FiImage, FiUploadCloud, FiLayers,
  FiBriefcase, FiUserCheck, FiPhoneCall, FiActivity, FiList, FiLayout,
} from 'react-icons/fi';
import HealthOnTimeLogo from '@/components/layout/HealthOnTimeLogo';

const navSections = [
  {
    label: null,
    items: [
      { href: '/admin', label: 'Dashboard', icon: FiGrid },
    ],
  },
  {
    label: 'Lab Management',
    items: [
      { href: '/admin/labs', label: 'Labs', icon: FiMapPin },
      { href: '/admin/brands', label: 'Brands / Chains', icon: FiLayers },
      { href: '/admin/products', label: 'Products', icon: FiPackage },
      { href: '/admin/categories', label: 'Categories', icon: FiTag },
      { href: '/admin/test-master', label: 'Test Master List', icon: FiList },
      { href: '/admin/bulk-upload', label: 'Bulk Upload', icon: FiUploadCloud },
    ],
  },
  {
    label: 'CRM',
    items: [
      { href: '/admin/crm', label: 'CRM Dashboard', icon: FiActivity },
      { href: '/admin/crm/patients', label: 'Patients', icon: FiUsers },
      { href: '/admin/crm/leads', label: 'Leads', icon: FiBriefcase },
      { href: '/admin/crm/followups', label: 'Follow-ups', icon: FiPhoneCall },
      { href: '/admin/crm/doctors', label: 'Referral Doctors', icon: FiUserCheck },
    ],
  },
  {
    label: 'Operations',
    items: [
      { href: '/admin/bookings', label: 'Bookings', icon: FiCalendar },
      { href: '/admin/reports', label: 'Reports', icon: FiFileText },
      { href: '/admin/users', label: 'Users', icon: FiUsers },
      { href: '/admin/reviews', label: 'Reviews', icon: FiStar },
      { href: '/admin/tickets', label: 'Tickets', icon: FiHelpCircle },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { href: '/admin/hero-slides', label: 'Hero Slides', icon: FiImage },
      { href: '/admin/home-settings', label: 'Home Page CMS', icon: FiLayout },
      { href: '/admin/coupons', label: 'Coupons', icon: FiPercent },
      { href: '/admin/blogs', label: 'Blogs', icon: FiBook },
      { href: '/admin/newsletter', label: 'Newsletter', icon: FiMail },
    ],
  },
  {
    label: 'Content & Config',
    items: [
      { href: '/admin/pages', label: 'Pages', icon: FiFile },
      { href: '/admin/settings', label: 'Settings', icon: FiSettings },
    ],
  },
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
        {navSections.map((section, si) => (
          <div key={si}>
            {section.label && (
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider px-6 pt-4 pb-1">
                {section.label}
              </p>
            )}
            {section.items.map(({ href, label, icon: Icon }) => {
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
          </div>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-800">
        <Link href="/" className="text-xs text-gray-500 hover:text-white transition-colors">
          &larr; Back to Site
        </Link>
      </div>
    </aside>
  );
}
