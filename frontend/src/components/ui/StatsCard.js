import Link from 'next/link';

export default function StatsCard({ label, value, icon: Icon, colorClass = 'bg-primary-50 text-primary-600', href }) {
  const content = (
    <div className="card hover:shadow-md transition-shadow">
      <div className={`w-10 h-10 ${colorClass} rounded-xl flex items-center justify-center mb-3`}>
        <Icon className="text-lg" />
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-500 mt-0.5">{label}</div>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}
