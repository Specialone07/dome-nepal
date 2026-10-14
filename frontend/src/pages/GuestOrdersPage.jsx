import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ArrowRight, Package } from 'lucide-react'
import PageTransition from '../components/common/PageTransition'
import { orderAPI } from '../services/api'
import { formatDate, formatPrice, ORDER_STATUSES } from '../utils/helpers'

function getSavedOrderIds() {
  try {
    const saved = JSON.parse(localStorage.getItem('guestOrders') || '[]')
    return Array.isArray(saved) ? saved.filter(Boolean) : []
  } catch {
    return []
  }
}

export default function GuestOrdersPage() {
  const guestId = localStorage.getItem('guestId')
  const orderIds = getSavedOrderIds()

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['guest-orders', guestId, orderIds],
    queryFn: async () => {
      const results = await Promise.all(
        orderIds.map(id => orderAPI.getOne(id, guestId)
          .then(response => response.data.data.order)
          .catch(() => null))
      )
      return results.filter(Boolean)
    },
    enabled: Boolean(guestId && orderIds.length),
  })

  return (
    <PageTransition>
      <div className="page-container py-12 md:py-16">
        <div className="max-w-3xl mx-auto">
          <p className="section-subtitle text-gold-500">Guest checkout</p>
          <h1 className="font-display text-4xl font-light mb-3">Track your orders</h1>
          <p className="text-sm text-stone-500 mb-10">
            Orders placed as a guest on this device appear here. No account or login is required.
          </p>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2].map(item => <div key={item} className="skeleton h-32 rounded" />)}
            </div>
          ) : orders.length ? (
            <div className="space-y-4">
              {orders.map(order => {
                const status = ORDER_STATUSES[order.status] || ORDER_STATUSES.pending
                return (
                  <Link
                    key={order._id}
                    to={`/orders/${order._id}`}
                    className="group flex flex-col sm:flex-row sm:items-center gap-5 border border-stone-100 bg-white p-5 hover:border-gold-300 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-full bg-cream-100 flex items-center justify-center flex-shrink-0">
                      <Package size={20} className="text-gold-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-3 mb-1">
                        <h2 className="font-display text-lg">Order #{order.orderNumber}</h2>
                        <span className={`px-2 py-1 text-[9px] font-mono tracking-widest uppercase ${status.bg} ${status.color}`}>
                          {status.label}
                        </span>
                      </div>
                      <p className="text-xs text-stone-400 font-mono">
                        {formatDate(order.createdAt)} · {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                      </p>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-5">
                      <span className="font-display text-lg">{formatPrice(order.totalPrice)}</span>
                      <ArrowRight size={17} className="text-stone-300 group-hover:text-gold-500 group-hover:translate-x-1 transition-all" />
                    </div>
                  </Link>
                )
              })}
            </div>
          ) : (
            <div className="border border-stone-100 bg-cream-50 py-16 px-6 text-center">
              <Package size={30} className="mx-auto text-stone-300 mb-4" />
              <h2 className="font-display text-2xl font-light mb-2">No guest orders on this device</h2>
              <p className="text-xs text-stone-500 mb-6">Place an order without signing in and it will be saved here automatically.</p>
              <Link to="/shop" className="btn-primary text-xs">Start shopping</Link>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  )
}
