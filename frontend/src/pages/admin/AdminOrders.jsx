import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Eye } from 'lucide-react'
import { orderAPI } from '../../services/api'
import { formatPrice, formatDate, ORDER_STATUSES } from '../../utils/helpers'
import toast from 'react-hot-toast'

const STATUS_OPTIONS = ['pending', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled']

export default function AdminOrders() {
  const [page, setPage] = useState(1)
  const [filterStatus, setFilterStatus] = useState('')
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', page, filterStatus],
    queryFn: () => orderAPI.getAll({ page, limit: 20, status: filterStatus || undefined }).then(r => r.data.data)
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, ...rest }) => orderAPI.updateStatus(id, rest),
    onSuccess: () => { qc.invalidateQueries(['admin-orders']); toast.success('Order updated') }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl font-light">Orders</h1>
          <p className="text-xs text-stone-400 font-mono">{data?.total || 0} total</p>
        </div>
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1) }}
          className="input-field text-xs w-auto py-2 min-w-[160px]">
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s} className="capitalize">{s.replace('_',' ')}</option>)}
        </select>
      </div>

      <div className="bg-white border border-stone-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-stone-100">
              <tr>
                {['Order','Customer','Items','Total','Status','Update','Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] tracking-[0.2em] uppercase text-stone-400 font-mono whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {isLoading ? Array(10).fill(0).map((_,i) => (
                <tr key={i}><td colSpan={7} className="px-4 py-3"><div className="skeleton h-8 rounded" /></td></tr>
              )) : (data?.orders || []).map((order, i) => (
                <motion.tr key={order._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  className="hover:bg-cream-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-xs font-mono text-obsidian-900">{order.orderNumber}</p>
                    <p className="text-[10px] text-stone-400">{formatDate(order.createdAt)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs text-obsidian-900">{order.user?.name}</p>
                    <p className="text-[10px] text-stone-400">{order.user?.email}</p>
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-stone-500">{order.items.length}</td>
                  <td className="px-4 py-3 font-display text-sm">{formatPrice(order.totalPrice)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 font-mono uppercase tracking-wider ${ORDER_STATUSES[order.status]?.bg} ${ORDER_STATUSES[order.status]?.color}`}>
                      {ORDER_STATUSES[order.status]?.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={order.status}
                      onChange={e => updateMutation.mutate({ id: order._id, status: e.target.value, message: `Order ${e.target.value}` })}
                      className="text-[10px] border border-stone-200 px-2 py-1 bg-white focus:outline-none"
                    >
                      {STATUS_OPTIONS.map(s => <option key={s} value={s} className="capitalize">{s.replace('_',' ')}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <Link to={`/admin/orders/${order._id}`} className="p-1.5 hover:bg-stone-100 rounded transition-colors text-stone-400 hover:text-obsidian-900 inline-block">
                      <Eye size={13} />
                    </Link>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}