import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  TrendingUp,
  ShoppingBag,
  Users,
  Package,
  ArrowUpRight
} from 'lucide-react'

import { adminAPI } from '../../services/api'
import { formatPrice } from '../../utils/helpers'

// =======================================
// STAT CARD
// =======================================
function StatCard({ title, value, sub, Icon, color, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      whileHover={{ y: -2 }}
      className="bg-white border border-stone-100 p-6"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded flex items-center justify-center ${color}`}>
          <Icon size={18} />
        </div>
        <ArrowUpRight size={14} className="text-stone-300" />
      </div>

      <p className="font-display text-3xl font-light text-obsidian-900 mb-1">
        {value ?? 0}
      </p>

      <p className="text-sm text-stone-500">{title}</p>

      {sub && (
        <p className="text-xs text-stone-400 font-mono mt-1">
          {sub}
        </p>
      )}
    </motion.div>
  )
}

// =======================================
// ADMIN DASHBOARD
// =======================================
export default function AdminDashboard() {

  const {
    data: stats,
    isLoading,
    isError
  } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const res = await adminAPI.getStats()
      return res?.data?.data || {}
    },
    retry: 1
  })

  // =======================================
  // LOADING STATE
  // =======================================
  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 bg-stone-100 rounded" />
          ))}
        </div>

        <div className="h-64 bg-stone-100 rounded" />
      </div>
    )
  }

  // =======================================
  // ERROR STATE
  // =======================================
  if (isError) {
    return (
      <div className="p-6 text-red-500">
        Failed to load admin dashboard data
      </div>
    )
  }

  // =======================================
  // SAFE HELPERS
  // =======================================
  const getCustomerName = (order) =>
    order?.user?.name ||
    order?.shippingAddress?.name ||
    'Guest'

  const isGuestOrder = (order) => !order?.user

  const revenueData = stats?.revenueByDay || []
  const maxRevenue = Math.max(...revenueData.map(d => d.revenue || 0), 0)

  // =======================================
  // UI
  // =======================================
  return (
    <div className="space-y-8">

      {/* HEADER */}
      <div>
        <h1 className="font-display text-2xl font-light text-obsidian-900">
          Dashboard
        </h1>
        <p className="text-xs text-stone-400 font-mono mt-1">
          Welcome back — here's what's happening
        </p>
      </div>

      {/* ================= STATS ================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

        <StatCard
          index={0}
          title="Total Revenue"
          value={formatPrice(stats?.totalRevenue)}
          sub={`+${formatPrice(stats?.monthRevenue)} this month`}
          Icon={TrendingUp}
          color="bg-gold-400/20 text-gold-600"
        />

        <StatCard
          index={1}
          title="Total Orders"
          value={stats?.totalOrders}
          sub={`${stats?.monthOrders || 0} this month`}
          Icon={ShoppingBag}
          color="bg-blue-50 text-blue-600"
        />

        <StatCard
          index={2}
          title="Products"
          value={stats?.totalProducts}
          sub="Active listings"
          Icon={Package}
          color="bg-green-50 text-green-600"
        />

        <StatCard
          index={3}
          title="Customers"
          value={stats?.totalUsers}
          sub={`${stats?.monthUsers || 0} new this month`}
          Icon={Users}
          color="bg-purple-50 text-purple-600"
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Needs fulfilment', value: stats?.pendingOrders, to: '/admin/orders?status=pending', tone: 'text-blue-700 bg-blue-50' },
          { label: 'Guest orders', value: stats?.guestOrders, to: '/admin/orders', tone: 'text-amber-700 bg-amber-50' },
          { label: 'Payment pending', value: stats?.unpaidOrders, to: '/admin/orders', tone: 'text-purple-700 bg-purple-50' },
          { label: 'Low / out of stock', value: (stats?.lowStockProducts || 0) + (stats?.outOfStockProducts || 0), to: '/admin/products', tone: 'text-red-700 bg-red-50' },
        ].map(item => <Link key={item.label} to={item.to} className={`p-4 flex items-center justify-between hover:-translate-y-0.5 transition-transform ${item.tone}`}><span className="text-xs">{item.label}</span><strong className="font-display text-xl">{item.value || 0}</strong></Link>)}
      </div>

      {/* ================= CONTENT GRID ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* RECENT ORDERS */}
        <div className="lg:col-span-2 bg-white border border-stone-100 p-6">
          <h3 className="font-mono text-[11px] tracking-[0.25em] uppercase text-stone-500 mb-5">
            Recent Orders
          </h3>

          <div className="space-y-3">
            {(stats?.recentOrders || []).map((order, i) => (
              <motion.div
                key={order?._id || i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex justify-between py-2 border-b border-stone-50"
              >
                <div>
                  <Link to={`/admin/orders/${order?._id}`} className="text-xs font-mono hover:text-gold-600">{order?.orderNumber}</Link>

                  <p className="text-xs text-stone-400">
                    {getCustomerName(order)}
                    {isGuestOrder(order) && (
                      <span className="ml-1 text-[10px] text-amber-500">
                        (Guest)
                      </span>
                    )}
                  </p>
                </div>

                <div className="text-right">
                  <p className="font-display text-sm">
                    {formatPrice(order?.totalPrice)}
                  </p>

                  <p className="text-[10px] text-stone-400 capitalize">
                    {order?.status}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* TOP PRODUCTS */}
        <div className="bg-white border border-stone-100 p-6">
          <h3 className="font-mono text-[11px] tracking-[0.25em] uppercase text-stone-500 mb-5">
            Top Sellers
          </h3>

          <div className="space-y-3">
            {(stats?.topProducts || []).map((product, i) => (
              <div key={product?._id || i} className="flex gap-3 items-center">

                <span className="text-xs text-stone-300 w-4">
                  #{i + 1}
                </span>

                <img
                  src={product?.images?.[0]?.url || ''}
                  className="w-10 h-10 object-cover bg-stone-100"
                  alt=""
                />

                <div className="flex-1">
                  <p className="text-xs truncate">
                    {product?.name}
                  </p>

                  <p className="text-[10px] text-stone-400">
                    {product?.totalSold || 0} sold
                  </p>
                </div>

              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ================= REVENUE CHART ================= */}
      {revenueData.length > 0 && (
        <div className="bg-white border border-stone-100 p-6">
          <h3 className="font-mono text-[11px] uppercase mb-5">
            Revenue — Last 30 Days
          </h3>

          <div className="flex items-end gap-1 h-32">
            {revenueData.map((day, i) => {
              const height =
                maxRevenue > 0
                  ? ((day.revenue || 0) / maxRevenue) * 100
                  : 0

              return (
                <motion.div
                  key={day._id || i}
                  initial={{ height: 0 }}
                  animate={{ height: `${height}%` }}
                  transition={{ delay: i * 0.02 }}
                  title={`${day._id}: ${formatPrice(day.revenue)}`}
                  className="flex-1 bg-gold-400/60 rounded-sm"
                />
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
