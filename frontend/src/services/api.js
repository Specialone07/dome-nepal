import axios from 'axios'
import { useAuthStore } from '../stores'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://dome-nepal-1.onrender.com/api',
  withCredentials: true, // ✅ REQUIRED for cookies
})

let isRefreshing = false
let failedQueue = []

const processQueue = (error = null) => {
  failedQueue.forEach(prom =>
    error ? prom.reject(error) : prom.resolve()
  )
  failedQueue = []
}

/* ─────────────────────────────
   RESPONSE INTERCEPTOR (COOKIE-BASED)
───────────────────────────── */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    const is401 = error.response?.status === 401
    const isRefreshCall = originalRequest?.url?.includes('/auth/refresh')

    if (is401 && !isRefreshCall && !originalRequest._retry) {
      const isAuthenticated = useAuthStore.getState().isAuthenticated

      // If user not logged in → reject
      if (!isAuthenticated) {
        return Promise.reject(error)
      }

      // If refresh already running → queue requests
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(() => api(originalRequest))
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        // ✅ Cookie-based refresh (no token handling)
        await api.post('/auth/refresh')

        processQueue()

        // Retry original request (cookies auto-attached)
        return api(originalRequest)

      } catch (refreshError) {
        processQueue(refreshError)

        useAuthStore.getState().logout()
        const role = useAuthStore.getState().user?.role
        window.location.href = ['admin', 'superadmin'].includes(role) ? '/dome-admin-login-4829' : '/login'

        return Promise.reject(refreshError)

      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

/* ─────────────────────────────
   AUTH API
───────────────────────────── */
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
  getAdminAll: (params) => api.get('/products/admin/list', { params }),
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
    api.post('/products', data),

  update: (id, data) =>
    api.put(`/products/${id}`, data), // ✅ FIXED

  delete: (id) =>
    api.delete(`/products/${id}`),
  setActive: (id, isActive) => api.patch(`/products/admin/${id}/active`, { isActive }),
  bulkCreate: (rows) => api.post('/products/bulk', { rows })
}
/* ─────────────────────────────
   REVIEW API
───────────────────────────── */
export const reviewAPI = {
  create: (data) => api.post('/reviews', data),
  getByProduct: (productId) => api.get(`/reviews/product/${productId}`),
  getForProduct: (productId) => api.get(`/reviews/product/${productId}`),
  helpful: (id) => api.patch(`/reviews/${id}/helpful`),
  delete: (id) => api.delete(`/reviews/${id}`)
}

/* ─────────────────────────────
   ORDER API
───────────────────────────── */
export const orderAPI = {
  quote: (data) => api.post('/orders/quote', data),
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

  cancel: (id, data = {}, guestId) => api.patch(`/orders/${id}/cancel`, data, {
    headers: guestId ? { 'x-guest-id': guestId } : {}
  }),
  updateStatus: (id, data) =>
    api.patch(`/orders/${id}/status`, data),
  verifyPayment: (id, data) =>
    api.patch(`/orders/${id}/payment`, data),

  getAll: (params) => api.get('/orders', { params })
}

/* ─────────────────────────────
   OTHER APIs
───────────────────────────── */
export const wishlistAPI = {
  get: () => api.get('/wishlist'),
  sync: (productIds) => api.post('/wishlist/sync', { productIds }),
  toggle: (productId) =>
    api.post(`/wishlist/toggle/${productId}`)
}

export const userAPI = {
  updateProfile: (data) => api.put('/users/profile', data),
  changePassword: (data) => api.put('/users/change-password', data),
  addAddress: (data) => api.post('/users/addresses', data),
  updateAddress: (id, data) =>
    api.put(`/users/addresses/${id}`, data),
  deleteAddress: (id) => api.delete(`/users/addresses/${id}`),
  getAll: (params) => api.get('/users', { params }),
  update: (id, data) => api.patch(`/users/${id}`, data)
}

export const adminAPI = {
  getStats: () => api.get('/admin/stats')
}

export const couponAPI = {
  getAll: () => api.get('/coupons'),
  create: (data) => api.post('/coupons', data),
  update: (id, data) => api.put(`/coupons/${id}`, data),
  delete: (id) => api.delete(`/coupons/${id}`)
}

export const uploadAPI = {
  uploadImages: (formData) =>
    api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
}

export default api
