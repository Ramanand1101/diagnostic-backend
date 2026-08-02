'use client';
import { FiChevronUp, FiChevronDown } from 'react-icons/fi';

// Clickable <th> for admin tables — click toggles asc/desc on `field`, or switches
// the active sort field (defaulting to desc) if a different column is clicked.
export default function SortableTh({ field, label, currentSort, currentOrder, onSort, className = '', align }) {
  const active = currentSort === field;

  const handleClick = () => {
    if (active) onSort(field, currentOrder === 'asc' ? 'desc' : 'asc');
    else onSort(field, 'desc');
  };

  return (
    <th
      onClick={handleClick}
      className={`table-header cursor-pointer select-none hover:text-gray-700 transition-colors ${align === 'right' ? 'text-right' : ''} ${className}`}
    >
      <span className={`inline-flex items-center gap-1 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
        {label}
        <span className="inline-flex flex-col -space-y-1 text-[10px]">
          <FiChevronUp className={active && currentOrder === 'asc' ? 'text-primary-600' : 'text-gray-300'} />
          <FiChevronDown className={active && currentOrder === 'desc' ? 'text-primary-600' : 'text-gray-300'} />
        </span>
      </span>
    </th>
  );
}
