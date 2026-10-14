import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Search, ShieldCheck, UserRound } from 'lucide-react'
import toast from 'react-hot-toast'
import { userAPI } from '../../services/api'
import { formatDate, formatPrice } from '../../utils/helpers'
import { useAuthStore } from '../../stores'

export default function AdminUsers() {
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('')
  const [status, setStatus] = useState('')
  const currentUser = useAuthStore(state => state.user)
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, search, role, status],
    queryFn: () => userAPI.getAll({ page, limit: 20, search: search || undefined, role: role || undefined, status: status || undefined }).then(response => response.data.data)
  })
  const update = useMutation({
    mutationFn: ({ id, changes }) => userAPI.update(id, changes),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); toast.success('User updated') },
    onError: error => toast.error(error.response?.data?.message || 'Could not update user')
  })

  return <div className="space-y-6">
    <div><h1 className="font-display text-2xl font-light">Customers & Staff</h1><p className="text-xs text-stone-400 font-mono">{data?.total || 0} matching accounts</p></div>
    <div className="flex flex-col md:flex-row gap-3">
      <form onSubmit={event => { event.preventDefault(); setSearch(searchInput.trim()); setPage(1) }} className="relative flex-1"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" /><input className="input-field pl-9 pr-20" value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Search all users..." /><button className="absolute right-2 top-1/2 -translate-y-1/2 text-xs underline">Search</button></form>
      <select value={role} onChange={e => { setRole(e.target.value); setPage(1) }} className="input-field bg-white md:w-40"><option value="">All roles</option><option value="user">Customers</option><option value="admin">Admins</option><option value="superadmin">Superadmins</option></select>
      <select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }} className="input-field bg-white md:w-40"><option value="">All statuses</option><option value="active">Active</option><option value="disabled">Disabled</option></select>
    </div>
    <div className="bg-white border border-stone-100 overflow-x-auto"><table className="w-full min-w-[880px]"><thead><tr className="border-b border-stone-100">{['User', 'Orders', 'Role', 'Joined', 'Status', 'Access'].map(label => <th key={label} className="px-4 py-3 text-left text-[10px] uppercase tracking-widest text-stone-400">{label}</th>)}</tr></thead>
      <tbody className="divide-y divide-stone-50">{isLoading ? <tr><td colSpan="6" className="p-8 text-center text-stone-400">Loading users...</td></tr> : (data?.users || []).map(user => <tr key={user._id} className="hover:bg-stone-50">
        <td className="px-4 py-3"><div className="flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-cream-100 flex items-center justify-center">{user.role === 'user' ? <UserRound size={14} /> : <ShieldCheck size={14} />}</div><div><p className="text-sm">{user.name}</p><p className="text-xs text-stone-400">{user.email}</p>{user.phone && <p className="text-[10px] text-stone-400">{user.phone}</p>}</div></div></td>
        <td className="px-4 py-3"><p className="text-xs font-mono">{user.orderCount} orders</p><p className="text-[10px] text-stone-400">{formatPrice(user.totalSpent)}</p></td>
        <td className="px-4 py-3"><select value={user.role} disabled={user.role === 'superadmin' || currentUser?.role !== 'superadmin'} onChange={e => update.mutate({ id: user._id, changes: { role: e.target.value } })} className="border border-stone-200 rounded px-2 py-1 text-xs bg-white disabled:opacity-50"><option value="user">Customer</option><option value="admin">Admin</option>{user.role === 'superadmin' && <option value="superadmin">Superadmin</option>}</select></td>
        <td className="px-4 py-3 text-xs text-stone-500">{formatDate(user.createdAt)}</td><td className="px-4 py-3"><span className={`badge ${user.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>{user.isActive ? 'Active' : 'Disabled'}</span></td>
        <td className="px-4 py-3"><button disabled={user.role === 'superadmin' || user._id === currentUser?._id} onClick={() => update.mutate({ id: user._id, changes: { isActive: !user.isActive } })} className="text-xs underline disabled:opacity-30">{user.isActive ? 'Disable' : 'Enable'}</button></td>
      </tr>)}{!isLoading && !data?.users?.length && <tr><td colSpan="6" className="p-8 text-center text-stone-400">No users found</td></tr>}</tbody></table></div>
    {data?.total > 20 && <div className="flex items-center justify-between"><p className="text-xs text-stone-400">Page {page} of {Math.ceil(data.total / 20)}</p><div className="flex gap-2"><button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-outline text-xs">Previous</button><button disabled={page * 20 >= data.total} onClick={() => setPage(p => p + 1)} className="btn-outline text-xs">Next</button></div></div>}
  </div>
}
