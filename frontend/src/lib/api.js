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
  getAll: (params) => api.get('/users', { params }),
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
};

// Categories
export const categoryApi = {
  getAll: (params) => api.get('/categories', { params }),
  getBySlug: (slug) => api.get(`/categories/${slug}`),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`),
};

// Products
export const productApi = {
  getAll: (params) => api.get('/products', { params }),
  getBySlug: (slug) => api.get(`/products/${slug}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  bulkUploadTests: (data) => api.post('/products/bulk-tests', data),
};

// Bookings
export const bookingApi = {
  create: (data) => api.post('/bookings', data),
  getAll: (params) => api.get('/bookings', { params }),
  getById: (id) => api.get(`/bookings/${id}`),
  updateStatus: (id, data) => api.patch(`/bookings/${id}/status`, data),
  markPaid: (id) => api.patch(`/bookings/${id}/paid`),
};

// Reports
export const reportApi = {
  getAll: (params) => api.get('/reports', { params }),
  upload: (data) => api.post('/reports', data, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getShared: (token) => api.get(`/reports/share/${token}`),
  getDownloadUrl: (id) => api.get(`/reports/${id}/download`),
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
  create: (data) => api.post('/settings', data),
  update: (id, data) => api.put(`/settings/${id}`, data),
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
  reindexLabs: () => api.post('/search/reindex/labs'),
  reindexProducts: () => api.post('/search/reindex/products'),
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

export default api;
