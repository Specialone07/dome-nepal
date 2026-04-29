import axios from 'axios'
import { useAuthStore } from '../stores'


const api = axios.create({
  baseURL: 'https://dome-nepal-1.onrender.com/api',
  withCredentials: true, // ✅ REQUIRED for cookies
})
/* ─────────────────────────────

/* ─────────────────────────────
   RESPONSE INTERCEPTOR (ONLY ONE)
───────────────────────────── */
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status
    const url    = error.config?.url

    if (status === 401) {
      useAuthStore.getState().logout()

      // ✅ Only redirect if already on an admin page, not on every 401
      if (url?.includes('/admin') && window.location.pathname.startsWith('/admin')) {
        window.location.href = ADMIN_LOGIN
      }
    }

    return Promise.reject(error)
  }
)

export const authAPI = {
  adminLogin: (data) => api.post('/auth/admin-login', data),
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  refresh: () => api.post('/auth/refresh'),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me')
}

/* ─────────────────────────────
   PRODUCT API
───────────────────────────── */
export const productAPI = {
  getAll: (params) => api.get('/products', { params }),
  getOne: (identifier) => api.get(`/products/${identifier}`),
  getFeatured: () => api.get('/products/featured'),
  getNewArrivals: () => api.get('/products/new-arrivals'),
  getBestSellers: () => api.get('/products/best-sellers'),
  getRelated: (id) => api.get(`/products/${id}/related`),
  search: (q, limit) =>
    api.get('/products/search', { params: { q, limit } }),
  getCategories: () => api.get('/products/categories'),

  getReviews: (productId) =>
    reviewAPI.getByProduct(productId),

  create: (data) =>
    api.post('/products', data, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),

  update: (id, data) =>
    api.put(`/products/${id}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),

  delete: (id) => api.delete(`/products/${id}`)
}

/* ─────────────────────────────
   REVIEW API
───────────────────────────── */
export const reviewAPI = {
  create: (data) => api.post('/reviews', data),
  getByProduct: (productId) => api.get(`/reviews/${productId}`),
  delete: (id) => api.delete(`/reviews/${id}`)
}

/* ─────────────────────────────
   ORDER API
───────────────────────────── */
export const orderAPI = {
  create: (data, guestId) =>
    api.post('/orders', data, {
      headers: guestId ? { 'x-guest-id': guestId } : {}
    }),

  getMyOrders: (params) =>
    api.get('/orders/my-orders', { params }),

  getOne: (id, guestId) =>
    api.get(`/orders/${id}`, {
      headers: guestId ? { 'x-guest-id': guestId } : {}
    }),

  cancel: (id) => api.patch(`/orders/${id}/cancel`),
  updateStatus: (id, data) =>
    api.patch(`/orders/${id}/status`, data),

  getAll: (params) => api.get('/orders', { params })
}


/* ─────────────────────────────
   OTHER APIs
───────────────────────────── */
export const wishlistAPI = {
  get: () => api.get('/wishlist'),
  toggle: (productId) =>
    api.post(`/wishlist/toggle/${productId}`)
}

export const userAPI = {
  updateProfile: (data) => api.put('/users/profile', data),
  changePassword: (data) => api.put('/users/change-password', data),
  addAddress: (data) => api.post('/users/addresses', data),
  updateAddress: (id, data) =>
    api.put(`/users/addresses/${id}`, data),
  deleteAddress: (id) =>
    api.delete(`/users/addresses/${id}`)
}

export const adminAPI = {
  getStats: () => api.get('/admin/stats')
}

export const uploadAPI = {
  uploadImages: (formData) =>
    api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
}

export default api