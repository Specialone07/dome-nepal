import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { authAPI } from '../../services/api'
import { useAuthStore } from '../../stores'

export default function AdminLogin() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  const login    = useAuthStore((s) => s.login)
  const navigate = useNavigate()
  const location = useLocation()
  const from     = location.state?.from?.pathname || '/admin'

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('') // ✅ clear previous error

    // ✅ Client-side validation
    if (!email.trim() || !password.trim()) {
      setError('Email and password are required')
      return
    }

    try {
      setLoading(true)
      const res  = await authAPI.adminLogin({ email, password })
      const user = res.data.data.user

      // ✅ accessToken is now in httpOnly cookie — only user info in response
      login(user)

      navigate(from, { replace: true })
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-screen flex items-center justify-center bg-obsidian-900">
      <form
        onSubmit={handleLogin}
        className="w-[350px] bg-white p-6 rounded shadow-lg"
        noValidate
      >
        <h1 className="text-xl font-semibold mb-6">Admin Login</h1>

        {/* ✅ State-based error — no alert() */}
        {error && (
          <p className="text-red-500 text-sm mb-4 bg-red-50 border border-red-200 rounded px-3 py-2">
            {error}
          </p>
        )}

        {/* ✅ Controlled input with type and autocomplete */}
        <input
          type="email"
          name="email"
          autoComplete="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border p-2 mb-3 rounded focus:outline-none focus:ring-2 focus:ring-black"
          disabled={loading}
          required
        />

        <input
          type="password"
          name="password"
          autoComplete="current-password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border p-2 mb-6 rounded focus:outline-none focus:ring-2 focus:ring-black"
          disabled={loading}
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white p-2 rounded hover:bg-gray-800 transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? 'Logging in…' : 'Login'}
        </button>
      </form>
    </div>
  )
}