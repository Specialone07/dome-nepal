import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores'

// =====================
// USER PROTECTED
// =====================
export function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuthStore()
  const location = useLocation()

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/dome-admin-login-4829"
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
  const { isAuthenticated, user } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/dome-admin-login-4829" replace />
  }

  if (!['admin', 'superadmin'].includes(user?.role)) {
    return <Navigate to="/" replace />
  }

  return children
}