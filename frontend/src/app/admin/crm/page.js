'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { crmApi, followUpApi } from '@/lib/api';
import { formatCurrency, formatDate } from '@/utils/helpers';
import { PageLoader } from '@/components/ui/Spinner';
import {
  FiUsers, FiBriefcase, FiPhoneCall, FiActivity,
  FiTrendingUp, FiCalendar, FiUserCheck, FiArrowRight,
} from 'react-icons/fi';

const STATUS_COLORS = {
  pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  done: 'bg-green-50 text-green-700 border-green-200',
  missed: 'bg-red-50 text-red-700 border-red-200',
  rescheduled: 'bg-blue-50 text-blue-700 border-blue-200',
};

const TYPE_ICONS = { call: '📞', whatsapp: '💬', email: '📧', visit: '🏥' };

export default function CRMDashboard() {
  const [stats, setStats] = useState(null);
  const [todayFollowUps, setTodayFollowUps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      crmApi.stats(),
      followUpApi.getAll({ today: true, status: 'pending', limit: 10 }),
    ]).then(([statsRes, fuRes]) => {
      setStats(statsRes.data);
      setTodayFollowUps(fuRes.data.items || []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;

  const statCards = [
    { label: 'Total Patients', value: stats?.totalPatients || 0, icon: FiUsers, color: 'text-blue-600', bg: 'bg-blue-50', href: '/admin/crm/patients' },
    { label: 'New Leads', value: stats?.newLeads || 0, icon: FiBriefcase, color: 'text-orange-600', bg: 'bg-orange-50', href: '/admin/crm/leads?status=new' },
    { label: 'Pending Follow-ups', value: stats?.pendingFollowUps || 0, icon: FiPhoneCall, color: 'text-red-600', bg: 'bg-red-50', href: '/admin/crm/followups?status=pending' },
    { label: "Today's Follow-ups", value: stats?.todayFollowUps || 0, icon: FiCalendar, color: 'text-purple-600', bg: 'bg-purple-50', href: '/admin/crm/followups?today=true' },
    { label: 'Converted This Month', value: stats?.convertedThisMonth || 0, icon: FiTrendingUp, color: 'text-green-600', bg: 'bg-green-50', href: '/admin/crm/leads?status=converted' },
    { label: 'Revenue This Month', value: formatCurrency(stats?.revenueThisMonth || 0), icon: FiActivity, color: 'text-primary-600', bg: 'bg-primary-50', href: '/admin/bookings' },
  ];

  const quickLinks = [
    { href: '/admin/crm/patients', label: 'Patient 360° View', icon: FiUsers, desc: 'Full history, bookings, reports' },
    { href: '/admin/crm/leads', label: 'Manage Leads', icon: FiBriefcase, desc: 'Track & convert inquiries' },
    { href: '/admin/crm/followups', label: 'Follow-up Tasks', icon: FiPhoneCall, desc: 'Schedule & track calls' },
    { href: '/admin/crm/doctors', label: 'Referral Doctors', icon: FiUserCheck, desc: 'Doctors who refer patients' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">CRM Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Patient relationships, leads, follow-ups, referral tracking</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map(({ label, value, icon: Icon, color, bg, href }) => (
          <Link key={label} href={href} className="card hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-start gap-4">
              <div className={`${bg} p-3 rounded-xl`}>
                <Icon className={`${color} text-xl`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Follow-ups */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Today's Follow-ups</h2>
            <Link href="/admin/crm/followups?today=true" className="text-xs text-primary-600 hover:underline flex items-center gap-1">
              View all <FiArrowRight size={12} />
            </Link>
          </div>
          {todayFollowUps.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No follow-ups scheduled for today</p>
          ) : (
            <div className="space-y-3">
              {todayFollowUps.map((fu) => (
                <div key={fu._id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                  <span className="text-lg">{TYPE_ICONS[fu.type] || '📞'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {fu.patient?.name || fu.lead?.name || 'Unknown'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {fu.patient?.mobile || fu.lead?.mobile} · {new Date(fu.scheduledAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {fu.notes && <p className="text-xs text-gray-400 truncate mt-0.5">{fu.notes}</p>}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[fu.status]}`}>
                    {fu.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick links */}
        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Quick Access</h2>
          <div className="grid grid-cols-1 gap-3">
            {quickLinks.map(({ href, label, icon: Icon, desc }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-4 p-3 rounded-xl border border-gray-100 hover:border-primary-200 hover:bg-primary-50/30 transition-colors group"
              >
                <div className="bg-gray-100 group-hover:bg-primary-100 p-2.5 rounded-lg transition-colors">
                  <Icon className="text-gray-500 group-hover:text-primary-600 transition-colors" size={18} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">{label}</p>
                  <p className="text-xs text-gray-500">{desc}</p>
                </div>
                <FiArrowRight className="ml-auto text-gray-300 group-hover:text-primary-500 transition-colors" size={16} />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
