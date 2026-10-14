import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Minus, ShoppingBag, Trash2, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useCartStore } from '../../stores'
import { formatPrice } from '../../utils/helpers'

export default function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, updateQty } = useCartStore()

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const shipping = subtotal >= 5000 ? 0 : 180
  const total = subtotal + shipping

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 bg-obsidian-900/40 backdrop-blur-sm"
            onClick={closeCart}
          />

          {/* Drawer */}
          <motion.div
            key="drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 280, mass: 0.8 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[440px] bg-white flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-stone-100">
              <div>
                <h2 className="font-display text-xl font-light tracking-wide">Your Bag</h2>
                <p className="text-xs text-stone-400 font-mono mt-0.5">
                  {items.length === 0 ? 'Empty' : `${items.reduce((s,i) => s+i.quantity, 0)} items`}
                </p>
              </div>
              <button
                onClick={closeCart}
                className="p-2 hover:bg-stone-100 transition-colors rounded-full"
              >
                <X size={18} />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <AnimatePresence initial={false}>
                {items.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center h-full text-center py-16"
                  >
                    <ShoppingBag size={48} strokeWidth={1} className="text-stone-200 mb-4" />
                    <p className="font-display text-xl text-stone-300 mb-2">Your bag is empty</p>
                    <p className="text-xs text-stone-400 mb-8">Discover our curated collection</p>
                    <button onClick={closeCart} className="btn-primary text-xs">
                      Explore Collection
                    </button>
                  </motion.div>
                ) : (
                  <div className="space-y-5">
                    {items.map((item) => (
                      <motion.div
                        key={item.key}
                        layout
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0 }}
                        transition={{ duration: 0.3 }}
                        className="flex gap-4 group"
                      >
                        {/* Image */}
                        <Link
                          to={`/products/${item.slug}`}
                          onClick={closeCart}
                          className="w-20 h-24 flex-shrink-0 overflow-hidden bg-cream-100"
                        >
                          <img
                            src={item.image || '/placeholder.jpg'}
                            alt={item.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            loading="lazy"
                          />
                        </Link>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-1">
                            <Link
                              to={`/products/${item.slug}`}
                              onClick={closeCart}
                              className="font-body text-sm text-obsidian-900 hover:text-stone-600 transition-colors leading-tight line-clamp-2"
                            >
                              {item.name}
                            </Link>
                            <button
                              onClick={() => removeItem(item.key)}
                              className="p-1 ml-2 text-stone-300 hover:text-red-400 transition-colors flex-shrink-0"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>

                          <p className="text-xs text-stone-400 font-mono mb-3">
                            {item.size} · {item.color}
                          </p>

                          <div className="flex items-center justify-between">
                            {/* Quantity */}
                            <div className="flex items-center border border-stone-200">
                              <button
                                onClick={() => updateQty(item.key, item.quantity - 1)}
                                className="w-7 h-7 flex items-center justify-center text-stone-400 hover:text-obsidian-900 hover:bg-stone-50 transition-colors"
                              >
                                <Minus size={12} />
                              </button>
                              <span className="w-8 text-center text-xs font-mono">{item.quantity}</span>
                              <button
                                onClick={() => updateQty(item.key, item.quantity + 1)}
                                className="w-7 h-7 flex items-center justify-center text-stone-400 hover:text-obsidian-900 hover:bg-stone-50 transition-colors"
                              >
                                <Plus size={12} />
                              </button>
                            </div>

                            {/* Price */}
                            <span className="font-display text-sm font-medium text-obsidian-900">
                              {formatPrice(item.price * item.quantity)}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="border-t border-stone-100 px-6 py-5 space-y-4 bg-cream-50">
                {/* Free shipping indicator */}
                {subtotal < 5000 && (
                  <div>
                    <div className="flex justify-between text-xs text-stone-500 mb-1.5">
                      <span>Free shipping unlocks at NPR 5,000</span>
                      <span>{formatPrice(5000 - subtotal)} away</span>
                    </div>
                    <div className="h-1 bg-stone-200 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(subtotal / 5000) * 100}%` }}
                        className="h-full bg-gold-400 rounded-full"
                      />
                    </div>
                  </div>
                )}

                {/* Totals */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-stone-500">
                    <span>Subtotal</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-stone-500">
                    <span>Shipping</span>
                    <span>{shipping === 0 ? <span className="text-green-600">Free</span> : formatPrice(shipping)}</span>
                  </div>
                  <div className="flex justify-between font-body font-medium text-sm text-obsidian-900 pt-2 border-t border-stone-200">
                    <span>Total</span>
                    <span className="font-display text-lg">{formatPrice(total)}</span>
                  </div>
                </div>

                {/* CTA */}
                <Link
                  to="/checkout"
                  onClick={closeCart}
                  className="btn-primary w-full flex items-center justify-center gap-2 text-center"
                >
                  Proceed to Checkout
                  <ArrowRight size={14} />
                </Link>
                <p>
                  Delivery is free above Rs. 5,000; otherwise a Rs. 180 standard delivery fee applies.
                </p>

                <button
                  onClick={closeCart}
                  className="w-full text-center text-xs text-stone-400 hover:text-obsidian-900 transition-colors tracking-[0.1em] uppercase"
                >
                  Continue Shopping
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
