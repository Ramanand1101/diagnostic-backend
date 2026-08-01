'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FiGrid, FiUsers, FiMapPin, FiPackage, FiTag, FiCalendar,
  FiFileText, FiPercent, FiStar, FiBook, FiFile, FiMail,
  FiSettings, FiHelpCircle, FiImage, FiUploadCloud, FiLayers,
  FiBriefcase, FiUserCheck, FiPhoneCall, FiActivity, FiList, FiLayout, FiFilePlus,
  FiDollarSign, FiChevronsLeft, FiChevronsRight, FiLink, FiToggleRight, FiX, FiShare2,
} from 'react-icons/fi';
import HealthOnTimeLogo from '@/components/layout/HealthOnTimeLogo';
import { useAuth } from '@/context/AuthContext';

const navSections = [
  {
    label: null,
    items: [
      { href: '/admin', label: 'Dashboard', icon: FiGrid, permission: 'dashboard' },
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
      { href: '/admin/lab-holidays',label: 'Lab Holidays',    icon: FiCalendar,    permission: 'lab-holidays' },
      { href: '/admin/test-availability', label: 'Test Availability', icon: FiToggleRight, permission: 'test-availability' },
    ],
  },
  {
    label: 'Corporate',
    items: [
      { href: '/admin/corporate',              label: 'Corporate Accounts',    icon: FiBriefcase, permission: 'corporate' },
      { href: '/admin/corporate/packages',     label: 'Corporate Packages',    icon: FiPackage,   permission: 'corporate' },
      { href: '/admin/corporate/appointments', label: 'Corporate Appointments', icon: FiCalendar,  permission: 'corporate' },
      { href: '/admin/corporate/billing',      label: 'Corporate Billing',     icon: FiDollarSign, permission: 'corporate' },
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
      { href: '/admin/settings/social',    label: 'Social Links',      icon: FiShare2,   permission: 'settings' },
      { href: '/admin/activity-log',       label: 'Activity Log',      icon: FiList,     permission: 'activity-log' },
      { href: '/admin/integrations',       label: 'Integrations',      icon: FiLink,     permission: null, superAdminOnly: true },
    ],
  },
];

export default function AdminSidebar({ mobileOpen = false, onCloseMobile = () => {} }) {
  const pathname = usePathname();
  const { isSuperAdmin, hasPermission } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  // The icon-only "collapsed" mode only makes sense on desktop, where the sidebar
  // is always visible and shrinking it reclaims page width. On mobile the sidebar
  // is an on-demand overlay drawer — it should always show full labels when open,
  // regardless of whatever collapsed state was last left on desktop.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    setIsDesktop(mq.matches);
    const handler = (e) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  const effectiveCollapsed = collapsed && isDesktop;

  const visibleSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (item.superAdminOnly) return isSuperAdmin;
        return item.permission === null ? true : hasPermission(item.permission);
      }),
    }))
    .filter((section) => section.items.length > 0);

  // Pick the single longest matching href as "active" — prevents a parent route
  // (e.g. /admin/corporate) from also lighting up on its own sub-pages
  // (e.g. /admin/corporate/packages).
  const allHrefs = visibleSections.flatMap((s) => s.items.map((i) => i.href));
  const activeHref = allHrefs
    .filter((href) => pathname === href || (href !== '/admin' && pathname.startsWith(href + '/')))
    .sort((a, b) => b.length - a.length)[0];

  // Auto-close the mobile drawer whenever the route changes (same pattern as the
  // public Navbar's mobile menu) — otherwise it stays open over the new page.
  useEffect(() => { onCloseMobile(); }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {/* Mobile backdrop — tapping it closes the drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onCloseMobile} />
      )}
      <aside
        className={`bg-gray-900 h-screen flex flex-col flex-shrink-0 transition-all duration-300 overflow-hidden
          fixed inset-y-0 left-0 z-50 w-64 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:sticky lg:top-0 lg:z-auto lg:translate-x-0 ${collapsed ? 'lg:w-16' : 'lg:w-64'}`}
      >
      {/* Logo + collapse toggle */}
      <div className={`border-b border-gray-800 flex items-center ${effectiveCollapsed ? 'justify-center py-4 px-2' : 'justify-between p-5'}`}>
        {!effectiveCollapsed && (
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
          title={effectiveCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={`hidden lg:block flex-shrink-0 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg p-1.5 transition-colors ${effectiveCollapsed ? '' : 'ml-2'}`}
        >
          {effectiveCollapsed ? <FiChevronsRight size={18} /> : <FiChevronsLeft size={18} />}
        </button>
        <button onClick={onCloseMobile} className="lg:hidden flex-shrink-0 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg p-1.5 transition-colors">
          <FiX size={18} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 overflow-y-auto overflow-x-hidden">
        {visibleSections.map((section, si) => (
          <div key={si}>
            {/* Section label — hidden when collapsed */}
            {section.label && !effectiveCollapsed && (
              <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest px-5 pt-4 pb-1">
                {section.label}
              </p>
            )}
            {/* Divider line when collapsed */}
            {section.label && effectiveCollapsed && si > 0 && (
              <div className="border-t border-gray-800 mx-3 my-1" />
            )}

            {section.items.map(({ href, label, icon: Icon }) => {
              const active = href === activeHref;
              return (
                <Link
                  key={href}
                  href={href}
                  title={effectiveCollapsed ? label : undefined}
                  className={`flex items-center transition-colors ${
                    effectiveCollapsed ? 'justify-center px-0 py-3 mx-2 rounded-lg' : 'gap-3 px-5 py-2.5'
                  } text-sm font-medium ${
                    active
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <Icon className="text-base flex-shrink-0" />
                  {!effectiveCollapsed && <span className="truncate">{label}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className={`border-t border-gray-800 ${effectiveCollapsed ? 'py-3 flex justify-center' : 'p-4'}`}>
        {effectiveCollapsed ? (
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
    </>
  );
}
