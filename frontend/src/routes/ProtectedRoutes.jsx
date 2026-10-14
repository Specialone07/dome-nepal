import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores'

const ADMIN_LOGIN_PATH = '/dome-admin-login-4829'

// ─── Shared loading spinner ──────────────────────────────────────
function AuthLoader() {
  return (
    <div className="h-screen flex items-center justify-center bg-obsidian-900">
      <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

// =====================
// USER PROTECTED
// =====================
export function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuthStore()
  const location = useLocation()

  // ✅ Wait for checkAuth to resolve — prevents false redirect
  if (isLoading) return <AuthLoader />

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    )
  }

  return children
}

// =====================
// ADMIN PROTECTED
// =====================
export function AdminRoute({ children }) {
  const { isAuthenticated, isLoading, user } = useAuthStore()
  const location = useLocation()

  if (isLoading) return <AuthLoader />

  if (!isAuthenticated) {
    // ✅ Consistent: pass location state same as ProtectedRoute
    return (
      <Navigate
        to={ADMIN_LOGIN_PATH}
        state={{ from: location }}
        replace
      />
    )
  }

  if (!['admin', 'superadmin'].includes(user?.role)) {
    return <Navigate to="/" replace />
  }

  return children
}
