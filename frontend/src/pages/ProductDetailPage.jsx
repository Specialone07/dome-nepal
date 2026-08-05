import { useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { Heart, ShoppingBag, ChevronDown, ChevronLeft, ChevronRight, Share2, Check, Ruler } from 'lucide-react'
import { productAPI, reviewAPI } from '../services/api'
import { useCartStore, useWishlistStore, useAuthStore } from '../stores'
import { formatPrice, getStars } from '../utils/helpers'
import { ProductDetailSkeleton, ReviewSkeleton } from '../components/common/Skeletons'
import ProductCard from '../components/product/ProductCard'
import StarRating from '../components/common/StarRating'
import ScrollReveal, { ScrollRevealGroup, ScrollRevealItem } from '../components/common/ScrollReveal'
import PageTransition from '../components/common/PageTransition'
import SizeGuideModal from '../components/product/SizeGuideModal'
import toast from 'react-hot-toast'

// ─── Review Form ────────────────────────────────────────────────────────────────
function ReviewForm({ productId, onSuccess }) {
  const [rating, setRating] = useState(0)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { isAuthenticated } = useAuthStore()

  if (!isAuthenticated) return (
    <div className="text-center py-8 border border-stone-100 bg-cream-50">
      <p className="text-sm text-stone-500 mb-4">Sign in to leave a review</p>
      <Link to="/login" className="btn-outline text-xs">Sign In</Link>
    </div>
  )

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!rating) return toast.error('Please select a rating')
    setSubmitting(true)
    try {
      await reviewAPI.create({ product: productId, rating, title, body })
      toast.success('Review submitted!')
      setRating(0); setTitle(''); setBody('')
      onSuccess?.()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to submit review')
    } finally { setSubmitting(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 border border-stone-100 p-6">
      <h4 className="font-display text-lg font-light">Write a Review</h4>
      <div>
        <label className="block text-xs tracking-[0.15em] uppercase text-stone-500 mb-2">Your Rating *</label>
        <StarRating value={rating} onChange={setRating} size={22} />
      </div>
      <div>
        <label className="block text-xs tracking-[0.15em] uppercase text-stone-500 mb-1.5">Review Title *</label>
        <input value={title} onChange={e => setTitle(e.target.value)} required maxLength={100}
          className="input-field text-sm" placeholder="Summarize your experience" />
      </div>
      <div>
        <label className="block text-xs tracking-[0.15em] uppercase text-stone-500 mb-1.5">Your Review *</label>
        <textarea value={body} onChange={e => setBody(e.target.value)} required rows={4} maxLength={1000}
          className="input-field text-sm resize-none" placeholder="Tell others what you think..." />
      </div>
      <motion.button
        type="submit"
        disabled={submitting || !rating}
        whileTap={{ scale: 0.98 }}
        className="btn-primary text-xs disabled:opacity-50"
      >
        {submitting ? 'Submitting...' : 'Submit Review'}
      </motion.button>
    </form>
  )
}

// ─── Page ───────────────────────────────────────────────────────────────────────
export default function ProductDetailPage() {
  const { slug } = useParams()

  const [activeImg, setActiveImg] = useState(0)
  const [selectedSize, setSelectedSize] = useState('')
  const [selectedColor, setSelectedColor] = useState('')
  const [adding, setAdding] = useState(false)
  const [descOpen, setDescOpen] = useState(true)
  const [materialOpen, setMaterialOpen] = useState(false)
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false)

  const { addItem } = useCartStore()
  const { has, toggle } = useWishlistStore()
  const { isAuthenticated } = useAuthStore()

  const { data: productData, isLoading } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => productAPI.getOne(slug).then(r => r.data.data.product),
  })

  const product = productData
  const isWishlisted = product ? has(product._id) : false

  const { data: reviewsData, isLoading: reviewsLoading, refetch: refetchReviews } = useQuery({
    queryKey: ['reviews', product?._id],
    queryFn: () => reviewAPI.getForProduct(product._id).then(r => r.data.data),
    enabled: !!product?._id,
  })

  const { data: relatedData } = useQuery({
    queryKey: ['related', product?._id],
    queryFn: () => productAPI.getRelated(product._id).then(r => r.data.data.products),
    enabled: !!product?._id,
  })

  const sizes = product ? [...new Set(product.variants.map(v => v.size))] : []
  const colors = product ? [...new Set(
    product.variants.filter(v => !selectedSize || v.size === selectedSize).map(v => v.color)
  )] : []

  const selectedVariant = product?.variants.find(v =>
    (!selectedSize || v.size === selectedSize) && (!selectedColor || v.color === selectedColor)
  )

  const hasSizeChart = !!(
    product?.sizeChart?.enabled &&
    product?.sizeChart?.measurements?.length > 0 &&
    product?.sizeChart?.rows?.length > 0
  )

  // "Size Guide" button — open modal
  const handleOpenSizeGuide = () => {
    setSizeGuideOpen(true)
  }

  const handleAddToCart = () => {
    if (!selectedSize) return toast.error('Please select a size')
    if (!selectedColor) return toast.error('Please select a color')
    const variant = product.variants.find(v => v.size === selectedSize && v.color === selectedColor)
    if (!variant || variant.stock < 1) return toast.error('Out of stock')
    setAdding(true)
    addItem(product, selectedSize, selectedColor)
    setTimeout(() => setAdding(false), 1200)
    toast.success('Added to your bag!')
  }

  const handleWishlist = async () => {
    toggle(product._id)
    if (isAuthenticated) {
      try { await wishlistAPI.toggle(product._id) } catch {}
    }
    toast(isWishlisted ? 'Removed from wishlist' : 'Saved to wishlist',
      { icon: isWishlisted ? '💔' : '❤️' })
  }

  if (isLoading) return <ProductDetailSkeleton />
  if (!product) return (
    <div className="page-container py-24 text-center">
      <p className="font-display text-3xl text-stone-300">Product not found</p>
    </div>
  )

  // Build accordion items dynamically
  const accordionItems = [
    {
      key: 'description',
      title: 'Description',
      open: descOpen,
      setOpen: setDescOpen,
      content: (
        <p className="text-sm text-stone-500 pb-4 leading-relaxed whitespace-pre-line">
          {product.description}
        </p>
      ),
    },
    {
      key: 'material',
      title: 'Material & Care',
      open: materialOpen,
      setOpen: setMaterialOpen,
      content: (
        <p className="text-sm text-stone-500 pb-4 leading-relaxed whitespace-pre-line">
          {`Material: ${product.material || 'Premium fabric'}\n${product.careInstructions?.join('\n') || 'Follow care label instructions.'}`}
        </p>
      ),
    },
  ]

  return (
    <PageTransition>
      <div className="page-container py-8 md:py-14">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-stone-400 mb-8 font-mono">
          <Link to="/" className="hover:text-obsidian-900 transition-colors">Home</Link>
          <span>/</span>
          <Link to="/shop" className="hover:text-obsidian-900 transition-colors">Shop</Link>
          <span>/</span>
          <Link to={`/shop?category=${product.category}`} className="hover:text-obsidian-900 transition-colors capitalize">
            {product.category}
          </Link>
          <span>/</span>
          <span className="text-obsidian-900 line-clamp-1">{product.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">

          {/* ── Image Gallery ── */}
          <div className="space-y-3">
            <div className="relative aspect-[4/5] overflow-hidden bg-cream-100 group">
              <AnimatePresence mode="wait">
                <motion.img
                  key={activeImg}
                  initial={{ opacity: 0, scale: 1.03 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  src={product.images[activeImg]?.url}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              </AnimatePresence>
              {product.images.length > 1 && (
                <>
                  <button
                    onClick={() => setActiveImg(i => (i - 1 + product.images.length) % product.images.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  ><ChevronLeft size={16} /></button>
                  <button
                    onClick={() => setActiveImg(i => (i + 1) % product.images.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  ><ChevronRight size={16} /></button>
                </>
              )}
              {product.discountPercent > 0 && (
                <div className="absolute top-4 left-4">
                  <span className="badge-sale">-{product.discountPercent}%</span>
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {product.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {product.images.map((img, i) => (
                  <motion.button
                    key={i}
                    onClick={() => setActiveImg(i)}
                    whileHover={{ scale: 1.03 }}
                    className={`flex-shrink-0 w-16 h-20 overflow-hidden border-2 transition-colors ${
                      i === activeImg ? 'border-obsidian-900' : 'border-transparent hover:border-stone-300'
                    }`}
                  >
                    <img src={img.url} alt={`${product.name} ${i + 1}`} className="w-full h-full object-cover" />
                  </motion.button>
                ))}
              </div>
            )}
          </div>

          {/* ── Product Info ── */}
          <div className="flex flex-col">
            <div className="mb-2">
              <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-gold-500 capitalize">
                {product.category}
              </span>
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-light text-obsidian-900 mb-3">
              {product.name}
            </h1>

            {/* Rating */}
            <div className="flex items-center gap-3 mb-5">
              <StarRating value={product.ratingsAverage} readonly size={15} />
              <span className="text-xs text-stone-400 font-mono">
                {product.ratingsAverage?.toFixed(1)} ({product.ratingsCount} reviews)
              </span>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3 mb-7">
              <span className="font-display text-3xl font-medium">{formatPrice(product.price)}</span>
              {product.comparePrice > product.price && (
                <span className="text-stone-400 line-through font-mono text-base">
                  {formatPrice(product.comparePrice)}
                </span>
              )}
              {product.comparePrice > product.price && (
                <span className="badge-sale">Save {product.discountPercent}%</span>
              )}
            </div>

            {/* Size Selector */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs tracking-[0.15em] uppercase text-obsidian-900 font-mono">Size</label>
                {/* Size Guide button — only shown when chart exists */}
                {hasSizeChart ? (
                  <button
                    type="button"
                    onClick={handleOpenSizeGuide}
                    className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-obsidian-900 underline underline-offset-2 transition-colors"
                  >
                    <Ruler size={11} />
                    Size Guide
                  </button>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {sizes.map(size => {
                  const hasStock = product.variants.some(v => v.size === size && v.stock > 0)
                  return (
                    <motion.button
                      key={size}
                      whileHover={{ scale: hasStock ? 1.03 : 1 }}
                      whileTap={{ scale: hasStock ? 0.97 : 1 }}
                      onClick={() => hasStock && setSelectedSize(selectedSize === size ? '' : size)}
                      disabled={!hasStock}
                      className={`min-w-[48px] h-11 px-3 text-sm border transition-all duration-200 relative ${
                        selectedSize === size
                          ? 'bg-obsidian-900 text-cream-50 border-obsidian-900'
                          : hasStock
                          ? 'border-stone-200 text-obsidian-900 hover:border-obsidian-900'
                          : 'border-stone-100 text-stone-300 cursor-not-allowed line-through'
                      }`}
                    >
                      {size}
                    </motion.button>
                  )
                })}
              </div>
            </div>

            {/* Color Selector */}
            <div className="mb-8">
              <label className="block text-xs tracking-[0.15em] uppercase text-obsidian-900 font-mono mb-4">
                Color
                {selectedColor && (
                  <span className="normal-case tracking-normal text-stone-500 ml-2">— {selectedColor}</span>
                )}
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                {colors.map(color => {
                  const variant = product.variants.find(v =>
                    v.color === color && (!selectedSize || v.size === selectedSize)
                  )
                  const isOutOfStock = !variant || variant.stock === 0
                  const isSelected = selectedColor === color
                  const hex = variant?.colorHex || '#888'

                  return (
                    <motion.button
                      key={color}
                      whileHover={{ scale: isOutOfStock ? 1 : 1.05 }}
                      whileTap={{ scale: isOutOfStock ? 1 : 0.95 }}
                      onClick={() => {
                        if (isOutOfStock) return
                        setSelectedColor(color)
                        const imageIndex = product.images.findIndex(img =>
                          img.url.toLowerCase().includes(color.toLowerCase())
                        )
                        if (imageIndex !== -1) setActiveImg(imageIndex)
                      }}
                      disabled={isOutOfStock}
                      className={`relative flex flex-col items-center gap-2 p-2 border transition-all ${
                        isSelected
                          ? 'border-obsidian-900 bg-cream-50'
                          : 'border-stone-200 hover:border-obsidian-900'
                      } ${isOutOfStock ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      <div className="w-10 h-10 rounded-full border" style={{ backgroundColor: hex }} />
                      <span className="text-[10px] font-mono text-center">{color}</span>
                      {isSelected && (
                        <div className="absolute top-1 right-1">
                          <Check size={12} className="text-obsidian-900" />
                        </div>
                      )}
                      {isOutOfStock && (
                        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-mono bg-white/70">
                          Out
                        </span>
                      )}
                    </motion.button>
                  )
                })}
              </div>
            </div>

            {/* Stock indicator */}
            {selectedVariant && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`text-xs mb-4 font-mono ${
                  selectedVariant.stock > 5 ? 'text-green-600'
                  : selectedVariant.stock > 0 ? 'text-amber-600'
                  : 'text-red-500'
                }`}
              >
                {selectedVariant.stock > 5
                  ? '✓ In Stock'
                  : selectedVariant.stock > 0
                  ? `Only ${selectedVariant.stock} left`
                  : '✗ Out of Stock'}
              </motion.p>
            )}

            {/* CTA */}
            <div className="flex gap-3 mb-8">
              <motion.button
                onClick={handleAddToCart}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="btn-primary flex-1 flex items-center justify-center gap-2.5 text-xs"
              >
                <AnimatePresence mode="wait">
                  {adding ? (
                    <motion.span key="added" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="flex items-center gap-2">
                      <Check size={14} /> Added to Bag
                    </motion.span>
                  ) : (
                    <motion.span key="add" initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="flex items-center gap-2">
                      <ShoppingBag size={14} /> Add to Bag
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
              <motion.button
                onClick={handleWishlist}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className={`w-12 h-12 border flex items-center justify-center transition-colors ${
                  isWishlisted ? 'border-red-300 bg-red-50' : 'border-stone-200 hover:border-obsidian-900'
                }`}
              >
                <Heart size={16} className={isWishlisted ? 'fill-red-500 text-red-500' : ''} />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.03 }}
                className="w-12 h-12 border border-stone-200 flex items-center justify-center text-stone-400 hover:border-obsidian-900 hover:text-obsidian-900 transition-colors"
              >
                <Share2 size={16} />
              </motion.button>
            </div>

            {/* ── Accordion Info ── */}
            {accordionItems.map(({ key, title, open, setOpen, content }) => (
              <div key={key} className="border-t border-stone-100">
                <button
                  onClick={() => setOpen(o => !o)}
                  className="flex items-center justify-between w-full py-4 group"
                >
                  <span className="flex items-center gap-2 font-mono text-[11px] tracking-[0.2em] uppercase">
                    {title}
                  </span>
                  <ChevronDown
                    size={14}
                    className={`transition-transform duration-200 text-stone-400 group-hover:text-obsidian-900 ${open ? 'rotate-180' : ''}`}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      key={`${key}-body`}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      {content}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>

        {/* ── Reviews Section ── */}
        <ScrollReveal className="mt-20">
          <div className="border-t border-stone-100 pt-14">
            <div className="flex items-center justify-between mb-10">
              <div>
                <p className="section-subtitle">Customer Feedback</p>
                <h2 className="font-display text-3xl font-light">Reviews & Ratings</h2>
              </div>
              <div className="hidden md:flex items-center gap-4">
                <div className="text-center">
                  <div className="font-display text-5xl font-light text-obsidian-900">
                    {product.ratingsAverage?.toFixed(1)}
                  </div>
                  <StarRating value={product.ratingsAverage} readonly size={14} />
                  <p className="text-xs text-stone-400 mt-1 font-mono">{product.ratingsCount} reviews</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
              <div className="lg:col-span-3">
                {reviewsLoading ? <ReviewSkeleton /> : (
                  <div className="space-y-6">
                    {(reviewsData?.reviews || []).map((review, i) => (
                      <motion.div
                        key={review._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.07 }}
                        className="border border-stone-100 p-5 hover:border-stone-200 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gold-300 to-gold-500 flex items-center justify-center text-obsidian-900 font-display text-sm font-medium">
                              {review.user?.name?.[0]?.toUpperCase()}
                            </div>
                            <div>
                              <p className="font-body text-sm font-medium text-obsidian-900">{review.user?.name}</p>
                              <div className="flex items-center gap-2">
                                <StarRating value={review.rating} readonly size={11} />
                                {review.isVerifiedPurchase && (
                                  <span className="text-[9px] text-green-600 font-mono tracking-wider">✓ Verified Purchase</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] text-stone-400 font-mono">
                            {new Date(review.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                        <h4 className="font-body font-medium text-sm text-obsidian-900 mb-1.5">{review.title}</h4>
                        <p className="text-sm text-stone-500 leading-relaxed">{review.body}</p>
                      </motion.div>
                    ))}
                    {!reviewsData?.reviews?.length && (
                      <p className="text-sm text-stone-400 py-8 text-center">No reviews yet. Be the first to review!</p>
                    )}
                  </div>
                )}
              </div>
              <div className="lg:col-span-2">
                <ReviewForm productId={product._id} onSuccess={refetchReviews} />
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* ── Related Products ── */}
        {relatedData?.length > 0 && (
          <ScrollReveal className="mt-20">
            <div className="border-t border-stone-100 pt-14">
              <p className="section-subtitle mb-2">You May Also Like</p>
              <h2 className="font-display text-3xl font-light mb-10">Related Products</h2>
              <div className="product-grid">
                {relatedData.slice(0, 4).map((p, i) => <ProductCard key={p._id} product={p} index={i} />)}
              </div>
            </div>
          </ScrollReveal>
        )}

      </div>

      {/* Size Guide Modal */}
      <SizeGuideModal
        isOpen={sizeGuideOpen}
        onClose={() => setSizeGuideOpen(false)}
        sizeChart={product?.sizeChart}
        productName={product?.name}
      />
    </PageTransition>
  )
}