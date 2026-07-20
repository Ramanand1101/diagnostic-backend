'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FiGrid, FiUsers, FiMapPin, FiPackage, FiTag, FiCalendar,
  FiFileText, FiPercent, FiStar, FiBook, FiFile, FiMail,
  FiSettings, FiHelpCircle, FiImage, FiUploadCloud, FiLayers,
  FiBriefcase, FiUserCheck, FiPhoneCall, FiActivity, FiList, FiLayout, FiFilePlus,
} from 'react-icons/fi';
import HealthOnTimeLogo from '@/components/layout/HealthOnTimeLogo';
import { useAuth } from '@/context/AuthContext';

// permission: null  → always visible to all admins (dashboard)
// permission: 'key' → visible only if superadmin OR subadmin with that key
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
      { href: '/admin/bookings',    label: 'Bookings',             icon: FiCalendar, permission: 'bookings' },
      { href: '/admin/reports',     label: 'Reports',              icon: FiFileText, permission: 'reports' },
      { href: '/admin/lab-changes', label: 'Lab Profile Changes',  icon: FiFilePlus, permission: 'lab-changes' },
      { href: '/admin/users',       label: 'Users',                icon: FiUsers,    permission: 'users' },
      { href: '/admin/reviews',     label: 'Reviews',              icon: FiStar,     permission: 'reviews' },
      { href: '/admin/tickets',     label: 'Tickets',              icon: FiHelpCircle, permission: 'tickets' },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { href: '/admin/hero-slides',   label: 'Hero Slides',    icon: FiImage,   permission: 'hero-slides' },
      { href: '/admin/home-settings', label: 'Home Page CMS',  icon: FiLayout,  permission: 'home-settings' },
      { href: '/admin/coupons',       label: 'Coupons',        icon: FiPercent, permission: 'coupons' },
      { href: '/admin/blogs',         label: 'Blogs',          icon: FiBook,    permission: 'blogs' },
      { href: '/admin/newsletter',    label: 'Newsletter',     icon: FiMail,    permission: 'newsletter' },
    ],
  },
  {
    label: 'Content & Config',
    items: [
      { href: '/admin/pages',    label: 'Pages',    icon: FiFile,     permission: 'pages' },
      { href: '/admin/settings', label: 'Settings', icon: FiSettings, permission: 'settings' },
    ],
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const { isSuperAdmin, hasPermission } = useAuth();

  const visibleSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) =>
        item.permission === null ? true : hasPermission(item.permission)
      ),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <aside className="w-64 bg-gray-900 min-h-screen flex flex-col">
      <div className="p-6 border-b border-gray-800">
        <Link href="/">
          <HealthOnTimeLogo dark size="text-lg" />
        </Link>
        <p className="text-xs text-gray-500 mt-1">Admin Panel</p>
        {!isSuperAdmin && (
          <span className="mt-1.5 inline-block text-[10px] font-medium bg-blue-900 text-blue-300 px-2 py-0.5 rounded-full">
            Sub Admin
          </span>
        )}
      </div>
      <nav className="flex-1 py-4 overflow-y-auto">
        {visibleSections.map((section, si) => (
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
