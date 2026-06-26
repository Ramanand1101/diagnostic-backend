import { format } from 'date-fns';

export const formatDate = (date, fmt = 'dd MMM yyyy') =>
  date ? format(new Date(date), fmt) : '-';

export const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount || 0);

export const truncate = (str, len = 100) =>
  str && str.length > len ? str.slice(0, len) + '...' : str;

export const statusColor = (status) => {
  const map = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-primary-100 text-primary-700',
    assigned: 'bg-purple-100 text-purple-800',
    collected: 'bg-secondary-100 text-secondary-800',
    processing: 'bg-secondary-100 text-secondary-700',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-accent-100 text-accent-700',
    refunded: 'bg-gray-100 text-gray-700',
    paid: 'bg-green-100 text-green-800',
    unpaid: 'bg-accent-100 text-accent-700',
    failed: 'bg-accent-100 text-accent-700',
    open: 'bg-yellow-100 text-yellow-800',
    in_progress: 'bg-secondary-100 text-secondary-700',
    resolved: 'bg-green-100 text-green-800',
    closed: 'bg-gray-100 text-gray-700',
    verified: 'bg-secondary-100 text-secondary-700',
    rejected: 'bg-accent-100 text-accent-700',
  };
  return map[status] || 'bg-gray-100 text-gray-700';
};

export const getErrorMessage = (err) =>
  err?.response?.data?.message || err?.message || 'Something went wrong';
