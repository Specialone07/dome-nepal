import { useParams } from 'react-router-dom'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy, Printer } from 'lucide-react'
import toast from 'react-hot-toast'
import { orderAPI } from '../../services/api'
import { formatPrice, formatDate, ORDER_STATUSES } from '../../utils/helpers'

const STATUS_TRANSITIONS = {
  pending: ['processing', 'cancelled'], processing: ['shipped', 'cancelled'],
  shipped: ['out_for_delivery'], out_for_delivery: ['delivered'], delivered: ['refunded'],
  cancelled: [], refunded: [],
}

function OrderContent({ order, id }) {
  const qc = useQueryClient()
  const [update, setUpdate] = useState({ status: order.status, message: '', location: '', trackingNumber: order.trackingNumber || '', notes: order.notes || '' })
  const allowedStatuses = [order.status, ...(STATUS_TRANSITIONS[order.status] || [])]
  const save = useMutation({
    mutationFn: payload => orderAPI.updateStatus(id, payload),
    onSuccess: response => {
      const saved = response.data.data.order
      setUpdate({ status: saved.status, message: '', location: '', trackingNumber: saved.trackingNumber || '', notes: saved.notes || '' })
      qc.invalidateQueries({ queryKey: ['admin-order', id] }); qc.invalidateQueries({ queryKey: ['admin-orders'] }); qc.invalidateQueries({ queryKey: ['admin-stats'] }); toast.success('Order updated')
    },
    onError: error => toast.error(error.response?.data?.message || 'Could not update order')
  })
  const copy = value => navigator.clipboard.writeText(value || '').then(() => toast.success('Copied'))

  return <div className="space-y-6 print-order">
    <div className="flex flex-wrap gap-4 justify-between items-start">
      <div><div className="flex items-center gap-2"><h1 className="text-xl font-semibold">Order #{order.orderNumber}</h1>{order.isGuest && <span className="badge bg-amber-50 text-amber-700">Guest order</span>}</div><p className="text-sm text-gray-500">{formatDate(order.createdAt)}</p></div>
      <div className="flex items-center gap-2 admin-print-hide"><span className={`px-3 py-2 text-[10px] uppercase font-mono ${ORDER_STATUSES[order.status]?.bg} ${ORDER_STATUSES[order.status]?.color}`}>{ORDER_STATUSES[order.status]?.label}</span><button onClick={() => window.print()} className="btn-outline text-xs flex gap-2 items-center"><Printer size={13} /> Print invoice</button></div>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <section className="bg-white p-5 border border-stone-100"><h2 className="font-semibold mb-3">Customer</h2><p className="text-sm"><strong>Name:</strong> {order.user?.name || order.shippingAddress?.name}</p><p className="text-sm flex items-center gap-2"><strong>Email:</strong> {order.user?.email || order.shippingAddress?.email}<button className="admin-print-hide text-stone-400" onClick={() => copy(order.user?.email || order.shippingAddress?.email)}><Copy size={12} /></button></p><p className="text-sm flex items-center gap-2"><strong>Phone:</strong> {order.shippingAddress?.phone}<button className="admin-print-hide text-stone-400" onClick={() => copy(order.shippingAddress?.phone)}><Copy size={12} /></button></p></section>
      <section className="bg-white p-5 border border-stone-100"><h2 className="font-semibold mb-3">Shipping Address</h2><p className="text-sm">{order.shippingAddress?.street}</p><p className="text-sm">{order.shippingAddress?.city}, {order.shippingAddress?.state} {order.shippingAddress?.zip}</p><p className="text-sm">{order.shippingAddress?.country}</p></section>
      <section className="bg-white p-5 border border-stone-100"><h2 className="font-semibold mb-3">Payment</h2><p className="text-sm capitalize"><strong>Method:</strong> {order.paymentMethod?.replaceAll('_', ' ')}</p><p className="text-sm"><strong>Status:</strong> {order.isPaid ? 'Paid' : 'Payment pending'}</p>{order.couponCode && <p className="text-sm"><strong>Coupon:</strong> {order.couponCode}</p>}{order.trackingNumber && <p className="text-sm"><strong>Tracking:</strong> {order.trackingNumber}</p>}</section>
    </div>

    <section className="bg-white p-5 border border-stone-100"><h2 className="font-semibold mb-4">Items</h2><div className="divide-y divide-stone-100">{order.items.map((item, i) => <div key={i} className="flex gap-4 py-3 first:pt-0 last:pb-0"><img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded" /><div className="flex-1"><p className="font-medium text-sm">{item.name}</p><p className="text-xs text-gray-500">{item.size} / {item.color} · SKU variant</p><p className="text-xs">{item.quantity} × {formatPrice(item.price)}</p></div><p className="font-display">{formatPrice(item.quantity * item.price)}</p></div>)}</div></section>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <section className="bg-white p-5 border border-stone-100"><h2 className="font-semibold mb-3">Order timeline</h2><div className="space-y-3">{[...order.trackingEvents].reverse().map((event, i) => <div key={i} className="text-sm border-l-2 border-gold-300 pl-3"><p><strong className="capitalize">{event.status.replaceAll('_', ' ')}</strong> — {event.message}</p>{event.location && <p className="text-gray-400 text-xs">{event.location}</p>}<p className="text-gray-300 text-[10px]">{formatDate(event.timestamp)}{event.actor ? ` · ${event.actor}` : ''}</p></div>)}</div></section>
      <section className="bg-white p-5 border border-stone-100"><h2 className="font-semibold mb-3">Summary</h2><div className="space-y-2 text-sm"><p className="flex justify-between"><span>Subtotal</span><span>{formatPrice(order.subtotal)}</span></p><p className="flex justify-between"><span>Shipping</span><span>{formatPrice(order.shippingPrice)}</span></p><p className="flex justify-between"><span>Tax</span><span>{formatPrice(order.taxPrice)}</span></p>{order.discount > 0 && <p className="flex justify-between text-green-600"><span>Discount</span><span>-{formatPrice(order.discount)}</span></p>}<p className="flex justify-between border-t pt-3 font-bold text-base"><span>Total</span><span>{formatPrice(order.totalPrice)}</span></p></div></section>
    </div>

    <form onSubmit={event => { event.preventDefault(); save.mutate(update) }} className="bg-white p-5 border border-stone-100 space-y-3 admin-print-hide">
      <div><h2 className="font-semibold">Update fulfilment</h2><p className="text-xs text-stone-400">Only valid next statuses are available. Existing notes and tracking details are preserved.</p></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <select className="input-field bg-white capitalize" value={update.status} onChange={e => setUpdate(v => ({ ...v, status: e.target.value }))}>{allowedStatuses.map(status => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}</select>
        <input className="input-field" placeholder="Tracking number" value={update.trackingNumber} onChange={e => setUpdate(v => ({ ...v, trackingNumber: e.target.value }))} />
        <input className="input-field" placeholder="Customer-facing update" value={update.message} onChange={e => setUpdate(v => ({ ...v, message: e.target.value }))} />
        <input className="input-field" placeholder="Current location" value={update.location} onChange={e => setUpdate(v => ({ ...v, location: e.target.value }))} />
        <textarea className="input-field md:col-span-2" placeholder="Private admin notes" value={update.notes} onChange={e => setUpdate(v => ({ ...v, notes: e.target.value }))} />
      </div><button disabled={save.isPending} className="btn-primary text-xs">{save.isPending ? 'Saving...' : 'Save order update'}</button>
    </form>
  </div>
}

export default function AdminOrderDetails() {
  const { id } = useParams()
  const { data, isLoading, isError } = useQuery({ queryKey: ['admin-order', id], queryFn: () => orderAPI.getOne(id).then(res => res.data.data) })
  if (isLoading) return <div className="skeleton h-80 rounded" />
  if (isError || !data?.order) return <div className="p-10 text-center text-red-500">Order could not be loaded.</div>
  return <OrderContent key={`${data.order._id}-${data.order.updatedAt}`} order={data.order} id={id} />
}
