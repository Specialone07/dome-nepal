import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Copy, Download, Eye, Search } from 'lucide-react'
import { orderAPI } from '../../services/api'
import { formatPrice, formatDate, ORDER_STATUSES } from '../../utils/helpers'
import toast from 'react-hot-toast'

const STATUS_OPTIONS = ['pending', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'refunded']
const STATUS_TRANSITIONS = {
  pending: ['processing', 'cancelled'], processing: ['shipped', 'cancelled'],
  shipped: ['out_for_delivery'], out_for_delivery: ['delivered'], delivered: ['refunded'],
  cancelled: [], refunded: [],
}
const csvCell = value => `"${String(value ?? '').replaceAll('"', '""')}"`

export default function AdminOrders() {
  const [searchParams] = useSearchParams()
  const [page, setPage] = useState(1)
  const [filterStatus, setFilterStatus] = useState(searchParams.get('status') || '')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', page, filterStatus, search],
    queryFn: () => orderAPI.getAll({ page, limit: 20, status: filterStatus || undefined, search: search || undefined }).then(r => r.data.data)
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, ...rest }) => orderAPI.updateStatus(id, rest),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-orders'] }); qc.invalidateQueries({ queryKey: ['admin-stats'] }); toast.success('Order updated') },
    onError: error => toast.error(error.response?.data?.message || 'Could not update order')
  })
  const copy = value => navigator.clipboard.writeText(value || '').then(() => toast.success('Copied'))
  const exportPage = () => {
    const rows = (data?.orders || []).map(order => [order.orderNumber, formatDate(order.createdAt), order.user?.name || order.shippingAddress?.name, order.isGuest ? 'Guest' : 'Account', order.shippingAddress?.email, order.shippingAddress?.phone, order.status, order.paymentMethod, order.totalPrice])
    const csv = [['Order', 'Date', 'Customer', 'Type', 'Email', 'Phone', 'Status', 'Payment', 'Total'], ...rows].map(row => row.map(csvCell).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `orders-page-${page}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return <div className="space-y-6">
    <div className="flex items-center justify-between flex-wrap gap-4">
      <div><h1 className="font-display text-2xl font-light">Orders</h1><p className="text-xs text-stone-400 font-mono">{data?.total || 0} total</p></div>
      <div className="flex gap-2"><button onClick={exportPage} disabled={!data?.orders?.length} className="btn-outline text-xs flex items-center gap-2 disabled:opacity-40"><Download size={13} /> Export page</button><select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1) }} className="input-field text-xs w-auto py-2 min-w-[160px]"><option value="">All Statuses</option>{STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replaceAll('_', ' ')}</option>)}</select></div>
    </div>
    <form onSubmit={event => { event.preventDefault(); setSearch(searchInput.trim()); setPage(1) }} className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" /><input value={searchInput} onChange={e => setSearchInput(e.target.value)} className="input-field pl-9 pr-24" placeholder="Search order, customer, email, or phone..." /><button className="absolute right-2 top-1/2 -translate-y-1/2 text-xs bg-obsidian-900 text-white px-3 py-1.5">Search</button></form>
    <div className="bg-white border border-stone-100 overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[980px]">
      <thead className="border-b border-stone-100"><tr>{['Order','Customer','Items','Total','Status','Next action','Actions'].map(h => <th key={h} className="px-4 py-3 text-left text-[10px] tracking-[0.2em] uppercase text-stone-400 font-mono whitespace-nowrap">{h}</th>)}</tr></thead>
      <tbody className="divide-y divide-stone-50">
        {isLoading ? Array(8).fill(0).map((_, i) => <tr key={i}><td colSpan={7} className="px-4 py-3"><div className="skeleton h-10 rounded" /></td></tr>) : (data?.orders || []).map((order, i) => {
          const nextStatuses = STATUS_TRANSITIONS[order.status] || []
          return <motion.tr key={order._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }} className="hover:bg-cream-50">
            <td className="px-4 py-3"><p className="text-xs font-mono">{order.orderNumber}</p><p className="text-[10px] text-stone-400">{formatDate(order.createdAt)}</p></td>
            <td className="px-4 py-3"><div className="flex items-center gap-2"><div><p className="text-xs">{order.user?.name || order.shippingAddress?.name || 'Guest'}</p><p className="text-[10px] text-stone-400">{order.shippingAddress?.phone}</p></div>{order.isGuest && <span className="badge bg-amber-50 text-amber-700">Guest</span>}</div></td>
            <td className="px-4 py-3 text-xs font-mono text-stone-500">{order.items.length}</td><td className="px-4 py-3 font-display text-sm">{formatPrice(order.totalPrice)}</td>
            <td className="px-4 py-3"><span className={`text-[10px] px-2 py-1 font-mono uppercase ${ORDER_STATUSES[order.status]?.bg} ${ORDER_STATUSES[order.status]?.color}`}>{ORDER_STATUSES[order.status]?.label}</span></td>
            <td className="px-4 py-3">{nextStatuses.length ? <select defaultValue="" disabled={updateMutation.isPending} onChange={e => { const status = e.target.value; e.target.value = ''; if (!status || (['cancelled', 'refunded'].includes(status) && !confirm(`Mark this order as ${status}?`))) return; updateMutation.mutate({ id: order._id, status, message: `Order ${status.replaceAll('_', ' ')}` }) }} className="text-[10px] border border-stone-200 px-2 py-1.5 bg-white"><option value="" disabled>Select action</option>{nextStatuses.map(s => <option key={s} value={s}>{s.replaceAll('_', ' ')}</option>)}</select> : <span className="text-[10px] text-stone-300">No actions</span>}</td>
            <td className="px-4 py-3"><div className="flex gap-1"><button title="Copy phone" onClick={() => copy(order.shippingAddress?.phone)} className="p-1.5 text-stone-400 hover:text-obsidian-900"><Copy size={13} /></button><Link title="Open order" to={`/admin/orders/${order._id}`} className="p-1.5 text-stone-400 hover:text-obsidian-900"><Eye size={13} /></Link></div></td>
          </motion.tr>
        })}
        {!isLoading && !data?.orders?.length && <tr><td colSpan={7} className="p-10 text-center text-sm text-stone-400">No orders found</td></tr>}
      </tbody>
    </table></div></div>
    {(data?.pages || 0) > 1 && <div className="flex items-center justify-between"><p className="text-xs text-stone-400">Page {page} of {data.pages}</p><div className="flex gap-2"><button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-outline text-xs disabled:opacity-40">Previous</button><button disabled={page >= data.pages} onClick={() => setPage(p => p + 1)} className="btn-outline text-xs disabled:opacity-40">Next</button></div></div>}
  </div>
}
