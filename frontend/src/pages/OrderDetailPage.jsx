import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { Package, Truck, CheckCircle, Clock, XCircle, MapPin } from 'lucide-react'
import { orderAPI } from '../services/api'
import { formatPrice, formatDate, ORDER_STATUSES } from '../utils/helpers'
import PageTransition from '../components/common/PageTransition'

const STATUS_STEPS = [
  { key: 'pending',          label: 'Order Placed',      Icon: Clock      },
  { key: 'processing',       label: 'Processing',        Icon: Package    },
  { key: 'shipped',          label: 'Shipped',           Icon: Truck      },
  { key: 'out_for_delivery', label: 'Out for Delivery',  Icon: MapPin     },
  { key: 'delivered',        label: 'Delivered',         Icon: CheckCircle },
]

export default function OrderDetailPage() {
  const { id } = useParams()
  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => orderAPI.getOne(id).then(r => r.data.data.order),
  })

  if (isLoading) return (
    <div className="page-container py-16">
      <div className="animate-pulse space-y-6">
        <div className="skeleton h-8 w-64 rounded" />
        <div className="skeleton h-40 rounded" />
        <div className="skeleton h-60 rounded" />
      </div>
    </div>
  )

  if (!order) return (
    <div className="page-container py-24 text-center">
      <p className="font-display text-3xl text-stone-200">Order not found</p>
    </div>
  )

  const isCancelled = ['cancelled', 'refunded'].includes(order.status)
  const currentStep = ORDER_STATUSES[order.status]?.step ?? 0

  return (
    <PageTransition>
      <div className="page-container py-10 md:py-14">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
          <div>
            <Link to="/account/orders" className="text-xs text-stone-400 hover:text-obsidian-900 transition-colors font-mono mb-2 block">
              ← Back to Orders
            </Link>
            <h1 className="font-display text-3xl font-light">Order #{order.orderNumber}</h1>
            <p className="text-xs text-stone-400 font-mono mt-1">{formatDate(order.createdAt)}</p>
          </div>
          <span className={`self-start sm:self-auto px-4 py-2 text-xs font-mono tracking-widest uppercase ${ORDER_STATUSES[order.status]?.bg} ${ORDER_STATUSES[order.status]?.color}`}>
            {ORDER_STATUSES[order.status]?.label}
          </span>
        </div>

        {/* Tracking Timeline */}
        {!isCancelled && (
          <div className="bg-cream-50 border border-stone-100 p-6 md:p-8 mb-8">
            <h3 className="font-mono text-[11px] tracking-[0.25em] uppercase mb-8">Order Progress</h3>
            <div className="relative">
              {/* Progress bar */}
              <div className="absolute top-5 left-5 right-5 h-0.5 bg-stone-200 hidden md:block">
                <motion.div
                  initial={{ width: '0%' }}
                  animate={{ width: `${(currentStep / (STATUS_STEPS.length - 1)) * 100}%` }}
                  transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
                  className="h-full bg-gold-400"
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-6 md:gap-0 relative z-10">
                {STATUS_STEPS.map((step, i) => {
                  const done = i < currentStep
                  const active = i === currentStep
                  return (
                    <motion.div
                      key={step.key}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 + 0.2 }}
                      className="flex flex-col items-center text-center gap-2"
                    >
                      <motion.div
                        animate={{
                          scale: active ? [1, 1.15, 1] : 1,
                          backgroundColor: done || active ? '#C9A84C' : '#E5E7EB',
                        }}
                        transition={{ duration: 0.5, delay: active ? 0.8 : 0 }}
                        className="w-10 h-10 rounded-full flex items-center justify-center shadow-sm"
                      >
                        <step.Icon size={16} className={done || active ? 'text-obsidian-900' : 'text-stone-400'} />
                      </motion.div>
                      <p className={`text-[10px] tracking-wider font-mono ${active ? 'text-obsidian-900 font-medium' : done ? 'text-stone-500' : 'text-stone-300'}`}>
                        {step.label}
                      </p>
                    </motion.div>
                  )
                })}
              </div>
            </div>

            {/* Tracking Events */}
            {order.trackingEvents?.length > 0 && (
              <div className="mt-8 border-t border-stone-200 pt-6">
                <h4 className="font-mono text-[10px] tracking-[0.25em] uppercase text-stone-500 mb-4">Tracking History</h4>
                <div className="space-y-3">
                  {[...order.trackingEvents].reverse().map((event, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className="flex items-start gap-3"
                    >
                      <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${i === 0 ? 'bg-gold-400' : 'bg-stone-300'}`} />
                      <div>
                        <p className="text-xs text-obsidian-900 font-body">{event.message}</p>
                        {event.location && <p className="text-[10px] text-stone-400 font-mono">{event.location}</p>}
                        <p className="text-[10px] text-stone-300 font-mono">{formatDate(event.timestamp)}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Items */}
          <div className="lg:col-span-2">
            <h3 className="font-mono text-[11px] tracking-[0.25em] uppercase mb-5">Items Ordered</h3>
            <div className="space-y-4">
              {order.items.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className="flex gap-4 border border-stone-100 p-4"
                >
                  <img src={item.image} alt={item.name} className="w-20 h-24 object-cover bg-cream-100 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="font-body text-sm font-medium text-obsidian-900 mb-1">{item.name}</h4>
                    <p className="text-xs text-stone-400 font-mono mb-3">{item.size} · {item.color}</p>
                    <div className="flex justify-between items-end">
                      <p className="text-xs text-stone-400">Qty: {item.quantity}</p>
                      <p className="font-display text-base">{formatPrice(item.price * item.quantity)}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="space-y-6">
            <div className="bg-cream-50 border border-stone-100 p-5">
              <h3 className="font-mono text-[11px] tracking-[0.25em] uppercase mb-4">Order Total</h3>
              <div className="space-y-2 text-xs">
                {[
                  { label: 'Subtotal', val: formatPrice(order.subtotal) },
                  { label: 'Shipping', val: order.shippingPrice === 0 ? 'Free' : formatPrice(order.shippingPrice) },
                  { label: 'VAT', val: formatPrice(order.taxPrice) },
                  ...(order.discount ? [{ label: 'Discount', val: `-${formatPrice(order.discount)}` }] : []),
                ].map(({ label, val }) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-stone-500">{label}</span>
                    <span className="font-mono text-obsidian-900">{val}</span>
                  </div>
                ))}
                <div className="flex justify-between font-medium border-t border-stone-200 pt-2 mt-2">
                  <span>Total</span>
                  <span className="font-display text-lg">{formatPrice(order.totalPrice)}</span>
                </div>
              </div>
              <div className={`mt-3 text-[10px] font-mono px-2 py-1 inline-block ${order.isPaid ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                {order.isPaid ? '✓ Paid' : '◷ Payment Pending'}
              </div>
            </div>

            <div className="bg-cream-50 border border-stone-100 p-5">
              <h3 className="font-mono text-[11px] tracking-[0.25em] uppercase mb-4">Delivery Address</h3>
              <div className="text-xs text-stone-500 space-y-1">
                <p className="font-medium text-obsidian-900">{order.shippingAddress.name}</p>
                <p>{order.shippingAddress.street}</p>
                <p>{order.shippingAddress.city}, {order.shippingAddress.zip}</p>
                <p>{order.shippingAddress.country}</p>
                <p className="font-mono">{order.shippingAddress.phone}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  )
}