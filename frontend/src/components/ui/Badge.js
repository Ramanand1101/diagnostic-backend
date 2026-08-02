import { statusColor } from '@/utils/helpers';

// e.g. 'report_partial' -> 'Report Partial', 'in_progress' -> 'In Progress'
const prettify = (s) => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export default function Badge({ label, status, className = '' }) {
  const colorClass = status ? statusColor(status) : 'bg-gray-100 text-gray-700';
  return (
    <span className={`badge ${colorClass} ${className}`}>
      {label || (status?.includes('_') ? prettify(status) : status)}
    </span>
  );
}
