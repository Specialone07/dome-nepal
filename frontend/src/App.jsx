import { useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'

import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import CartDrawer from './components/cart/CartDrawer'
import FloatingSocial from './components/FloatingSocial'

import HomePage from './pages/HomePage'
import ShopPage from './pages/ShopPage'
import ProductDetailPage from './pages/ProductDetailPage'
import CheckoutPage from './pages/CheckoutPage'
import WishlistPage from './pages/WishlistPage'

import AdminLayout from './pages/admin/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminProducts from './pages/admin/AdminProducts'
import AdminOrders from './pages/admin/AdminOrders'
import AdminLogin from './pages/admin/AdminLogin'
import AdminOrderDetails from './pages/admin/AdminOrderDetails'

import { AdminRoute } from './routes/ProtectedRoutes'
import { useAuthStore } from './stores'

// ================= MAIN LAYOUT =================
function MainLayout({ children }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <CartDrawer />
    </div>
  )
}

// ================= APP =================
export default function App() {
  const location = useLocation()

  const checkAuth = useAuthStore((s) => s.checkAuth)
  const isLoading = useAuthStore((s) => s.isLoading)

  // 🔐 AUTH CHECK ON APP LOAD
  useEffect(() => {
    const initAuth = async () => {
      await checkAuth()
    }
    initAuth()
  }, [])

  // ⏳ LOADING STATE (IMPORTANT FOR COOKIE AUTH)
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <>
      {/* GLOBAL COMPONENTS */}
      <FloatingSocial />

      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>

          {/* ================= ADMIN LOGIN ================= */}
          <Route
            path="/dome-admin-login-4829"
            element={<AdminLogin />}
          />

          {/* ================= ADMIN ROUTES ================= */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="orders/:id" element={<AdminOrderDetails />} />
          </Route>

          {/* ================= PUBLIC ROUTES ================= */}
          <Route path="/" element={<MainLayout><HomePage /></MainLayout>} />
          <Route path="/shop" element={<MainLayout><ShopPage /></MainLayout>} />
          <Route path="/products/:slug" element={<MainLayout><ProductDetailPage /></MainLayout>} />
          <Route path="/wishlist" element={<MainLayout><WishlistPage /></MainLayout>} />
          <Route path="/checkout" element={<MainLayout><CheckoutPage /></MainLayout>} />

          {/* ================= 404 PAGE ================= */}
          <Route
            path="*"
            element={
              <MainLayout>
                <div className="page-container py-32 text-center">
                  <h1 className="text-5xl text-stone-300">404</h1>
                  <p className="text-stone-400 mt-2">Page not found</p>

                  <a
                    href="/"
                    className="btn-primary mt-6 inline-flex"
                  >
                    Return Home
                  </a>
                </div>
              </MainLayout>
            }
          />

        </Routes>
      </AnimatePresence>
    </>
  )
}