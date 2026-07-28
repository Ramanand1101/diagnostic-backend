import axios from 'axios';
import Cookies from 'js-cookie';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api/v1';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = Cookies.get('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  // For FormData (file uploads), remove the default Content-Type so the browser
  // can set multipart/form-data with the correct boundary — multer requires this.
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      Cookies.remove('token');
      if (typeof window !== 'undefined') window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Auth
export const authApi = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  googleAuth: (credential) => api.post('/auth/google', { credential }),
  sendOtp: (data) => api.post('/auth/send-otp', data),
  verifyOtp: (data) => api.post('/auth/verify-otp', data),
  me: () => api.get('/auth/me'),
  autoRegister: (data) => api.post('/auth/auto-register', data),
  logout: () => api.post('/auth/logout'),
};

// Users
export const userApi = {
  getMe: () => api.get('/users/me'),
  updateMe: (data) => api.put('/users/me', data),
  requestContactChange: (data) => api.post('/users/me/request-contact-change', data),
  confirmContactChange: (data) => api.post('/users/me/confirm-contact-change', data),
  changePassword: (data) => api.put('/users/me/change-password', data),
  create: (data) => api.post('/users', data),
  getAll: (params) => api.get('/users', { params }),
  updateRole: (id, role) => api.patch(`/users/${id}/role`, { role }),
  updateDetails: (id, data) => api.patch(`/users/${id}`, data),
  bulkDelete: (ids) => api.delete('/users/bulk-delete', { data: { ids } }),
  deleteUser: (id) => api.delete(`/users/${id}`),
  exportCsv: () => api.get('/users/export-csv', { responseType: 'blob' }),
  getPermissionModules: () => api.get('/users/permission-modules'),
  updatePermissions: (id, permissions) => api.patch(`/users/${id}/permissions`, { permissions }),
  resetPassword: (id, sendEmail = true) => api.post(`/users/${id}/reset-password`, { sendEmail }),
  toggleStatus: (id, isActive) => api.patch(`/users/${id}/status`, { isActive }),
};

// Labs
export const labApi = {
  getAll: (params) => api.get('/labs', { params }),
  getCities: () => api.get('/labs/cities'),
  getNearby: (params) => api.get('/labs/nearby', { params }),
  compare: (params) => api.get('/labs/compare', { params }),
  getMine: () => api.get('/labs/mine'),
  getBySlug: (slug) => api.get(`/labs/${slug}`),
  create: (data) => api.post('/labs', data),
  update: (id, data) => api.put(`/labs/${id}`, data),
  approve: (id) => api.patch(`/labs/${id}/approve`),
  reject: (id) => api.patch(`/labs/${id}/reject`),
  bulkCsv: (file) => { const fd = new FormData(); fd.append('file', file); return api.post('/labs/bulk-csv', fd); },
  demoCsv: () => api.get('/labs/demo-csv', { responseType: 'blob' }),
  demoCsvUrl: () => `${BASE_URL}/labs/demo-csv`,
  bulkDelete: (ids) => api.delete('/labs/bulk-delete', { data: { ids } }),
  exportCsv: (params) => api.get('/labs/export-csv', { params, responseType: 'blob' }),
};

// Lab Holidays
export const labHolidayApi = {
  getAll: (params) => api.get('/lab-holidays', { params }),
  create: (data) => api.post('/lab-holidays', data),
  update: (id, data) => api.put(`/lab-holidays/${id}`, data),
  toggleActive: (id) => api.patch(`/lab-holidays/${id}/toggle`),
  remove: (id) => api.delete(`/lab-holidays/${id}`),
  getBlockedDates: (lab, days = 30) => api.get('/lab-holidays/blocked-dates', { params: { lab, days } }),
  bulkCsv: (file) => { const fd = new FormData(); fd.append('file', file); return api.post('/lab-holidays/bulk-csv', fd); },
  demoCsv: () => api.get('/lab-holidays/demo-csv', { responseType: 'blob' }),
  demoCsvUrl: () => `${BASE_URL}/lab-holidays/demo-csv`,
};

// Test Availability Management
export const testAvailabilityApi = {
  getAll: (params) => api.get('/test-availability', { params }),
  create: (data) => api.post('/test-availability', data),
  update: (id, data) => api.put(`/test-availability/${id}`, data),
  toggleActive: (id) => api.patch(`/test-availability/${id}/toggle`),
  remove: (id) => api.delete(`/test-availability/${id}`),
  bulkToggle: (ids, active) => api.post('/test-availability/bulk-toggle', { ids, active }),
  bulkApply: (labIds, rule) => api.post('/test-availability/bulk-apply', { labIds, ...rule }),
  bulkCsv: (file) => { const fd = new FormData(); fd.append('file', file); return api.post('/test-availability/bulk-csv', fd); },
  demoCsv: () => api.get('/test-availability/demo-csv', { responseType: 'blob' }),
  demoCsvUrl: () => `${BASE_URL}/test-availability/demo-csv`,
  check: (params) => api.get('/test-availability/check', { params }),
  getUnavailableDates: (params) => api.get('/test-availability/unavailable-dates', { params }),
  getAlternatives: (params) => api.get('/test-availability/alternatives', { params }),
};

// Corporates
export const corporateApi = {
  getAll: (params) => api.get('/corporates', { params }),
  getOne: (id) => api.get(`/corporates/${id}`),
  getMine: () => api.get('/corporates/mine'),
  create: (data) => api.post('/corporates', data),
  update: (id, data) => api.put(`/corporates/${id}`, data),
  delete: (id) => api.delete(`/corporates/${id}`),
  setStatus: (id, active) => api.patch(`/corporates/${id}/status`, { active }),
  assignLabs: (id, labIds) => api.patch(`/corporates/${id}/labs`, { labIds }),
  assignRelationshipManager: (id, userId) => api.patch(`/corporates/${id}/relationship-manager`, { userId }),
  addAccountManager: (id, data) => api.post(`/corporates/${id}/account-managers`, data),
  removeAccountManager: (id, userId) => api.delete(`/corporates/${id}/account-managers/${userId}`),
  setAccountManagerHR: (id, userId, isHR) => api.patch(`/corporates/${id}/account-managers/${userId}/hr`, { isHR }),
  assignPackages: (id, packages) => api.patch(`/corporates/${id}/packages`, { packages }),
  updateSettings: (id, data) => api.patch(`/corporates/${id}/settings`, data),
  addAgreement: (id, data) => api.post(`/corporates/${id}/agreements`, data),
  getBilling: (id, params) => api.get(`/corporates/${id}/billing`, { params }),
};

// Activity Log
export const activityLogApi = {
  getAll: (params) => api.get('/activity-log', { params }),
};

// Integration Settings
export const integrationApi = {
  getAll: () => api.get('/integrations'),
  upsert: (key, data) => api.put(`/integrations/${key}`, data),
  delete: (key) => api.delete(`/integrations/${key}`),
};

// Corporate Invoices
export const corporateInvoiceApi = {
  getAll: (params) => api.get('/corporate-invoices', { params }),
  getOne: (id) => api.get(`/corporate-invoices/${id}`),
  generate: (corporateId, data) => api.post(`/corporate-invoices/${corporateId}/generate`, data),
  updateStatus: (id, status) => api.patch(`/corporate-invoices/${id}/status`, { status }),
  exportCsv: (params) => api.get('/corporate-invoices/export-csv', { params, responseType: 'blob' }),
};

// Corporate Packages
export const corporatePackageApi = {
  getAll: (params) => api.get('/corporate-packages', { params }),
  getOne: (id) => api.get(`/corporate-packages/${id}`),
  create: (data) => api.post('/corporate-packages', data),
  update: (id, data) => api.put(`/corporate-packages/${id}`, data),
  delete: (id) => api.delete(`/corporate-packages/${id}`),
};

// Corporate Appointments
export const corporateAppointmentApi = {
  getAll: (params) => api.get('/corporate-appointments', { params }),
  exportCsv: (params) => api.get('/corporate-appointments/export-csv', { params, responseType: 'blob' }),
  getOne: (id) => api.get(`/corporate-appointments/${id}`),
  create: (data) => api.post('/corporate-appointments', data),
  bulkUpload: (corporateId, file) => {
    const fd = new FormData(); fd.append('file', file);
    return api.post(`/corporate-appointments/bulk-upload/${corporateId}`, fd);
  },
  sendToLab: (id) => api.patch(`/corporate-appointments/${id}/send-to-lab`),
  confirm: (id) => api.patch(`/corporate-appointments/${id}/confirm`),
  reject: (id) => api.patch(`/corporate-appointments/${id}/reject`),
  requestAlternate: (id, data) => api.patch(`/corporate-appointments/${id}/request-alternate`, data),
  reschedule: (id, data) => api.patch(`/corporate-appointments/${id}/reschedule`, data),
  cancel: (id, reason) => api.patch(`/corporate-appointments/${id}/cancel`, { reason }),
  notifyEmployee: (id, channels) => api.post(`/corporate-appointments/${id}/notify-employee`, { channels }),
  uploadReport: (id, file, { type = 'complete', missingTests = [] } = {}) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('type', type);
    if (type === 'partial') fd.append('missingTests', JSON.stringify(missingTests));
    return api.post(`/corporate-appointments/${id}/report`, fd);
  },
  markReportDone: (id) => api.patch(`/corporate-appointments/${id}/report/mark-done`),
  sendReportReminder: (id) => api.post(`/corporate-appointments/${id}/report/remind`),
  getReportUrl: (id) => api.get(`/corporate-appointments/${id}/report-url`),
};

// Categories
export const categoryApi = {
  getAll: (params) => api.get('/categories', { params }),
  getTree: () => api.get('/categories/tree'),
  getTopLevel: () => api.get('/categories', { params: { parent: 'null', limit: 200 } }),
  getSubcategories: (parentId) => api.get('/categories', { params: { parent: parentId, limit: 200 } }),
  getBySlug: (slug) => api.get(`/categories/${slug}`),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`),
  demoCsv: () => api.get('/categories/demo-csv', { responseType: 'blob' }),
  bulkCsv: (file) => { const fd = new FormData(); fd.append('file', file); return api.post('/categories/bulk-csv', fd); },
};

// Brands
export const brandApi = {
  getAll: (params) => api.get('/brands', { params }),
  getByCity: (city) => api.get('/brands/by-city', { params: { city } }),
  create: (data) => api.post('/brands', data),
  update: (id, data) => api.put(`/brands/${id}`, data),
  delete: (id) => api.delete(`/brands/${id}`),
  demoCsv: () => api.get('/brands/demo-csv', { responseType: 'blob' }),
  bulkCsv: (file) => { const fd = new FormData(); fd.append('file', file); return api.post('/brands/bulk-csv', fd); },
  uploadLogo: (formData) => api.post('/brands/upload-logo', formData),
  bulkDelete: (ids) => api.delete('/brands/bulk-delete', { data: { ids } }),
  setHomeCollection: (id, homeCollection) => api.patch(`/brands/${id}/home-collection`, { homeCollection }),
  exportCsv: () => api.get('/brands/export-csv', { responseType: 'blob' }),
};

// Products
export const productApi = {
  getAll: (params) => api.get('/products', { params }),
  adminGetAll: (params) => api.get('/products/admin', { params }),
  getBySlug: (slug) => api.get(`/products/${slug}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  bulkUploadTests: (data) => api.post('/products/bulk-tests', data),
  demoCsv: (params) => api.get('/products/demo-csv', { params, responseType: 'blob' }),
  demoCsvUrl: () => `${BASE_URL}/products/demo-csv`,
  bulkCsv: (file, params) => { const fd = new FormData(); fd.append('file', file); return api.post('/products/bulk-csv', fd, { params }); },
  bulkDelete: (ids) => api.delete('/products/bulk-delete', { data: { ids } }),
  migrateTestMaster: () => api.post('/products/migrate-testmaster'),
  bulkPrice: (ids, salePrice, discountPercent) => api.patch('/products/bulk-price', { ids, salePrice, discountPercent }),
  setPrice: (id, data) => api.patch(`/products/${id}/set-price`, data),
  exportCsv: (params) => api.get('/products/export-csv', { params, responseType: 'blob' }),
  labDemoCsv: () => api.get('/products/lab-demo-csv', { responseType: 'blob' }),
  labBulkCsv: (file) => { const fd = new FormData(); fd.append('file', file); return api.post('/products/lab-bulk-csv', fd); },
};

// Bookings
export const bookingApi = {
  create: (data) => api.post('/bookings', data),
  getStats: () => api.get('/bookings/stats'),
  getAll: (params) => api.get('/bookings', { params }),
  getById: (id) => api.get(`/bookings/${id}`),
  updateStatus: (id, data) => api.patch(`/bookings/${id}/status`, data),
  markPaid: (id) => api.patch(`/bookings/${id}/paid`),
  editBooking: (id, data) => api.patch(`/bookings/${id}/edit`, data),
  deleteBooking: (id) => api.delete(`/bookings/${id}`),
  restoreBooking: (id) => api.patch(`/bookings/${id}/restore`),
  markReportDone: (id) => api.patch(`/bookings/${id}/report/mark-done`),
  sendReportReminder: (id) => api.post(`/bookings/${id}/report/remind`),
};

// Reports
export const reportApi = {
  getAll: (params) => api.get('/reports', { params }),
  upload: (data) => api.post('/reports', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  uploadForBooking: (bookingId, file, { type = 'complete', missingTests = [] } = {}) => {
    const fd = new FormData();
    fd.append('files', file);
    fd.append('booking', bookingId);
    fd.append('type', type);
    if (type === 'partial') fd.append('missingTests', JSON.stringify(missingTests));
    return api.post('/reports', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  getShared: (token) => api.get(`/reports/share/${token}`),
  getDownloadUrl: (id, inline = false) => api.get(`/reports/${id}/download`, { params: inline ? { inline: 'true' } : {} }),
  deleteReport: (id) => api.delete(`/reports/${id}`),
  replaceReport: (id, formData) => api.put(`/reports/${id}/replace`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

// Report Notes — customer's private per-report reminders
export const reportNoteApi = {
  getAll: (reportId) => api.get('/report-notes', { params: { report: reportId } }),
  create: (reportId, note) => api.post('/report-notes', { report: reportId, note }),
  update: (id, note) => api.put(`/report-notes/${id}`, { note }),
  remove: (id) => api.delete(`/report-notes/${id}`),
};

// Coupons
export const couponApi = {
  getAll: (params) => api.get('/coupons', { params }),
  getById: (id) => api.get(`/coupons/${id}`),
  create: (data) => api.post('/coupons', data),
  update: (id, data) => api.put(`/coupons/${id}`, data),
  delete: (id) => api.delete(`/coupons/${id}`),
};

// Reviews
export const reviewApi = {
  getAll: (params) => api.get('/reviews', { params }),
  create: (data) => api.post('/reviews', data),
};

// Blogs
export const blogApi = {
  getAll: (params) => api.get('/blogs', { params }),
  getBySlug: (slug) => api.get(`/blogs/${slug}`),
  create: (data) => api.post('/blogs', data),
  update: (id, data) => api.put(`/blogs/${id}`, data),
  delete: (id) => api.delete(`/blogs/${id}`),
};

// Pages
export const pageApi = {
  getAll: (params) => api.get('/pages', { params }),
  getBySlug: (slug) => api.get(`/pages/${slug}`),
  create: (data) => api.post('/pages', data),
  update: (id, data) => api.put(`/pages/${id}`, data),
  delete: (id) => api.delete(`/pages/${id}`),
};

// Newsletter
export const newsletterApi = {
  subscribe: (data) => api.post('/newsletter/subscribe', data),
  getAll: (params) => api.get('/newsletter', { params }),
  toggle: (id) => api.patch(`/newsletter/${id}/toggle`),
  delete: (id) => api.delete(`/newsletter/${id}`),
  bulkDelete: (ids) => api.delete('/newsletter/bulk-delete', { data: { ids } }),
};

// Tickets
export const ticketApi = {
  getAll: (params) => api.get('/tickets', { params }),
  getById: (id) => api.get(`/tickets/${id}`),
  create: (data) => api.post('/tickets', data),
  reply: (id, message) => api.post(`/tickets/${id}/reply`, { message }),
  updateStatus: (id, data) => api.patch(`/tickets/${id}/status`, data),
  delete: (id) => api.delete(`/tickets/${id}`),
};

// Settings
export const settingApi = {
  getAll: () => api.get('/settings'),
  getPublic: (key) => api.get(`/settings/public/${key}`),
  create: (data) => api.post('/settings', data),
  update: (id, data) => api.put(`/settings/${id}`, data),
  upsert: async (key, value) => {
    const list = await api.get('/settings');
    const existing = (list.data.items || list.data).find((s) => s.key === key);
    if (existing) return api.put(`/settings/${existing._id}`, { key, value });
    return api.post('/settings', { key, value });
  },
};

// Test Master
export const testMasterApi = {
  list: (params) => api.get('/test-master', { params }),
  search: (q) => api.get('/test-master/search', { params: { q } }),
  create: (data) => api.post('/test-master', data),
  update: (id, data) => api.put(`/test-master/${id}`, data),
  delete: (id) => api.delete(`/test-master/${id}`),
  bulkDelete: (ids) => api.delete('/test-master/bulk', { data: { ids } }),
  demoCsv: () => api.get('/test-master/demo-csv', { responseType: 'blob' }),
  bulkCsv: (file) => { const fd = new FormData(); fd.append('file', file); return api.post('/test-master/bulk-csv', fd); },
  exportCsv: () => api.get('/test-master/export-csv', { responseType: 'blob' }),
  syncProducts: (id, fromName) => api.post(`/test-master/${id}/sync-products`, { fromName }),
};

// Lab CRM (for lab role — filtered to own lab)
export const labCrmApi = {
  stats: () => api.get('/lab-crm/stats'),
  billing: (params) => api.get('/lab-crm/billing', { params }),
  patientList: (params) => api.get('/lab-crm/patients', { params }),
  patientDetail: (id) => api.get(`/lab-crm/patients/${id}`),
};

// CRM
export const crmApi = {
  stats: () => api.get('/crm/stats'),
  patientList: (params) => api.get('/crm/patients', { params }),
  patientDetail: (id) => api.get(`/crm/patients/${id}`),
};

export const leadApi = {
  getAll: (params) => api.get('/leads', { params }),
  create: (data) => api.post('/leads', data),
  update: (id, data) => api.put(`/leads/${id}`, data),
  convert: (id, data) => api.patch(`/leads/${id}/convert`, data),
  delete: (id) => api.delete(`/leads/${id}`),
};

export const referralDoctorApi = {
  getAll: (params) => api.get('/referral-doctors', { params }),
  create: (data) => api.post('/referral-doctors', data),
  update: (id, data) => api.put(`/referral-doctors/${id}`, data),
  delete: (id) => api.delete(`/referral-doctors/${id}`),
};

export const followUpApi = {
  getAll: (params) => api.get('/follow-ups', { params }),
  create: (data) => api.post('/follow-ups', data),
  update: (id, data) => api.put(`/follow-ups/${id}`, data),
  delete: (id) => api.delete(`/follow-ups/${id}`),
};

// Dashboard
export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats'),
};

// Search
export const searchApi = {
  search: (params) => api.get('/search', { params }),
  suggest: (params) => api.get('/search/suggest', { params }),
  popular: (params) => api.get('/search/popular', { params }),
  reindexAll: () => api.post('/search/reindex/all'),
  reindexLabs: () => api.post('/search/reindex/labs'),
  reindexProducts: () => api.post('/search/reindex/products'),
  reindexPages: () => api.post('/search/reindex/pages'),
};

// Hero Slides
export const heroSlideApi = {
  getAll: (params) => api.get('/hero-slides', { params }),
  create: (data) => api.post('/hero-slides', data),
  update: (id, data) => api.put(`/hero-slides/${id}`, data),
  delete: (id) => api.delete(`/hero-slides/${id}`),
  uploadImage: (formData) =>
    api.post('/hero-slides/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

// Uploads
export const uploadApi = {
  prescription: (data) =>
    api.post('/uploads/prescription', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

// Lab Change Requests
export const labChangeRequestApi = {
  submit: (data) => api.post('/lab-change-requests', data),
  getMine: () => api.get('/lab-change-requests/mine'),
  list: (params) => api.get('/lab-change-requests', { params }),
  approve: (id) => api.patch(`/lab-change-requests/${id}/approve`),
  reject: (id, adminNote) => api.patch(`/lab-change-requests/${id}/reject`, { adminNote }),
};

// Home Page CMS
export const homeContentApi = {
  get: () => api.get('/home-content'),
  update: (data) => api.put('/home-content', data),
};

export default api;
