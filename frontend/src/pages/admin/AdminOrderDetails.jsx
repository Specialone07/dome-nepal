import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { orderAPI } from '../../services/api'
import { formatPrice, formatDate } from '../../utils/helpers'

export default function AdminOrderDetails() {
  const { id } = useParams()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-order', id],
    queryFn: () => orderAPI.getOne(id).then(res => res.data.data)
  })

  const order = data?.order

  if (isLoading) return <p>Loading...</p>

  return (
    <div className="space-y-6">

      {/* ORDER HEADER */}
      <div>
        <h1 className="text-xl font-semibold">
          Order #{order.orderNumber}
        </h1>
        <p className="text-sm text-gray-500">
          {formatDate(order.createdAt)}
        </p>
      </div>

      {/* CUSTOMER INFO */}
      <div className="bg-white p-4 border rounded">
        <h2 className="font-semibold mb-2">Customer</h2>

        <p><strong>Name:</strong> {order.user?.name || order.shippingAddress?.name || 'Guest'}</p>
        <p><strong>Email:</strong> {order.user?.email || order.shippingAddress?.email}</p>
        <p><strong>Phone:</strong> {order.shippingAddress?.phone}</p>
      </div>

      {/* SHIPPING ADDRESS */}
      <div className="bg-white p-4 border rounded">
        <h2 className="font-semibold mb-2">Shipping Address</h2>

        <p>{order.shippingAddress?.street}</p>
        <p>{order.shippingAddress?.city}, {order.shippingAddress?.state}</p>
        <p>{order.shippingAddress?.zip}, {order.shippingAddress?.country}</p>
      </div>

      {/* PAYMENT */}
      <div className="bg-white p-4 border rounded">
        <h2 className="font-semibold mb-2">Payment</h2>

        <p><strong>Method:</strong> {order.paymentMethod}</p>
        <p><strong>Status:</strong> {order.isPaid ? 'Paid' : 'Not Paid'}</p>
      </div>

      {/* ITEMS */}
      <div className="bg-white p-4 border rounded">
        <h2 className="font-semibold mb-3">Items</h2>

        {order.items.map((item, i) => (
          <div key={i} className="flex gap-3 mb-3">
            <img src={item.image} className="w-16 h-16 object-cover rounded" />

            <div>
              <p className="font-medium">{item.name}</p>
              <p className="text-sm text-gray-500">
                {item.size} / {item.color}
              </p>
              <p className="text-sm">
                {item.quantity} × {formatPrice(item.price)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* PRICE SUMMARY */}
      <div className="bg-white p-4 border rounded">
        <h2 className="font-semibold mb-2">Summary</h2>

        <p>Subtotal: {formatPrice(order.subtotal)}</p>
        <p>Shipping: {formatPrice(order.shippingPrice)}</p>
        <p>Tax: {formatPrice(order.taxPrice)}</p>
        <p>Discount: -{formatPrice(order.discount)}</p>

        <h3 className="mt-2 font-bold">
          Total: {formatPrice(order.totalPrice)}
        </h3>
      </div>

      {/* TRACKING */}
      <div className="bg-white p-4 border rounded">
        <h2 className="font-semibold mb-2">Tracking</h2>

        {order.trackingEvents.map((t, i) => (
          <div key={i} className="text-sm border-b py-1">
            <p><strong>{t.status}</strong> - {t.message}</p>
            <p className="text-gray-400 text-xs">{t.location}</p>
          </div>
        ))}
      </div>

    </div>
  )
}