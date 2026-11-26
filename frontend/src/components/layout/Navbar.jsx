import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, ShoppingBag, Heart, User, Menu, X, ChevronDown } from 'lucide-react'
import { useAuthStore, useCartStore, useUIStore } from '../../stores'
import { productAPI } from '../../services/api'
import { debounce } from '../../utils/helpers'

const NAV_LINKS = [
  { label: 'New Arrivals', path: '/shop?filter=new' },
  { label: 'Collections', path: '/shop', sub: [
    { label: 'Tops & Shirts', path: '/shop?category=tops' },
    { label: 'Outerwear', path: '/shop?category=outerwear' },
    { label: 'Bottoms', path: '/shop?category=bottoms' },
    { label: 'Accessories', path: '/shop?category=accessories' },
  ]},
  { label: 'Men', path: '/shop?gender=men' },
  { label: 'Women', path: '/shop?gender=women' },
  { label: 'Sale', path: '/shop?filter=sale', highlight: true },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const { isAuthenticated, user } = useAuthStore()
  const openCart = useCartStore((s) => s.openCart)
  const itemCount = useCartStore((s) => s.items.reduce((n, i) => n + i.quantity, 0))
  const { searchOpen, openSearch, closeSearch, mobileMenuOpen, openMobileMenu, closeMobileMenu } = useUIStore()
  const location = useLocation()
  const navigate = useNavigate()
  const searchRef = useRef(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    closeMobileMenu()
    closeSearch()
  }, [location.pathname])

  const doSearch = debounce(async (q) => {
    if (!q || q.length < 2) { setSearchResults([]); return }
    setSearchLoading(true)
    try {
      const { data } = await productAPI.search(q, 6)
      setSearchResults(data.data.products)
    } catch { setSearchResults([]) }
    finally { setSearchLoading(false) }
  }, 350)

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value)
    doSearch(e.target.value)
  }

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`)
      closeSearch()
      setSearchQuery('')
      setSearchResults([])
    }
  }

  return (
    <>
      {/* Announcement Bar */}
      <div className="bg-obsidian-900 text-cream-50 py-2 overflow-hidden">
        <div className="flex animate-marquee whitespace-nowrap">
          {Array(4).fill('Delivery to all 77 districts · Cash on delivery & FonePay QR · Free delivery above NPR 5,000 · ').map((t, i) => (
            <span key={i} className="font-mono text-[10px] tracking-[0.25em] uppercase mx-8">{t}</span>
          ))}
        </div>
      </div>

      {/* Main Navbar */}
      <motion.nav
        initial={false}
        animate={{
          backgroundColor: scrolled ? 'rgba(253,251,247,0.95)' : 'rgba(253,251,247,0)',
          backdropFilter: scrolled ? 'blur(20px)' : 'blur(0px)',
          boxShadow: scrolled ? '0 1px 0 rgba(0,0,0,0.06)' : 'none',
        }}
        transition={{ duration: 0.4 }}
        className="sticky top-0 z-50"
      >
        <div className="page-container">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo */}
            <Link to="/" className="flex-shrink-0">
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="flex flex-col items-start leading-none"
              >
                <span className="font-display text-2xl md:text-3xl font-light tracking-[0.1em] text-obsidian-900">
                  DOME
                </span>
                <span className="font-mono text-[9px] tracking-[0.4em] text-gold-400 uppercase -mt-1">
                  Nepal
                </span>
              </motion.div>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              {NAV_LINKS.map((link) => (
                <div
                  key={link.label}
                  className="relative"
                  onMouseEnter={() => link.sub && setActiveDropdown(link.label)}
                  onMouseLeave={() => setActiveDropdown(null)}
                >
                  <Link
                    to={link.path}
                    className={`nav-link flex items-center gap-1 ${link.highlight ? 'text-red-500 after:bg-red-500' : ''}`}
                  >
                    {link.label}
                    {link.sub && <ChevronDown size={12} className={`transition-transform duration-200 ${activeDropdown === link.label ? 'rotate-180' : ''}`} />}
                  </Link>

                  {/* Dropdown */}
                  <AnimatePresence>
                    {link.sub && activeDropdown === link.label && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-full left-1/2 -translate-x-1/2 mt-4 w-52 bg-white border border-stone-100 shadow-xl z-50"
                      >
                        <div className="py-2">
                          {link.sub.map(sub => (
                            <Link
                              key={sub.label}
                              to={sub.path}
                              className="block px-5 py-3 text-xs tracking-[0.1em] uppercase font-body text-obsidian-700 hover:bg-cream-100 hover:text-obsidian-900 transition-colors"
                            >
                              {sub.label}
                            </Link>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 md:gap-4">
              {/* Search Toggle */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={openSearch}
                className="p-1.5 text-obsidian-900/70 hover:text-obsidian-900 transition-colors"
                aria-label="Search"
              >
                <Search size={18} strokeWidth={1.5} />
              </motion.button>

              {/* Wishlist */}
              <Link to="/wishlist">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-1.5 text-obsidian-900/70 hover:text-obsidian-900 transition-colors hidden sm:block"
                >
                  <Heart size={18} strokeWidth={1.5} />
                </motion.div>
              </Link>

              {/* Account */}
              <Link to={isAuthenticated ? '/account' : '/login'}>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="p-1.5 text-obsidian-900/70 hover:text-obsidian-900 transition-colors hidden sm:block"
                >
                  <User size={18} strokeWidth={1.5} />
                </motion.div>
              </Link>

              {/* Cart */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={openCart}
                className="relative p-1.5 text-obsidian-900 transition-colors"
                aria-label="Cart"
              >
                <ShoppingBag size={20} strokeWidth={1.5} />
                <AnimatePresence>
                  {itemCount > 0 && (
                    <motion.span
                      key="badge"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-gold-400 text-obsidian-900 text-[9px] font-mono font-bold rounded-full flex items-center justify-center"
                    >
                      {itemCount > 9 ? '9+' : itemCount}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>

              {/* Mobile Menu */}
              <button
                onClick={openMobileMenu}
                className="md:hidden p-1.5 text-obsidian-900"
                aria-label="Menu"
              >
                <Menu size={20} strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Search Overlay */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-obsidian-900/40 backdrop-blur-sm"
            onClick={closeSearch}
          >
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="bg-white shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="page-container py-6">
                <form onSubmit={handleSearchSubmit} className="flex items-center gap-4">
                  <Search size={20} className="text-stone-400 flex-shrink-0" />
                  <input
                    ref={searchRef}
                    autoFocus
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    placeholder="Search for products, styles, categories..."
                    className="flex-1 bg-transparent text-lg font-body text-obsidian-900 placeholder-stone-300 focus:outline-none"
                  />
                  <button type="button" onClick={closeSearch} className="p-1 text-stone-400 hover:text-obsidian-900 transition-colors">
                    <X size={20} />
                  </button>
                </form>

                {/* Search Results */}
                <AnimatePresence>
                  {(searchResults.length > 0 || searchLoading) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 border-t border-stone-100 pt-4"
                    >
                      {searchLoading ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {[1,2,3].map(i => (
                            <div key={i} className="flex items-center gap-3">
                              <div className="skeleton w-12 h-12 flex-shrink-0" />
                              <div className="flex-1 space-y-2">
                                <div className="skeleton h-3 w-3/4 rounded" />
                                <div className="skeleton h-3 w-1/2 rounded" />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {searchResults.map(product => (
                            <Link
                              key={product._id}
                              to={`/products/${product.slug}`}
                              onClick={() => { closeSearch(); setSearchQuery(''); setSearchResults([]) }}
                              className="flex items-center gap-3 p-2 hover:bg-cream-100 transition-colors group"
                            >
                              <img
                                src={product.images?.[0]?.url || '/placeholder.jpg'}
                                alt={product.name}
                                className="w-12 h-12 object-cover flex-shrink-0"
                              />
                              <div>
                                <p className="text-sm font-body text-obsidian-900 group-hover:text-obsidian-700 line-clamp-1">{product.name}</p>
                                <p className="text-xs text-stone-500 capitalize">{product.category}</p>
                              </div>
                            </Link>
                          ))}
                          <button
                            onClick={handleSearchSubmit}
                            className="col-span-full text-center text-xs tracking-[0.15em] uppercase text-gold-500 hover:text-gold-600 py-2 transition-colors"
                          >
                            View all results for "{searchQuery}"
                          </button>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-obsidian-900/50 backdrop-blur-sm md:hidden"
              onClick={closeMobileMenu}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed inset-y-0 left-0 z-50 w-80 bg-white shadow-2xl md:hidden flex flex-col"
            >
              <div className="flex items-center justify-between p-6 border-b border-stone-100">
                <span className="font-display text-xl tracking-widest">DOME Nepal</span>
                <button onClick={closeMobileMenu}><X size={20} /></button>
              </div>
              <nav className="flex-1 overflow-y-auto p-6 space-y-1">
                {NAV_LINKS.map((link, i) => (
                  <motion.div
                    key={link.label}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                  >
                    <Link
                      to={link.path}
                      className={`block py-3 text-sm tracking-[0.1em] uppercase font-body border-b border-stone-100 ${link.highlight ? 'text-red-500' : 'text-obsidian-900'}`}
                    >
                      {link.label}
                    </Link>
                    {link.sub && (
                      <div className="pl-4 mt-1 space-y-1">
                        {link.sub.map(sub => (
                          <Link
                            key={sub.label}
                            to={sub.path}
                            className="block py-2 text-xs tracking-[0.1em] text-stone-500 hover:text-obsidian-900 transition-colors"
                          >
                            {sub.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </motion.div>
                ))}
              </nav>
              <div className="p-6 border-t border-stone-100 space-y-3">
                <Link to={isAuthenticated ? '/account' : '/login'} className="flex items-center gap-3 text-sm text-obsidian-900">
                  <User size={16} /> {isAuthenticated ? `Hi, ${user?.name?.split(' ')[0]}` : 'Sign In / Register'}
                </Link>
                <Link to="/wishlist" className="flex items-center gap-3 text-sm text-obsidian-900">
                  <Heart size={16} /> Wishlist
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
