'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FiGrid, FiUsers, FiMapPin, FiPackage, FiTag, FiCalendar,
  FiFileText, FiPercent, FiStar, FiBook, FiFile, FiMail,
  FiSettings, FiHelpCircle, FiImage, FiUploadCloud, FiLayers,
  FiBriefcase, FiUserCheck, FiPhoneCall, FiActivity, FiList, FiLayout, FiFilePlus,
  FiDollarSign, FiChevronsLeft, FiChevronsRight,
} from 'react-icons/fi';
import HealthOnTimeLogo from '@/components/layout/HealthOnTimeLogo';
import { useAuth } from '@/context/AuthContext';

const navSections = [
  {
    label: null,
    items: [
      { href: '/admin', label: 'Dashboard', icon: FiGrid, permission: null },
    ],
  },
  {
    label: 'Lab Management',
    items: [
      { href: '/admin/labs',        label: 'Labs',            icon: FiMapPin,      permission: 'labs' },
      { href: '/admin/brands',      label: 'Brands / Chains', icon: FiLayers,      permission: 'brands' },
      { href: '/admin/products',    label: 'Products',        icon: FiPackage,     permission: 'products' },
      { href: '/admin/categories',  label: 'Categories',      icon: FiTag,         permission: 'categories' },
      { href: '/admin/test-master', label: 'Test Master List',icon: FiList,        permission: 'test-master' },
      { href: '/admin/bulk-upload', label: 'Bulk Upload',     icon: FiUploadCloud, permission: 'bulk-upload' },
    ],
  },
  {
    label: 'CRM',
    items: [
      { href: '/admin/crm',              label: 'CRM Dashboard',    icon: FiActivity,  permission: 'crm' },
      { href: '/admin/crm/patients',     label: 'Patients',         icon: FiUsers,     permission: 'crm' },
      { href: '/admin/crm/leads',        label: 'Leads',            icon: FiBriefcase, permission: 'crm' },
      { href: '/admin/crm/followups',    label: 'Follow-ups',       icon: FiPhoneCall, permission: 'crm' },
      { href: '/admin/crm/doctors',      label: 'Referral Doctors', icon: FiUserCheck, permission: 'crm' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { href: '/admin/bookings',    label: 'Bookings',            icon: FiCalendar,   permission: 'bookings' },
      { href: '/admin/billing',     label: 'Billing',             icon: FiDollarSign, permission: 'bookings' },
      { href: '/admin/reports',     label: 'Reports',             icon: FiFileText,   permission: 'reports' },
      { href: '/admin/lab-changes', label: 'Lab Profile Changes', icon: FiFilePlus,   permission: 'lab-changes' },
      { href: '/admin/users',       label: 'Users',               icon: FiUsers,      permission: 'users' },
      { href: '/admin/reviews',     label: 'Reviews',             icon: FiStar,       permission: 'reviews' },
      { href: '/admin/tickets',     label: 'Tickets',             icon: FiHelpCircle, permission: 'tickets' },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { href: '/admin/hero-slides',   label: 'Hero Slides',   icon: FiImage,   permission: 'hero-slides' },
      { href: '/admin/home-settings', label: 'Home Page CMS', icon: FiLayout,  permission: 'home-settings' },
      { href: '/admin/coupons',       label: 'Coupons',       icon: FiPercent, permission: 'coupons' },
      { href: '/admin/blogs',         label: 'Blogs',         icon: FiBook,    permission: 'blogs' },
      { href: '/admin/newsletter',    label: 'Newsletter',    icon: FiMail,    permission: 'newsletter' },
    ],
  },
  {
    label: 'Config',
    items: [
      { href: '/admin/pages',              label: 'Pages',             icon: FiFile,     permission: 'pages' },
      { href: '/admin/settings',           label: 'Settings',          icon: FiSettings, permission: 'settings' },
      { href: '/admin/settings/animation', label: 'Booking Animation', icon: FiActivity, permission: 'settings' },
    ],
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const { isSuperAdmin, hasPermission } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const visibleSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) =>
        item.permission === null ? true : hasPermission(item.permission)
      ),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <aside
      className="bg-gray-900 min-h-screen flex flex-col flex-shrink-0 transition-all duration-300"
      style={{ width: collapsed ? '64px' : '256px' }}
    >
      {/* Logo + collapse toggle */}
      <div className={`border-b border-gray-800 flex items-center ${collapsed ? 'justify-center py-4 px-2' : 'justify-between p-5'}`}>
        {!collapsed && (
          <Link href="/" className="min-w-0">
            <HealthOnTimeLogo dark size="text-lg" />
            <p className="text-xs text-gray-500 mt-0.5">Admin Panel</p>
            {!isSuperAdmin && (
              <span className="mt-1 inline-block text-[10px] font-medium bg-blue-900 text-blue-300 px-2 py-0.5 rounded-full">
                Sub Admin
              </span>
            )}
          </Link>
        )}
        <button
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={`flex-shrink-0 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg p-1.5 transition-colors ${collapsed ? '' : 'ml-2'}`}
        >
          {collapsed ? <FiChevronsRight size={18} /> : <FiChevronsLeft size={18} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden">
        {visibleSections.map((section, si) => (
          <div key={si}>
            {/* Section label — hidden when collapsed */}
            {section.label && !collapsed && (
              <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest px-5 pt-4 pb-1">
                {section.label}
              </p>
            )}
            {/* Divider line when collapsed */}
            {section.label && collapsed && si > 0 && (
              <div className="border-t border-gray-800 mx-3 my-1" />
            )}

            {section.items.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || (href !== '/admin' && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  title={collapsed ? label : undefined}
                  className={`flex items-center transition-colors ${
                    collapsed ? 'justify-center px-0 py-3 mx-2 rounded-lg' : 'gap-3 px-5 py-2.5'
                  } text-sm font-medium ${
                    active
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <Icon className="text-base flex-shrink-0" />
                  {!collapsed && <span className="truncate">{label}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className={`border-t border-gray-800 ${collapsed ? 'py-3 flex justify-center' : 'p-4'}`}>
        {collapsed ? (
          <Link href="/" title="Back to Site" className="text-gray-500 hover:text-white transition-colors">
            ←
          </Link>
        ) : (
          <Link href="/" className="text-xs text-gray-500 hover:text-white transition-colors">
            ← Back to Site
          </Link>
        )}
      </div>
    </aside>
  );
}
