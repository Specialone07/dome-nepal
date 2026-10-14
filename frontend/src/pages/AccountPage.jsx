import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { User, ShoppingBag, Heart, MapPin, Settings, LogOut, ChevronRight } from 'lucide-react'
import { authAPI, orderAPI, userAPI } from '../services/api'
import { useAuthStore } from '../stores'
import { formatPrice, formatDate, ORDER_STATUSES } from '../utils/helpers'
import { OrderSkeleton } from '../components/common/Skeletons'
import PageTransition from '../components/common/PageTransition'
import toast from 'react-hot-toast'

const TABS = [
  { id: 'orders',   label: 'Orders',   Icon: ShoppingBag },
  { id: 'wishlist', label: 'Wishlist', Icon: Heart },
  { id: 'profile',  label: 'Profile',  Icon: User },
  { id: 'address',  label: 'Address',  Icon: MapPin },
]

export default function AccountPage() {
  const [tab, setTab] = useState('orders')
  const { user, logout, updateUser } = useAuthStore()
  const [profile, setProfile] = useState({ name: user?.name || '', phone: user?.phone || '' })
  const [showAddressForm, setShowAddressForm] = useState(false)
  const [address, setAddress] = useState({ label: 'Home', street: '', city: '', state: '', zip: '', country: 'Nepal', phone: '' })
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' })
  const navigate = useNavigate()

  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['my-orders'],
    queryFn: () => orderAPI.getMyOrders().then(r => r.data.data),
    enabled: tab === 'orders',
  })

  const handleLogout = async () => {
    try { await authAPI.logout() } catch {}
    logout()
    toast.success('Signed out')
    navigate('/')
  }

  const saveProfile = async (event) => {
    event.preventDefault()
    try {
      const { data } = await userAPI.updateProfile(profile)
      updateUser(data.data.user)
      toast.success('Profile updated')
    } catch (error) { toast.error(error.response?.data?.message || 'Could not update profile') }
  }

  const addAddress = async (event) => {
    event.preventDefault()
    try {
      const { data } = await userAPI.addAddress(address)
      updateUser({ ...user, addresses: data.data.addresses })
      setShowAddressForm(false)
      setAddress({ label: 'Home', street: '', city: '', state: '', zip: '', country: 'Nepal', phone: '' })
      toast.success('Address saved')
    } catch (error) { toast.error(error.response?.data?.message || 'Could not save address') }
  }

  const deleteAddress = async (id) => {
    try {
      const { data } = await userAPI.deleteAddress(id)
      updateUser({ ...user, addresses: data.data.addresses })
      toast.success('Address removed')
    } catch (error) { toast.error(error.response?.data?.message || 'Could not remove address') }
  }

  const changePassword = async (event) => {
    event.preventDefault()
    try {
      await userAPI.changePassword(passwords)
      setPasswords({ currentPassword: '', newPassword: '' })
      toast.success('Password changed')
    } catch (error) { toast.error(error.response?.data?.message || 'Could not change password') }
  }

  return (
    <PageTransition>
      <div className="page-container py-10 md:py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Sidebar */}
          <aside className="md:col-span-1">
            {/* Profile card */}
            <div className="bg-gradient-to-br from-obsidian-800 to-obsidian-900 text-cream-50 p-6 mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gold-300 to-gold-500 flex items-center justify-center text-obsidian-900 font-display text-xl mb-3">
                {user?.name?.[0]?.toUpperCase()}
              </div>
              <p className="font-display text-lg font-light">{user?.name}</p>
              <p className="text-xs text-cream-50/50 font-mono mt-0.5">{user?.email}</p>
              {user?.role === 'admin' && (
                <Link to="/admin" className="inline-block mt-3 text-[10px] tracking-[0.2em] uppercase bg-gold-400 text-obsidian-900 px-3 py-1">
                  Admin Panel
                </Link>
              )}
            </div>

            <nav className="space-y-0.5">
              {TABS.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors text-left ${
                    tab === id
                      ? 'bg-cream-100 text-obsidian-900 border-l-2 border-obsidian-900'
                      : 'text-stone-500 hover:text-obsidian-900 hover:bg-cream-50'
                  }`}
                >
                  <Icon size={15} />
                  {label}
                </button>
              ))}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut size={15} /> Sign Out
              </button>
            </nav>
          </aside>

          {/* Content */}
          <div className="md:col-span-3">
            {/* Orders Tab */}
            {tab === 'orders' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h2 className="font-display text-2xl font-light mb-6">My Orders</h2>
                {ordersLoading ? <OrderSkeleton /> : (
                  <div className="space-y-4">
                    {(ordersData?.orders || []).length === 0 && (
                      <div className="text-center py-16">
                        <ShoppingBag size={48} strokeWidth={1} className="text-stone-200 mx-auto mb-4" />
                        <p className="text-stone-400 mb-6">No orders yet</p>
                        <Link to="/shop" className="btn-outline text-xs">Start Shopping</Link>
                      </div>
                    )}
                    {(ordersData?.orders || []).map((order, i) => (
                      <motion.div
                        key={order._id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.06 }}
                        className="border border-stone-100 hover:border-stone-200 transition-colors p-5"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                          <div>
                            <p className="font-mono text-xs text-stone-500">Order #{order.orderNumber}</p>
                            <p className="text-xs text-stone-400">{formatDate(order.createdAt)}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`text-[10px] px-3 py-1 font-mono uppercase tracking-wider ${ORDER_STATUSES[order.status]?.bg} ${ORDER_STATUSES[order.status]?.color}`}>
                              {ORDER_STATUSES[order.status]?.label}
                            </span>
                            <Link
                              to={`/account/orders/${order._id}`}
                              className="flex items-center gap-1 text-xs text-stone-400 hover:text-obsidian-900 transition-colors"
                            >
                              Details <ChevronRight size={12} />
                            </Link>
                          </div>
                        </div>
                        <div className="flex gap-2 overflow-x-auto no-scrollbar">
                          {order.items.slice(0, 4).map((item, j) => (
                            <img key={j} src={item.image} alt={item.name}
                              className="w-14 h-16 object-cover bg-cream-100 flex-shrink-0" />
                          ))}
                          {order.items.length > 4 && (
                            <div className="w-14 h-16 bg-cream-100 flex items-center justify-center text-xs text-stone-400 font-mono flex-shrink-0">
                              +{order.items.length - 4}
                            </div>
                          )}
                        </div>
                        <div className="flex justify-between items-center mt-3 pt-3 border-t border-stone-100">
                          <span className="text-xs text-stone-400">{order.items.length} item{order.items.length !== 1 ? 's' : ''}</span>
                          <span className="font-display text-base">{formatPrice(order.totalPrice)}</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Profile Tab */}
            {tab === 'profile' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h2 className="font-display text-2xl font-light mb-6">My Profile</h2>
                <form onSubmit={saveProfile} className="space-y-4 max-w-md">
                  <div><label className="block text-xs uppercase tracking-widest text-stone-500 mb-1">Full name</label><input required className="input-field" value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} /></div>
                  <div><label className="block text-xs uppercase tracking-widest text-stone-500 mb-1">Email</label><input disabled className="input-field bg-stone-50" value={user?.email || ''} /></div>
                  <div><label className="block text-xs uppercase tracking-widest text-stone-500 mb-1">Phone</label><input className="input-field" value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} /></div>
                  <p className="text-xs text-stone-400">Member since {formatDate(user?.createdAt)}</p>
                  <button className="btn-primary text-xs">Save profile</button>
                </form>
                <form onSubmit={changePassword} className="space-y-3 max-w-md mt-10 pt-8 border-t border-stone-100">
                  <h3 className="font-display text-lg">Change password</h3>
                  <input required type="password" className="input-field" placeholder="Current password" value={passwords.currentPassword} onChange={e => setPasswords(v => ({ ...v, currentPassword: e.target.value }))} />
                  <input required minLength="8" type="password" className="input-field" placeholder="New password (8+ characters)" value={passwords.newPassword} onChange={e => setPasswords(v => ({ ...v, newPassword: e.target.value }))} />
                  <button className="btn-outline text-xs">Update password</button>
                </form>
              </motion.div>
            )}

            {tab === 'wishlist' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h2 className="font-display text-2xl font-light mb-6">My Wishlist</h2>
                <p className="text-sm text-stone-400">Visit the <Link to="/wishlist" className="underline text-obsidian-900">Wishlist page</Link> to see all your saved items.</p>
              </motion.div>
            )}

            {tab === 'address' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h2 className="font-display text-2xl font-light mb-6">Saved Addresses</h2>
                {(user?.addresses || []).length === 0 ? (
                  <div className="text-center py-12 border border-stone-100">
                    <MapPin size={40} strokeWidth={1} className="text-stone-200 mx-auto mb-3" />
                    <p className="text-sm text-stone-400 mb-6">No addresses saved</p>
                    <button onClick={() => setShowAddressForm(true)} className="btn-outline text-xs">Add Address</button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {user.addresses.map((addr, i) => (
                      <div key={i} className="border border-stone-100 p-5">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-body font-medium text-sm text-obsidian-900 mb-1">{addr.label}</p>
                            <p className="text-xs text-stone-500">{addr.street}, {addr.city}, {addr.zip}</p>
                          </div>
                           <div className="flex gap-2 items-center">{addr.isDefault && <span className="badge bg-green-50 text-green-600">Default</span>}<button onClick={() => deleteAddress(addr._id)} className="text-xs text-red-400 hover:text-red-600">Remove</button></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {!showAddressForm && (user?.addresses || []).length > 0 && <button onClick={() => setShowAddressForm(true)} className="btn-outline text-xs mt-4">Add another address</button>}
                {showAddressForm && <form onSubmit={addAddress} className="mt-5 border border-stone-100 p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {['label', 'street', 'city', 'state', 'zip', 'phone'].map(field => <input key={field} required={!['zip', 'phone'].includes(field)} className={`input-field ${field === 'street' ? 'sm:col-span-2' : ''}`} placeholder={field.charAt(0).toUpperCase() + field.slice(1)} value={address[field]} onChange={e => setAddress(a => ({ ...a, [field]: e.target.value }))} />)}
                  <div className="sm:col-span-2 flex gap-2"><button className="btn-primary text-xs">Save address</button><button type="button" onClick={() => setShowAddressForm(false)} className="btn-outline text-xs">Cancel</button></div>
                </form>}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  )
}
