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
};

// Users
export const userApi = {
  getMe: () => api.get('/users/me'),
  updateMe: (data) => api.put('/users/me', data),
  changePassword: (data) => api.put('/users/me/change-password', data),
  create: (data) => api.post('/users', data),
  getAll: (params) => api.get('/users', { params }),
  updateRole: (id, role) => api.patch(`/users/${id}/role`, { role }),
  bulkDelete: (ids) => api.delete('/users/bulk-delete', { data: { ids } }),
  deleteUser: (id) => api.delete(`/users/${id}`),
  exportCsv: () => api.get('/users/export-csv', { responseType: 'blob' }),
  updatePermissions: (id, permissions) => api.patch(`/users/${id}/permissions`, { permissions }),
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
};

// Reports
export const reportApi = {
  getAll: (params) => api.get('/reports', { params }),
  upload: (data) => api.post('/reports', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getShared: (token) => api.get(`/reports/share/${token}`),
  getDownloadUrl: (id) => api.get(`/reports/${id}/download`),
  deleteReport: (id) => api.delete(`/reports/${id}`),
  replaceReport: (id, formData) => api.put(`/reports/${id}/replace`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
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
  update: (id, data) => api.put(`/tickets/${id}`, data),
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
