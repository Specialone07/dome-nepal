import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Banknote, Check, Copy, MapPin, QrCode, Truck, ShieldCheck, Tag, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useCartStore, useAuthStore } from '../stores'
import { orderAPI } from '../services/api'
import { formatPrice } from '../utils/helpers'
import { NEPAL_SHIPPING } from '../data/nepalShipping'
import { SITE } from '../data/site'
import PageTransition from '../components/common/PageTransition'

const PHONE_RE = /^(?:\+?977[-\s]?)?(?:9[678]\d{8}|0?1[-\s]?\d{7}|0\d{2}[-\s]?\d{6})$/
const ZONES = Object.fromEntries(NEPAL_SHIPPING.zones.map(z => [z.id, z]))

const findDistrict = (name) => {
  for (const province of NEPAL_SHIPPING.provinces) {
    const district = province.districts.find(d => d.name === name)
    if (district) return { ...district, province: province.name }
  }
  return null
}

/** Same rule as the server — used only for the instant preview before the quote returns. */
const localShipping = (districtName, subtotal) => {
  const district = findDistrict(districtName)
  if (!district) return null
  const zone = ZONES[district.zone]
  const free = NEPAL_SHIPPING.freeShippingZones.includes(zone.id) && subtotal >= NEPAL_SHIPPING.freeShippingThreshold
  return { fee: free ? 0 : zone.fee, zone: zone.id, zoneName: zone.name, eta: zone.eta, free }
}

function Field({ label, error, children, className = '' }) {
  return (
    <div className={className}>
      <label className="block text-[11px] tracking-[0.12em] uppercase text-stone-500 mb-1.5">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

function Section({ number, title, children }) {
  return (
    <section className="bg-white border border-stone-200 p-5 sm:p-7">
      <h2 className="flex items-center gap-3 font-display text-2xl font-light mb-6">
        <span className="w-7 h-7 rounded-full bg-obsidian-900 text-cream-50 text-xs font-body flex items-center justify-center">{number}</span>
        {title}
      </h2>
      {children}
    </section>
  )
}

export default function CheckoutPage() {
  const { items, clearCart } = useCartStore()
  const { isAuthenticated, user } = useAuthStore()
  const defaultAddress = user?.addresses?.find(a => a.isDefault) || user?.addresses?.[0]

  const [form, setForm] = useState({
    name: user?.name || '', email: user?.email || '', phone: defaultAddress?.phone || user?.phone || '',
    province: '', district: '', city: defaultAddress?.city || '', street: defaultAddress?.street || '', landmark: '', notes: '',
  })
  const [errors, setErrors] = useState({})
  const [coupon, setCoupon] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState('')
  const [quote, setQuote] = useState(null)
  const [paymentMethod, setPaymentMethod] = useState('cash_on_delivery')
  const [reference, setReference] = useState('')
  const [payerName, setPayerName] = useState('')
  const [placing, setPlacing] = useState(false)
  const [placedOrder, setPlacedOrder] = useState(null)

  const set = (key) => (e) => {
    setForm(f => ({ ...f, [key]: e.target.value }))
    setErrors(er => ({ ...er, [key]: undefined }))
  }

  const districts = useMemo(
    () => NEPAL_SHIPPING.provinces.find(p => p.name === form.province)?.districts || [],
    [form.province]
  )

  const orderItems = useMemo(
    () => items.map(i => ({ product: i.product, size: i.size, color: i.color, quantity: i.quantity })),
    [items]
  )
  const subtotal = quote?.subtotal ?? items.reduce((s, i) => s + i.price * i.quantity, 0)
  const preview = localShipping(form.district, subtotal)
  const shippingFee = quote && !quote.shippingPending ? quote.shippingPrice : preview?.fee ?? null
  const shipInfo = quote?.shipping || preview
  const discount = quote?.discount ?? 0
  const total = subtotal - discount + (shippingFee ?? 0)

  // Server-authoritative pricing: re-quote whenever the bag, district or coupon changes.
  useEffect(() => {
    if (!orderItems.length) return
    let cancelled = false
    orderAPI.quote({ items: orderItems, district: form.district || undefined, couponCode: appliedCoupon })
      .then(({ data }) => { if (!cancelled) setQuote(data.data) })
      .catch(err => {
        if (cancelled) return
        if (appliedCoupon) { setAppliedCoupon(''); toast.error(err?.response?.data?.message || 'Coupon is no longer valid') }
        else toast.error(err?.response?.data?.message || 'Please review your bag')
      })
    return () => { cancelled = true }
  }, [orderItems, form.district, appliedCoupon])

  const applyCoupon = async () => {
    const code = coupon.trim().toUpperCase()
    if (!code) return toast.error('Enter a coupon code')
    try {
      const { data } = await orderAPI.quote({ items: orderItems, district: form.district || undefined, couponCode: code })
      setQuote(data.data)
      setAppliedCoupon(code)
      toast.success('Coupon applied')
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Invalid coupon code')
    }
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Enter your full name'
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Enter a valid email'
    if (!PHONE_RE.test(form.phone.trim())) e.phone = 'Enter a valid Nepal phone, e.g. 98XXXXXXXX'
    if (!form.province) e.province = 'Select a province'
    if (!form.district) e.district = 'Select a district'
    if (!form.city.trim()) e.city = 'Enter your city or municipality'
    if (!form.street.trim()) e.street = 'Enter your street / tole'
    if (paymentMethod === 'fonepay_qr' && !/^[A-Za-z0-9-]{6,40}$/.test(reference.trim())) e.reference = 'Enter the transaction ID from your FonePay receipt'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const placeOrder = async (event) => {
    event.preventDefault()
    if (!validate()) {
      toast.error('Please fix the highlighted fields')
      document.querySelector('[data-error="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    setPlacing(true)
    try {
      const guestId = localStorage.getItem('guestId')
      const { data } = await orderAPI.create({
        items: orderItems,
        shippingAddress: {
          name: form.name, email: form.email, phone: form.phone, street: form.street, city: form.city,
          district: form.district, state: form.province, country: 'Nepal', landmark: form.landmark,
        },
        paymentMethod,
        ...(paymentMethod === 'fonepay_qr' ? { paymentReference: reference.trim(), payerName: payerName.trim() } : {}),
        couponCode: appliedCoupon,
      }, guestId)

      if (data.guestId) localStorage.setItem('guestId', data.guestId)
      if (!isAuthenticated) {
        let recent = []
        try { recent = JSON.parse(localStorage.getItem('guestOrders') || '[]') } catch { recent = [] }
        const id = data.data.order._id
        localStorage.setItem('guestOrders', JSON.stringify([id, ...recent.filter(x => x !== id)].slice(0, 10)))
      }
      setPlacedOrder(data.data.order)
      clearCart()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not place your order. Please try again.')
    } finally {
      setPlacing(false)
    }
  }

  /* ── Order confirmation ── */
  if (placedOrder) {
    return (
      <PageTransition>
        <div className="page-container py-16 md:py-24 max-w-2xl text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}
            className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check size={34} className="text-green-600" />
          </motion.div>
          <h1 className="font-display text-4xl md:text-5xl font-light mb-3">Thank you, {placedOrder.shippingAddress.name.split(' ')[0]}!</h1>
          <p className="text-stone-500 mb-8">{placedOrder.paymentMethod === 'fonepay_qr' ? 'Your order is placed and we are verifying your payment.' : 'Your order has been placed.'} We will call or message you on {placedOrder.shippingAddress.phone} to confirm delivery.</p>

          <div className="bg-white border border-stone-200 text-left p-6 space-y-3 mb-8">
            <div className="flex justify-between text-sm"><span className="text-stone-500">Order number</span><span className="font-mono">{placedOrder.orderNumber}</span></div>
            <div className="flex justify-between text-sm"><span className="text-stone-500">Deliver to</span><span className="text-right">{placedOrder.shippingAddress.street}, {placedOrder.shippingAddress.city}, {placedOrder.shippingAddress.district}</span></div>
            {placedOrder.deliveryEta && <div className="flex justify-between text-sm"><span className="text-stone-500">Estimated delivery</span><span>{placedOrder.deliveryEta}</span></div>}
            <div className="flex justify-between text-sm"><span className="text-stone-500">Payment</span><span>{placedOrder.paymentMethod === 'fonepay_qr' ? 'FonePay QR (awaiting verification)' : 'Cash on delivery'}</span></div>
            <div className="flex justify-between border-t border-stone-200 pt-3"><span className="font-medium">{placedOrder.paymentMethod === 'fonepay_qr' ? 'Amount paid' : 'Amount to pay on delivery'}</span><span className="font-display text-2xl">{formatPrice(placedOrder.totalPrice)}</span></div>
          </div>

          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Link to={isAuthenticated ? `/account/orders/${placedOrder._id}` : `/orders/${placedOrder._id}`} className="btn-primary text-xs">Track your order</Link>
            <Link to="/shop" className="btn-outline text-xs">Continue shopping</Link>
          </div>
          {!isAuthenticated && <p className="text-xs text-stone-400 mt-6">Your order is saved on this device — find it anytime under Track Order.</p>}
        </div>
      </PageTransition>
    )
  }

  if (!items.length) {
    return (
      <PageTransition>
        <div className="page-container py-24 text-center">
          <p className="font-display text-4xl text-stone-300 mb-6">Your bag is empty</p>
          <Link to="/shop" className="btn-primary text-xs">Continue shopping</Link>
        </div>
      </PageTransition>
    )
  }

  const inputCls = (key) => `input-field ${errors[key] ? 'border-red-400' : ''}`
  const online = paymentMethod === 'fonepay_qr'
  const eAttr = (key) => (errors[key] ? { 'data-error': 'true' } : {})

  return (
    <PageTransition>
      <form onSubmit={placeOrder} noValidate className="page-container py-10 md:py-14">
        <div className="mb-8">
          <h1 className="font-display text-4xl md:text-5xl font-light">Checkout</h1>
          {!isAuthenticated && (
            <p className="text-sm text-stone-500 mt-2">Checking out as guest. <Link to="/login?redirect=/checkout" className="underline">Sign in</Link> to use saved details.</p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
          <div className="lg:col-span-3 space-y-6">
            <Section number="1" title="Contact">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Full name *" error={errors.name} className="sm:col-span-2">
                  <input {...eAttr('name')} value={form.name} onChange={set('name')} autoComplete="name" className={inputCls('name')} placeholder="Your full name" />
                </Field>
                <Field label="Phone *" error={errors.phone}>
                  <input {...eAttr('phone')} type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" className={inputCls('phone')} placeholder="98XXXXXXXX" />
                </Field>
                <Field label="Email *" error={errors.email}>
                  <input {...eAttr('email')} type="email" value={form.email} onChange={set('email')} autoComplete="email" className={inputCls('email')} placeholder="you@example.com" />
                </Field>
              </div>
            </Section>

            <Section number="2" title="Delivery address">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Province *" error={errors.province}>
                  <select {...eAttr('province')} value={form.province} className={`${inputCls('province')} bg-white`}
                    onChange={e => { setForm(f => ({ ...f, province: e.target.value, district: '' })); setErrors(er => ({ ...er, province: undefined })) }}>
                    <option value="">Select province</option>
                    {NEPAL_SHIPPING.provinces.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                  </select>
                </Field>
                <Field label="District *" error={errors.district}>
                  <select {...eAttr('district')} value={form.district} onChange={set('district')} disabled={!form.province} className={`${inputCls('district')} bg-white disabled:bg-stone-50 disabled:text-stone-400`}>
                    <option value="">{form.province ? 'Select district' : 'Select province first'}</option>
                    {districts.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
                  </select>
                </Field>
                <Field label="City / Municipality *" error={errors.city}>
                  <input {...eAttr('city')} value={form.city} onChange={set('city')} className={inputCls('city')} placeholder="e.g. Kathmandu Metropolitan" />
                </Field>
                <Field label="Street / Tole / Ward *" error={errors.street}>
                  <input {...eAttr('street')} value={form.street} onChange={set('street')} autoComplete="street-address" className={inputCls('street')} placeholder="e.g. Tahachal, Ward 13" />
                </Field>
                <Field label="Nearest landmark (optional)" className="sm:col-span-2">
                  <input value={form.landmark} onChange={set('landmark')} className="input-field" placeholder="Helps the rider find you" />
                </Field>
              </div>

              {shipInfo && (
                <div className="mt-5 flex items-start gap-3 bg-cream-100 border border-cream-300 px-4 py-3">
                  <MapPin size={16} className="text-gold-600 mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <p className="text-obsidian-900"><strong>{form.district}</strong> · {shipInfo.zoneName}</p>
                    <p className="text-stone-500 text-xs mt-0.5">
                      Delivery {shippingFee === 0 ? <strong className="text-green-700">free</strong> : <strong>{formatPrice(shippingFee)}</strong>} · arrives in {shipInfo.eta}
                    </p>
                  </div>
                </div>
              )}
            </Section>

            <Section number="3" title="Payment">
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  { value: 'cash_on_delivery', Icon: Banknote, title: 'Cash on Delivery', desc: 'Pay the rider when your order arrives' },
                  { value: 'fonepay_qr', Icon: QrCode, title: 'FonePay QR', desc: 'Pay now from any mobile banking or wallet app' },
                ].map(({ value, Icon, title, desc }) => (
                  <label key={value} className={`flex items-start gap-3 p-4 border-2 cursor-pointer transition-colors ${paymentMethod === value ? 'border-obsidian-900 bg-cream-50' : 'border-stone-200 hover:border-stone-300'}`}>
                    <input type="radio" name="payment" checked={paymentMethod === value} onChange={() => setPaymentMethod(value)} className="accent-obsidian-900 mt-1" />
                    <div className="flex-1">
                      <p className="flex items-center gap-2 font-medium text-sm"><Icon size={16} strokeWidth={1.5} /> {title}</p>
                      <p className="text-xs text-stone-500 mt-1">{desc}</p>
                    </div>
                  </label>
                ))}
              </div>

              {!online && <p className="text-xs text-stone-400 mt-4">Keep the exact amount ready and check your parcel at the door before paying.</p>}

              {online && (
                <div className="mt-5 border border-stone-200 bg-cream-50 p-5 grid sm:grid-cols-[220px_1fr] gap-6 items-start">
                  <div className="mx-auto sm:mx-0 w-full max-w-[220px]">
                    <img src={SITE.fonepay.qr} alt={`FonePay QR for ${SITE.fonepay.merchant}`} className="w-full border border-stone-200 bg-white" />
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-[11px] tracking-[0.15em] uppercase text-stone-500">Amount to pay</p>
                      <div className="flex items-center gap-3">
                        <p className="font-display text-4xl">{formatPrice(total)}</p>
                        <button type="button" onClick={() => navigator.clipboard?.writeText(String(total)).then(() => toast.success('Amount copied'))}
                          className="text-stone-400 hover:text-obsidian-900" aria-label="Copy amount"><Copy size={15} /></button>
                      </div>
                      {shippingFee === null && <p className="text-xs text-amber-700 mt-1">Select your district above so the delivery fee is included in this amount.</p>}
                    </div>
                    <ol className="text-sm text-stone-600 space-y-1.5 list-decimal pl-5">
                      <li>Open a mobile banking or wallet app that supports <strong>Fonepay QR</strong>.</li>
                      <li>Scan this QR. It pays <strong>{SITE.fonepay.merchant}</strong>.</li>
                      <li>Enter exactly <strong>{formatPrice(total)}</strong> and confirm.</li>
                      <li>Copy the <strong>transaction ID</strong> from your receipt and paste it below.</li>
                    </ol>
                    <Field label="Transaction ID *" error={errors.reference}>
                      <input {...eAttr('reference')} value={reference} onChange={e => { setReference(e.target.value); setErrors(er => ({ ...er, reference: undefined })) }} className={inputCls('reference')} placeholder="e.g. 2411260123456" />
                    </Field>
                    <Field label="Name on the payment (optional)">
                      <input value={payerName} onChange={e => setPayerName(e.target.value)} className="input-field" placeholder="Account holder name" />
                    </Field>
                    <p className="text-xs text-stone-500">We verify every payment against our FonePay records, usually within a few hours. Your order is processed once it is confirmed.</p>
                  </div>
                </div>
              )}
            </Section>
          </div>

          {/* Summary */}
          <aside className="lg:col-span-2 lg:sticky lg:top-24">
            <div className="bg-white border border-stone-200 p-5 sm:p-7">
              <h2 className="font-display text-2xl font-light mb-5">Order summary</h2>
              <div className="space-y-4 mb-5 max-h-72 overflow-y-auto no-scrollbar">
                {items.map(item => (
                  <div key={item.key} className="flex gap-3">
                    <div className="relative w-16 h-20 bg-cream-100 shrink-0">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-obsidian-900 text-cream-50 rounded-full text-[10px] flex items-center justify-center">{item.quantity}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm line-clamp-2">{item.name}</p>
                      <p className="text-[11px] text-stone-400 mt-0.5">{item.size} · {item.color}</p>
                    </div>
                    <p className="text-sm">{formatPrice(item.price * item.quantity)}</p>
                  </div>
                ))}
              </div>

              {appliedCoupon ? (
                <div className="flex items-center justify-between bg-green-50 border border-green-100 px-3 py-2 mb-5 text-xs text-green-800">
                  <span className="flex items-center gap-2"><Tag size={13} /> {appliedCoupon} applied</span>
                  <button type="button" onClick={() => { setAppliedCoupon(''); setCoupon('') }} aria-label="Remove coupon"><X size={14} /></button>
                </div>
              ) : (
                <div className="flex gap-2 mb-5">
                  <input value={coupon} onChange={e => setCoupon(e.target.value.toUpperCase())} placeholder="Discount code" className="input-field text-sm flex-1" />
                  <button type="button" onClick={applyCoupon} className="btn-outline text-[11px] px-5">Apply</button>
                </div>
              )}

              <dl className="space-y-2.5 text-sm border-t border-stone-200 pt-4">
                <div className="flex justify-between"><dt className="text-stone-500">Subtotal</dt><dd>{formatPrice(subtotal)}</dd></div>
                {discount > 0 && <div className="flex justify-between text-green-700"><dt>Discount</dt><dd>−{formatPrice(discount)}</dd></div>}
                <div className="flex justify-between">
                  <dt className="text-stone-500">Delivery</dt>
                  <dd>{shippingFee === null ? <span className="text-stone-400">Select district</span> : shippingFee === 0 ? <span className="text-green-700">Free</span> : formatPrice(shippingFee)}</dd>
                </div>
                <div className="flex justify-between items-baseline border-t border-stone-200 pt-3 mt-1">
                  <dt className="font-medium">{shippingFee === null ? 'Total (excl. delivery)' : online ? 'Total to pay' : 'Pay on delivery'}</dt>
                  <dd className="font-display text-2xl">{formatPrice(total)}</dd>
                </div>
              </dl>

              <button type="submit" disabled={placing} className="btn-primary w-full text-xs mt-6 disabled:opacity-50">
                {placing ? 'Placing order…' : online ? 'I have paid · Place order' : `Place order · ${formatPrice(total)}`}
              </button>

              <ul className="mt-5 space-y-2 text-xs text-stone-500">
                <li className="flex items-center gap-2"><Truck size={14} className="text-gold-600" /> Delivery to all 77 districts of Nepal</li>
                <li className="flex items-center gap-2"><ShieldCheck size={14} className="text-gold-600" /> Easy returns within 30 days — see <Link to="/shipping-returns" className="underline">policy</Link></li>
              </ul>
            </div>
          </aside>
        </div>
      </form>
    </PageTransition>
  )
}
