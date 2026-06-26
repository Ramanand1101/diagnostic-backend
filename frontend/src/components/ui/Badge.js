import { statusColor } from '@/utils/helpers';

export default function Badge({ label, status, className = '' }) {
  const colorClass = status ? statusColor(status) : 'bg-gray-100 text-gray-700';
  return (
    <span className={`badge ${colorClass} ${className}`}>
      {label || status}
    </span>
  );
}
