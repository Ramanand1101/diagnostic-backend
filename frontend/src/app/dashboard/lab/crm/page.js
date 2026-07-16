'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { labCrmApi, followUpApi } from '@/lib/api';
import { formatCurrency } from '@/utils/helpers';
import { PageLoader } from '@/components/ui/Spinner';
import { FiUsers, FiBriefcase, FiPhoneCall, FiCalendar, FiTrendingUp, FiActivity, FiArrowRight, FiUserCheck } from 'react-icons/fi';

const TYPE_ICONS = { call: '📞', whatsapp: '💬', email: '📧', visit: '🏥' };

export default function LabCRMDashboard() {
  const [stats, setStats] = useState(null);
  const [todayFU, setTodayFU] = useState([]);
  const [loading, setLoading] = useState(true);
  const [labId, setLabId] = useState(null);

  useEffect(() => {
    labCrmApi.stats().then((res) => {
      setStats(res.data);
      setLabId(res.data.labId);
      return followUpApi.getAll({ today: 'true', status: 'pending', lab: res.data.labId, limit: 8 });
    }).then((fuRes) => {
      setTodayFU(fuRes.data.items || []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;

  const cards = [
    { label: 'My Patients', value: stats?.totalPatients || 0, icon: FiUsers, color: 'text-blue-600', bg: 'bg-blue-50', href: '/dashboard/lab/crm/patients' },
    { label: 'New Leads', value: stats?.newLeads || 0, icon: FiBriefcase, color: 'text-orange-600', bg: 'bg-orange-50', href: '/dashboard/lab/crm/leads?status=new' },
    { label: 'Pending Follow-ups', value: stats?.pendingFollowUps || 0, icon: FiPhoneCall, color: 'text-red-600', bg: 'bg-red-50', href: '/dashboard/lab/crm/followups?status=pending' },
    { label: "Today's Follow-ups", value: stats?.todayFollowUps || 0, icon: FiCalendar, color: 'text-purple-600', bg: 'bg-purple-50', href: '/dashboard/lab/crm/followups' },
    { label: 'Converted This Month', value: stats?.convertedThisMonth || 0, icon: FiTrendingUp, color: 'text-green-600', bg: 'bg-green-50', href: '/dashboard/lab/crm/leads?status=converted' },
    { label: 'Revenue This Month', value: formatCurrency(stats?.revenueThisMonth || 0), icon: FiActivity, color: 'text-primary-600', bg: 'bg-primary-50', href: '/dashboard/lab/bookings' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">CRM Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your lab's patients, leads, and follow-ups</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map(({ label, value, icon: Icon, color, bg, href }) => (
          <Link key={label} href={href} className="card hover:shadow-md transition-shadow">
            <div className="flex items-start gap-3">
              <div className={`${bg} p-2.5 rounded-xl`}><Icon className={`${color} text-lg`} /></div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Today's Follow-ups</h2>
            <Link href="/dashboard/lab/crm/followups" className="text-xs text-primary-600 hover:underline flex items-center gap-1">
              View all <FiArrowRight size={12} />
            </Link>
          </div>
          {todayFU.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No follow-ups today</p>
          ) : (
            <div className="space-y-3">
              {todayFU.map((fu) => (
                <div key={fu._id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <span className="text-lg">{TYPE_ICONS[fu.type] || '📞'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{fu.patient?.name || fu.lead?.name}</p>
                    <p className="text-xs text-gray-500">{fu.patient?.mobile || fu.lead?.mobile}</p>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(fu.scheduledAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">Quick Access</h2>
          <div className="space-y-2">
            {[
              { href: '/dashboard/lab/crm/patients', label: 'Patient 360° View', icon: FiUsers, desc: 'History, bookings, spend' },
              { href: '/dashboard/lab/crm/leads', label: 'Manage Leads', icon: FiBriefcase, desc: 'Track inquiries' },
              { href: '/dashboard/lab/crm/followups', label: 'Follow-up Tasks', icon: FiPhoneCall, desc: 'Schedule & track' },
              { href: '/dashboard/lab/crm/doctors', label: 'Referral Doctors', icon: FiUserCheck, desc: 'Who refers patients to you' },
            ].map(({ href, label, icon: Icon, desc }) => (
              <Link key={href} href={href} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-primary-200 hover:bg-primary-50/30 transition-colors group">
                <div className="bg-gray-100 group-hover:bg-primary-100 p-2 rounded-lg transition-colors">
                  <Icon className="text-gray-500 group-hover:text-primary-600" size={16} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">{label}</p>
                  <p className="text-xs text-gray-400">{desc}</p>
                </div>
                <FiArrowRight className="ml-auto text-gray-300 group-hover:text-primary-500 transition-colors" size={14} />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
