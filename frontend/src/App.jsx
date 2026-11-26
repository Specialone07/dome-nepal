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
import AuthPage from './pages/AuthPage'
import AccountPage from './pages/AccountPage'
import OrderDetailPage from './pages/OrderDetailPage'
import GuestOrdersPage from './pages/GuestOrdersPage'
import NotFoundPage from './pages/NotFoundPage'
import AboutPage from './pages/info/AboutPage'
import ContactPage from './pages/info/ContactPage'
import FAQPage from './pages/info/FAQPage'
import ShippingReturnsPage from './pages/info/ShippingReturnsPage'
import SizeGuidePage from './pages/info/SizeGuidePage'
import { PrivacyPage, TermsPage } from './pages/info/LegalPages'

import AdminLayout from './pages/admin/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminProducts from './pages/admin/AdminProducts'
import AdminOrders from './pages/admin/AdminOrders'
import AdminLogin from './pages/admin/AdminLogin'
import AdminOrderDetails from './pages/admin/AdminOrderDetails'
import AdminUsers from './pages/admin/AdminUsers'
import AdminCoupons from './pages/admin/AdminCoupons'
import AdminShipping from './pages/admin/AdminShipping'

import { AdminRoute, ProtectedRoute } from './routes/ProtectedRoutes'
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
  const checkAuth = useAuthStore((s) => s.checkAuth)
  const location = useLocation()

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  return (
    <>
      {/* ✅ GLOBAL UI (NOT ROUTE-BOUND) */}
      {!/^\/(admin|dome-admin)/.test(location.pathname) && <FloatingSocial />}

      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>

          {/* ADMIN LOGIN */}
          <Route path="/dome-admin-login-4829" element={<AdminLogin />} />

          {/* ADMIN */}
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
            <Route path="users" element={<AdminUsers />} />
            <Route path="coupons" element={<AdminCoupons />} />
            <Route path="shipping" element={<AdminShipping />} />
          </Route>

          {/* PUBLIC */}
          <Route path="/" element={<MainLayout><HomePage /></MainLayout>} />
          <Route path="/shop" element={<MainLayout><ShopPage /></MainLayout>} />
          <Route path="/products/:slug" element={<MainLayout><ProductDetailPage /></MainLayout>} />
          <Route path="/wishlist" element={<MainLayout><WishlistPage /></MainLayout>} />
          <Route path="/checkout" element={<MainLayout><CheckoutPage /></MainLayout>} />
          <Route path="/login" element={<MainLayout><AuthPage mode="login" /></MainLayout>} />
          <Route path="/register" element={<MainLayout><AuthPage mode="register" /></MainLayout>} />
          <Route path="/account" element={<MainLayout><ProtectedRoute><AccountPage /></ProtectedRoute></MainLayout>} />
          <Route path="/account/orders/:id" element={<MainLayout><ProtectedRoute><OrderDetailPage /></ProtectedRoute></MainLayout>} />
          <Route path="/orders" element={<MainLayout><GuestOrdersPage /></MainLayout>} />
          <Route path="/orders/:id" element={<MainLayout><OrderDetailPage /></MainLayout>} />

          {/* INFO PAGES */}
          <Route path="/about" element={<MainLayout><AboutPage /></MainLayout>} />
          <Route path="/contact" element={<MainLayout><ContactPage /></MainLayout>} />
          <Route path="/faq" element={<MainLayout><FAQPage /></MainLayout>} />
          <Route path="/shipping-returns" element={<MainLayout><ShippingReturnsPage /></MainLayout>} />
          <Route path="/size-guide" element={<MainLayout><SizeGuidePage /></MainLayout>} />
          <Route path="/privacy" element={<MainLayout><PrivacyPage /></MainLayout>} />
          <Route path="/terms" element={<MainLayout><TermsPage /></MainLayout>} />

          {/* 404 */}
          <Route path="*" element={<MainLayout><NotFoundPage /></MainLayout>} />

        </Routes>
      </AnimatePresence>
    </>
  )
}
