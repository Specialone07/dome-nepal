import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Check } from 'lucide-react'
import { useCartStore, useAuthStore } from '../stores'
import { orderAPI } from '../services/api'
import { formatPrice } from '../utils/helpers'
import PageTransition from '../components/common/PageTransition'
import toast from 'react-hot-toast'

const STEPS = ['Cart', 'Shipping', 'Payment', 'Confirm']

export default function CheckoutPage() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [coupon, setCoupon] = useState('')
  const [couponApplied, setCouponApplied] = useState(false)
  const [serverPricing, setServerPricing] = useState(null)
  const [placedOrder, setPlacedOrder] = useState(null)
  const { items, clearCart } = useCartStore()
  const { isAuthenticated, user } = useAuthStore()
  const defaultAddress = user?.addresses?.find(address => address.isDefault) || user?.addresses?.[0]

  const [shipping, setShipping] = useState({
    name: user?.name || '', email: user?.email || '', phone: defaultAddress?.phone || user?.phone || '',
    street: defaultAddress?.street || '', city: defaultAddress?.city || '', state: defaultAddress?.state || '',
    zip: defaultAddress?.zip || '', country: defaultAddress?.country || 'Nepal'
  })
  const [paymentMethod, setPaymentMethod] = useState('cash_on_delivery')

  const estimateSubtotal = items.reduce((s, i) => s + i.price * i.quantity, 0)
  const subtotal = serverPricing?.subtotal ?? estimateSubtotal
  const shippingFee = serverPricing?.shippingPrice ?? (subtotal >= 5000 ? 0 : 180)
  const discount = serverPricing?.discount ?? 0
  const total = serverPricing?.totalPrice ?? (subtotal + shippingFee)
  const orderItems = items.map(i => ({ product: i.product, size: i.size, color: i.color, quantity: i.quantity }))

  const applyCoupon = async () => {
    if (!coupon.trim()) return toast.error('Enter a coupon code')
    try {
      const { data } = await orderAPI.quote({ items: orderItems, couponCode: coupon.trim() })
      setServerPricing(data.data)
      setCouponApplied(Boolean(data.data.couponCode))
      toast.success('Coupon applied')
    } catch (err) {
      setCouponApplied(false)
      setServerPricing(null)
      toast.error(err?.response?.data?.message || 'Invalid coupon code')
    }
  }

  const handleShippingSubmit = async (e) => {
    e.preventDefault()
    const empty = Object.entries(shipping).find(([k, v]) => k !== 'zip' && !v.trim())
    if (empty) return toast.error(`Please fill in ${empty[0]}`)
    try {
      setLoading(true)
      const { data } = await orderAPI.quote({ items: orderItems, couponCode: couponApplied ? coupon : '' })
      setServerPricing(data.data)
      setStep(2)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      toast.error(error.response?.data?.message || 'Please review your bag')
    } finally { setLoading(false) }
  }

const handlePlaceOrder = async () => {
  // ✅ Removed: if (!isAuthenticated) return navigate('/login?redirect=/checkout')
  setLoading(true)
  try {
    const guestId = localStorage.getItem('guestId')

  const { data } = await orderAPI.create(
  {
    items: orderItems,
    shippingAddress: {
      name: shipping.name,
      email: shipping.email,
      street: shipping.street,
      city: shipping.city,
      state: shipping.state,
      country: shipping.country,
      phone: shipping.phone,
      zip: shipping.zip,
    },
    paymentMethod,

    // ✅ ADD THESE (THIS FIXES YOUR ERROR)
    couponCode: couponApplied ? coupon : '',
  },
  guestId
)

    if (data.guestId) localStorage.setItem('guestId', data.guestId)
    if (!isAuthenticated) {
      let recent = []
      try {
        const saved = JSON.parse(localStorage.getItem('guestOrders') || '[]')
        recent = Array.isArray(saved) ? saved : []
      } catch {
        recent = []
      }
      const orderId = data.data.order._id
      localStorage.setItem('guestOrders', JSON.stringify([orderId, ...recent.filter(id => id !== orderId)].slice(0, 10)))
    }

    clearCart()
    setPlacedOrder(data.data.order)
    setStep(3)
    window.scrollTo({ top: 0, behavior: 'smooth' })

  } catch (err) {
    toast.error(err?.response?.data?.message || 'Failed to place order')
  } finally {
    setLoading(false)
  }
}

  if (!items.length && step !== 3) {
    return (
      <PageTransition>
        <div className="page-container py-24 text-center">
          <p className="font-display text-3xl text-stone-200 mb-6">Your bag is empty</p>
          <Link to="/shop" className="btn-primary text-xs">Continue Shopping</Link>
        </div>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <div className="page-container py-10 md:py-16">
        {!isAuthenticated && step !== 3 && (
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-green-100 bg-green-50 px-5 py-4">
            <div>
              <p className="text-sm font-medium text-green-900">Guest checkout — no account required</p>
              <p className="text-xs text-green-700 mt-0.5">Enter your delivery details and place your order directly.</p>
            </div>
            <Link to="/login?redirect=/checkout" className="text-xs underline text-green-900 whitespace-nowrap">Sign in optionally</Link>
          </div>
        )}
        {/* Steps */}
        <div className="flex items-center justify-center gap-0 mb-12">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center">
              <div className={`flex items-center gap-2 px-1 ${i <= step ? 'opacity-100' : 'opacity-40'}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono transition-all ${
                  i < step ? 'bg-gold-400 text-obsidian-900' : i === step ? 'bg-obsidian-900 text-cream-50' : 'border border-stone-300 text-stone-400'
                }`}>
                  {i < step ? <Check size={12} /> : i + 1}
                </div>
                <span className="text-[10px] tracking-[0.15em] uppercase hidden sm:inline text-obsidian-900">{s}</span>
              </div>
              {i < STEPS.length - 1 && <div className={`w-8 md:w-16 h-px mx-2 ${i < step ? 'bg-gold-400' : 'bg-stone-200'}`} />}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 3 ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-16"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
              >
                <Check size={32} className="text-green-600" />
              </motion.div>
              <h2 className="font-display text-4xl font-light mb-3">Order Placed!</h2>
              <p className="text-stone-500 mb-2">Your order is confirmed and ready to track.</p>
              {placedOrder?.orderNumber && <p className="text-xs text-stone-500 font-mono mb-8">Order #{placedOrder.orderNumber}</p>}
              <div className="flex flex-col sm:flex-row justify-center gap-3">
                {placedOrder?._id && <Link to={isAuthenticated ? `/account/orders/${placedOrder._id}` : `/orders/${placedOrder._id}`} className="btn-primary text-xs">Track your order</Link>}
                <Link to="/shop" className="btn-outline text-xs">Continue shopping</Link>
              </div>
              {!isAuthenticated && <p className="text-xs text-stone-400 mt-6">Order access is saved on this device. You can return through Help → Track Order without logging in.</p>}
            </motion.div>
          ) : (
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.35 }}
              className="grid grid-cols-1 lg:grid-cols-5 gap-10"
            >
              {/* Form side */}
              <div className="lg:col-span-3">
                {step === 1 && (
                  <form onSubmit={handleShippingSubmit} className="space-y-5">
                    <h2 className="font-display text-2xl font-light mb-6">Shipping Details</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
  <div className="col-span-2">
    <label className="block text-xs tracking-widest uppercase text-stone-500 mb-1.5">Full Name *</label>
    <input value={shipping.name} onChange={e => setShipping(s => ({...s, name: e.target.value}))}
      required className="input-field" placeholder="John Doe" />
  </div>
  <div className="col-span-2">
    <label className="block text-xs tracking-widest uppercase text-stone-500 mb-1.5">Phone Number *</label>
    <input type="tel" autoComplete="tel" value={shipping.phone} onChange={e => setShipping(s => ({...s, phone: e.target.value}))}
      required className="input-field" placeholder="+977 98XXXXXXXX" />
  </div>
  <div className="col-span-2">
    <label className="block text-xs tracking-widest uppercase text-stone-500 mb-1.5">Street Address *</label>
    <input value={shipping.street} onChange={e => setShipping(s => ({...s, street: e.target.value}))}
      required className="input-field" placeholder="Street, locality" />
  </div>
  <div>
    <label className="block text-xs tracking-widest uppercase text-stone-500 mb-1.5">City *</label>
    <input value={shipping.city} onChange={e => setShipping(s => ({...s, city: e.target.value}))}
      required className="input-field" placeholder="Kathmandu" />
  </div>
   <div>
    <label className="block text-xs tracking-widest uppercase text-stone-500 mb-1.5">Email *</label>
    <input type="email" autoComplete="email" value={shipping.email} onChange={e => setShipping(s => ({...s, email: e.target.value}))}
      required className="input-field" placeholder="johndon@gmail.com" />
  </div>
  <div>
    <label className="block text-xs tracking-widest uppercase text-stone-500 mb-1.5">State / Province *</label>  {/* ✅ added */}
    <input value={shipping.state} onChange={e => setShipping(s => ({...s, state: e.target.value}))}
      required className="input-field" placeholder="Bagmati" />
  </div>
  <div className="col-span-2">
    <label className="block text-xs tracking-widests uppercase text-stone-500 mb-1.5">Country</label>
    <input value={shipping.country} readOnly className="input-field bg-cream-50 text-stone-500" />
  </div>
                    </div>
                    <div className="pt-4">
                      <motion.button disabled={loading} type="submit" whileTap={{ scale: 0.98 }} className="btn-primary w-full text-xs disabled:opacity-50">
                        {loading ? 'Checking order...' : 'Continue to Payment'}
                      </motion.button>
                    </div>
                  </form>
                )}

                {step === 2 && (
                  <div className="space-y-5">
                    <h2 className="font-display text-2xl font-light mb-6">Payment Method</h2>
                    {[
                      { value: 'cash_on_delivery', label: 'Cash on Delivery', desc: 'Pay when you receive your order', icon: '💵' },
                      // { value: 'esewa',            label: 'eSewa',            desc: 'Pay via eSewa digital wallet',  icon: '📱' },
                      // { value: 'khalti',           label: 'Khalti',           desc: 'Pay via Khalti wallet',         icon: '💜' },
                      // { value: 'card',             label: 'Credit / Debit Card', desc: 'Visa, Mastercard accepted', icon: '💳' },
                    ].map(opt => (
                      <motion.label
                        key={opt.value}
                        whileHover={{ scale: 1.005 }}
                        className={`flex items-center gap-4 p-4 border-2 cursor-pointer transition-all ${
                          paymentMethod === opt.value ? 'border-obsidian-900 bg-cream-50' : 'border-stone-100 hover:border-stone-200'
                        }`}
                      >
                        <input type="radio" name="payment" value={opt.value}
                          checked={paymentMethod === opt.value}
                          onChange={() => setPaymentMethod(opt.value)}
                          className="accent-obsidian-900" />
                        <span className="text-xl">{opt.icon}</span>
                        <div>
                          <p className="font-body font-medium text-sm text-obsidian-900">{opt.label}</p>
                          <p className="text-xs text-stone-400">{opt.desc}</p>
                        </div>
                        {paymentMethod === opt.value && (
                          <Check size={16} className="ml-auto text-obsidian-900" />
                        )}
                      </motion.label>
                    ))}

                    <div className="flex items-center gap-2 text-xs text-stone-400 mt-4">
                      {/* <Lock size={12} /> All transactions are secured and encrypted */}
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button onClick={() => setStep(1)} className="btn-outline text-xs flex-1">Back</button>
                      <motion.button
                        onClick={handlePlaceOrder}
                        disabled={loading}
                        whileTap={{ scale: 0.98 }}
                        className="btn-primary flex-1 text-xs disabled:opacity-60"
                      >
                        {loading ? 'Placing Order...' : 'Place Order'}
                      </motion.button>
                    </div>
                  </div>
                )}
              </div>

              {/* Order Summary */}
              <div className="lg:col-span-2">
                <div className="bg-cream-100 p-6 sticky top-24">
                  <h3 className="font-display text-xl font-light mb-5">Order Summary</h3>
                  <div className="space-y-3 mb-5 max-h-60 overflow-y-auto no-scrollbar">
                    {items.map(item => (
                      <div key={item.key} className="flex gap-3">
                        <div className="relative w-14 h-16 bg-white flex-shrink-0">
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                          <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-obsidian-900 text-cream-50 rounded-full text-[10px] font-mono flex items-center justify-center">{item.quantity}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-body line-clamp-1 text-obsidian-900">{item.name}</p>
                          <p className="text-[10px] text-stone-400 font-mono">{item.size} · {item.color}</p>
                          <p className="text-xs font-display mt-1">{formatPrice(item.price * item.quantity)}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Coupon */}
                  <div className="flex gap-2 mb-5">
                    <input
                      value={coupon} onChange={e => setCoupon(e.target.value.toUpperCase())}
                      placeholder="Coupon code"
                      className="input-field text-xs flex-1"
                    />
                    <button
                      onClick={applyCoupon}
                      className="btn-outline text-[10px] px-4 whitespace-nowrap"
                    >Apply</button>
                  </div>

                  <div className="space-y-2 border-t border-stone-200 pt-4">
                    {[
                      { label: 'Subtotal', value: formatPrice(subtotal) },
                      { label: 'Shipping', value: shippingFee === 0 ? 'Free' : formatPrice(shippingFee) },
                      // { label: 'VAT (13%)', value: formatPrice(tax) },
                      ...(couponApplied ? [{ label: 'Discount', value: `-${formatPrice(discount)}`, red: true }] : []),
                    ].map(({ label, value, red }) => (
                      <div key={label} className="flex justify-between text-xs">
                        <span className="text-stone-500">{label}</span>
                        <span className={red ? 'text-green-600' : 'text-obsidian-900 font-mono'}>{value}</span>

                      </div>
                    
                     
                    ))}
                    <div className="flex justify-between font-medium border-t border-stone-200 pt-3 mt-3">
                      <span className="text-sm text-obsidian-900">Total</span>
                      <span className="font-display text-xl">{formatPrice(total)}</span>
                      
                    </div>
                    <p>
                    Delivery is free above Rs. 5,000; otherwise a Rs. 180 standard delivery fee applies.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  )
}
