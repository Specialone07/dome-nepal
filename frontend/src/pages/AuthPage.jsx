import { useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Eye, EyeOff } from 'lucide-react'
import { authAPI, wishlistAPI } from '../services/api'
import { useAuthStore, useWishlistStore } from '../stores'
import PageTransition from '../components/common/PageTransition'
import toast from 'react-hot-toast'

export default function AuthPage({ mode = 'login' }) {
  const [isLogin, setIsLogin] = useState(mode === 'login')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const { login } = useAuthStore()
  const { items: savedProductIds, setItems: setWishlistItems } = useWishlistStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get('redirect') || location.state?.from?.pathname || '/'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (isLogin) {
        const { data } = await authAPI.login({ email: form.email, password: form.password })
        login(data.data.user)
        toast.success(`Welcome back, ${data.data.user.name.split(' ')[0]}!`)
      } else {
        const { data } = await authAPI.register(form)
        login(data.data.user)
        toast.success('Account created successfully!')
      }
      if (savedProductIds.length) {
        const synced = await wishlistAPI.sync(savedProductIds)
        setWishlistItems(synced.data.data.wishlist.map(product => product._id))
      }
      navigate(redirect)
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Authentication failed')
    } finally { setLoading(false) }
  }

  return (
    <PageTransition>
      <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
        {/* Left - Image */}
        <div className="hidden md:block relative overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=1200&q=85"
            alt="Fashion"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-obsidian-900/50" />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-12">
            <p className="font-mono text-[10px] tracking-[0.4em] uppercase text-gold-300 mb-4">Dome Nepal</p>
            <h2 className="font-display text-5xl font-light text-cream-50 leading-tight mb-4">
              Dress with<br /><em className="italic text-gold-300">Intention</em>
            </h2>
            <p className="text-cream-50/60 text-sm max-w-sm">
              Premium fashion, designed and made in Nepal, for the modern explorer.
            </p>
          </div>
        </div>

        {/* Right - Form */}
        <div className="flex items-center justify-center px-6 py-16 bg-cream-50">
          <div className="w-full max-w-sm">
            <div className="mb-8 text-center md:text-left">
              <Link to="/" className="font-display text-2xl tracking-[0.1em] text-obsidian-900 block mb-8 md:hidden">DOME Nepal</Link>
              <h1 className="font-display text-3xl font-light text-obsidian-900 mb-1">
                {isLogin ? 'Welcome back' : 'Create account'}
              </h1>
              <p className="text-xs text-stone-400">
                {isLogin ? 'Sign in to your Dome Nepal account' : 'Join the Dome Nepal community'}
              </p>
            </div>

            {/* Toggle */}
            <div className="flex border border-stone-200 mb-8">
              {['Sign In', 'Register'].map((label, i) => (
                <button
                  key={label}
                  onClick={() => setIsLogin(i === 0)}
                  className={`flex-1 py-2.5 text-xs tracking-[0.1em] uppercase transition-colors ${
                    (i === 0) === isLogin ? 'bg-obsidian-900 text-cream-50' : 'text-stone-400 hover:text-obsidian-900'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.form
                key={isLogin ? 'login' : 'register'}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                onSubmit={handleSubmit}
                className="space-y-4"
              >
                {!isLogin && (
                  <div>
                    <label className="block text-xs tracking-[0.15em] uppercase text-stone-500 mb-1.5">Full Name</label>
                    <input
                      type="text" required value={form.name}
                      onChange={e => setForm(f => ({...f, name: e.target.value}))}
                      className="input-field" placeholder="Your full name"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs tracking-[0.15em] uppercase text-stone-500 mb-1.5">Email Address</label>
                  <input
                    type="email" required value={form.email}
                    onChange={e => setForm(f => ({...f, email: e.target.value}))}
                    className="input-field" placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label className="block text-xs tracking-[0.15em] uppercase text-stone-500 mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'} required value={form.password}
                      onChange={e => setForm(f => ({...f, password: e.target.value}))}
                      className="input-field pr-10" placeholder="••••••••" minLength={isLogin ? 1 : 8}
                    />
                    <button
                      type="button" onClick={() => setShowPass(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400"
                    >
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <motion.button
                  type="submit" disabled={loading}
                  whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                  className="btn-primary w-full text-xs mt-6 disabled:opacity-60"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                        className="w-3.5 h-3.5 border-2 border-cream-50 border-t-transparent rounded-full inline-block" />
                      {isLogin ? 'Signing In...' : 'Creating Account...'}
                    </span>
                  ) : isLogin ? 'Sign In' : 'Create Account'}
                </motion.button>
              </motion.form>
            </AnimatePresence>

            <p className="text-xs text-stone-400 text-center mt-6">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-obsidian-900 hover:text-gold-500 transition-colors underline underline-offset-2"
              >
                {isLogin ? 'Register here' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </PageTransition>
  )
}
