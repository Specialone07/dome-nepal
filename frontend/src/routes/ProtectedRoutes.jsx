import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores'

const ADMIN_LOGIN = '/dome-admin-login-4829'

function AuthLoader() {
  return (
    <div className="h-screen flex items-center justify-center bg-obsidian-900">
      <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export function AdminRoute({ children }) {
  const { isAuthenticated, isLoading, user } = useAuthStore()
  const location = useLocation()

  if (isLoading) return <AuthLoader />

  if (!isAuthenticated) {
    // ✅ Don't redirect to login — just send to home
    return <Navigate to="/" replace />
  }

  if (!['admin', 'superadmin'].includes(user?.role)) {
    return <Navigate to="/" replace />
  }

  return children
}