import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, ShoppingBag, Eye, Star } from 'lucide-react'
import { useCartStore, useWishlistStore, useAuthStore } from '../../stores'
import { formatPrice } from '../../utils/helpers'
import { wishlistAPI } from '../../services/api'
import toast from 'react-hot-toast'

export default function ProductCard({ product, index = 0 }) {
  const [hovered, setHovered] = useState(false)
  const [activeImg, setActiveImg] = useState(0)
  const [adding, setAdding] = useState(false)
  const { addItem } = useCartStore()
  const { has, toggle } = useWishlistStore()
  const { isAuthenticated } = useAuthStore()

  const isWishlisted = has(product._id)
  const hasMultipleImages = product.images?.length > 1
  const mainImage = product.images?.[activeImg]?.url || product.images?.[0]?.url
  const defaultVariant = product.variants?.find(variant => variant.stock > 0)

  const handleAddToCart = (e) => {
    e.preventDefault()
    if (!defaultVariant) return toast.error('Please select options on product page')
    setAdding(true)
    addItem(product, defaultVariant.size, defaultVariant.color)
    setTimeout(() => setAdding(false), 1000)
    toast.success(`${product.name} added to bag`)
  }

  const handleWishlist = async (e) => {
    e.preventDefault()
    toggle(product._id)
    if (isAuthenticated) {
      try { await wishlistAPI.toggle(product._id) } catch {}
    }
    toast(isWishlisted ? 'Removed from wishlist' : 'Added to wishlist',
      { icon: isWishlisted ? '💔' : '❤️' })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className="group relative"
    >
      <Link to={`/products/${product.slug}`} className="block">
        {/* Image Container */}
        <div className="relative overflow-hidden bg-cream-100 aspect-[3/4] mb-3">
          {/* Main Image */}
          <motion.img
            src={mainImage}
            alt={product.name}
            animate={{ scale: hovered ? 1.06 : 1 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="w-full h-full object-cover"
            loading="lazy"
          />

          {/* Hover image */}
          <AnimatePresence>
            {hovered && hasMultipleImages && (
              <motion.img
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                src={product.images[1].url}
                alt={product.name}
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}
          </AnimatePresence>

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
            {product.newArrival && <span className="badge-new">New</span>}
            {product.comparePrice > product.price && (
              <span className="badge bg-red-500 text-white">-{Math.round((1 - product.price / product.comparePrice) * 100)}%</span>
            )}
            {product.isBestSeller && <span className="badge bg-obsidian-900 text-cream-50">Best Seller</span>}
          </div>

          {/* Wishlist */}
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: hovered || isWishlisted ? 1 : 0, scale: hovered || isWishlisted ? 1 : 0.8 }}
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleWishlist}
            className="absolute top-3 right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm z-10"
          >
            <motion.div
              animate={{ scale: isWishlisted ? [1, 1.4, 1] : 1 }}
              transition={{ duration: 0.3 }}
            >
              <Heart
                size={14}
                className={isWishlisted ? 'fill-red-500 text-red-500' : 'text-stone-400'}
              />
            </motion.div>
          </motion.button>

          {/* Quick Add Overlay */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: hovered ? 1 : 0, y: hovered ? 0 : 8 }}
            transition={{ duration: 0.25 }}
            className="absolute bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm z-10"
          >
            <div className="flex items-center divide-x divide-stone-200">
              <motion.button
                onClick={handleAddToCart}
                whileTap={{ scale: 0.97 }}
                className="flex-1 flex items-center justify-center gap-2 py-3 text-[11px] tracking-[0.15em] uppercase font-body text-obsidian-900 hover:bg-obsidian-900 hover:text-white transition-colors"
              >
                <AnimatePresence mode="wait">
                  {adding ? (
                    <motion.span
                      key="added"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="text-green-600"
                    >✓</motion.span>
                  ) : (
                    <motion.div key="add" initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="flex items-center gap-2">
                      <ShoppingBag size={12} />
                      Quick Add
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
              <span className="w-11 flex items-center justify-center py-3 hover:bg-obsidian-900 hover:text-white transition-colors text-obsidian-900" aria-hidden="true">
                <Eye size={14} />
              </span>
            </div>
          </motion.div>

          {/* Image dots */}
          {hasMultipleImages && (
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-1 z-10">
              {product.images.slice(0, 4).map((_, i) => (
                <button
                  key={i}
                  onMouseEnter={() => setActiveImg(i)}
                  onClick={(e) => { e.preventDefault(); setActiveImg(i) }}
                  className={`w-1 h-1 rounded-full transition-all duration-300 ${i === activeImg ? 'bg-white w-4' : 'bg-white/50'}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="px-0.5">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-body text-sm text-obsidian-900 leading-tight line-clamp-1 flex-1 group-hover:text-stone-600 transition-colors">
              {product.name}
            </h3>
            <div className="flex items-center gap-0.5 flex-shrink-0">
              <Star size={10} className="fill-gold-400 text-gold-400" />
              <span className="text-[10px] text-stone-400 font-mono">{product.ratingsAverage?.toFixed(1) || '—'}</span>
            </div>
          </div>

          <p className="text-xs text-stone-400 capitalize mb-2 font-mono">{product.category}</p>

          <div className="flex items-center gap-2">
            <span className="font-display text-base font-medium text-obsidian-900">
              {formatPrice(product.price)}
            </span>
            {product.comparePrice > product.price && (
              <span className="text-xs text-stone-400 line-through font-mono">
                {formatPrice(product.comparePrice)}
              </span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
