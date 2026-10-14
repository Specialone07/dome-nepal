import { useState } from 'react'
import {
  Link,
  Outlet,
  useLocation,
  Navigate,
  useNavigate
} from 'react-router-dom'

import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Percent,
  ChevronLeft,
  LogOut,
  Menu
} from 'lucide-react'

import { useAuthStore } from '../../stores'
import { authAPI } from '../../services/api'
import toast from 'react-hot-toast'

// NAV ITEMS
const NAV = [
  { to: '/admin', label: 'Dashboard', Icon: LayoutDashboard },
  { to: '/admin/products', label: 'Products', Icon: Package },
  { to: '/admin/orders', label: 'Orders', Icon: ShoppingCart },
  { to: '/admin/users', label: 'Users', Icon: Users }
  ,{ to: '/admin/coupons', label: 'Coupons', Icon: Percent }
]

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const { user, logout, isAuthenticated } = useAuthStore()

  const location = useLocation()
  const navigate = useNavigate()

  // ================================
  // FIX: wait for auth hydration
  // ================================
  if (!isAuthenticated) {
    return <Navigate to="/dome-admin-login-4829" replace />
  }

  if (!user?.role || !['admin', 'superadmin'].includes(user.role)) {
    return <Navigate to="/" replace />
  }

  const handleLogout = async () => {
    try {
      await authAPI.logout()
    } catch {}

    logout()
    navigate('/')
    toast.success('Signed out')
  }

  const SidebarContent = ({ mobile = false }) => (
    <div
      className={`flex flex-col h-full bg-obsidian-900 transition-all duration-300 ${
        mobile ? 'w-64' : collapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* HEADER */}
      <div
        className={`flex items-center border-b border-white/10 h-16 px-4 ${
          collapsed && !mobile ? 'justify-center' : 'justify-between'
        }`}
      >
        <AnimatePresence>
          {(!collapsed || mobile) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <span className="font-display text-cream-50 text-lg tracking-widest">
                DOME
              </span>
              <span className="font-mono text-gold-400 text-[9px] ml-2">
                Admin
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {!mobile && (
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="text-stone-500 hover:text-white"
          >
            <motion.div animate={{ rotate: collapsed ? 180 : 0 }}>
              <ChevronLeft size={16} />
            </motion.div>
          </button>
        )}
      </div>

      {/* NAV */}
      <nav className="flex-1 py-4 space-y-1 px-2">
        {NAV.map(({ to, label, Icon }) => {
          const active =
            location.pathname === to ||
            (to !== '/admin' && location.pathname.startsWith(to))

          return (
            <Link
              key={to}
              to={to}
              onClick={() => mobile && setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded text-sm transition ${
                active
                  ? 'bg-gold-400/20 text-gold-300'
                  : 'text-stone-400 hover:text-white hover:bg-white/5'
              } ${collapsed && !mobile ? 'justify-center' : ''}`}
            >
              <Icon size={16} />
              {(!collapsed || mobile) && (
                <span className="text-xs">{label}</span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* LOGOUT */}
      <div className="border-t border-white/10 p-3">
        <button
          onClick={handleLogout}
          className={`flex items-center gap-3 w-full px-2 py-2 text-stone-400 hover:text-red-400 ${
            collapsed && !mobile ? 'justify-center' : ''
          }`}
        >
          <LogOut size={14} />
          {(!collapsed || mobile) && <span className="text-xs">Sign Out</span>}
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-stone-50 overflow-hidden">
      {/* DESKTOP SIDEBAR */}
      <div className="hidden md:block">
        <SidebarContent />
      </div>

      {/* MOBILE SIDEBAR */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />

            <motion.div
              className="fixed left-0 top-0 bottom-0 z-50 md:hidden"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
            >
              <SidebarContent mobile />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* MAIN */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b flex items-center px-6">
          <button
            className="md:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={20} />
          </button>

          <div className="flex-1" />

          <div className="w-8 h-8 rounded-full bg-gold-400 flex items-center justify-center">
            {user?.name?.[0]}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
