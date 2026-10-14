import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Edit, Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { couponAPI } from '../../services/api'

const empty = { code: '', type: 'percent', value: '', minimumOrder: '', maximumDiscount: '', usageLimit: '', startsAt: '', expiresAt: '', isActive: true }
const dateInput = value => value ? new Date(value).toISOString().slice(0, 10) : ''

export default function AdminCoupons() {
  const [form, setForm] = useState(empty)
  const [editingId, setEditingId] = useState(null)
  const [open, setOpen] = useState(false)
  const qc = useQueryClient()
  const { data: coupons = [], isLoading } = useQuery({ queryKey: ['coupons'], queryFn: () => couponAPI.getAll().then(r => r.data.data.coupons) })
  const close = () => { setForm(empty); setEditingId(null); setOpen(false) }
  const save = useMutation({
    mutationFn: payload => editingId ? couponAPI.update(editingId, payload) : couponAPI.create(payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['coupons'] }); close(); toast.success(editingId ? 'Coupon updated' : 'Coupon created') },
    onError: error => toast.error(error.response?.data?.message || 'Could not save coupon')
  })
  const remove = useMutation({ mutationFn: couponAPI.delete, onSuccess: () => { qc.invalidateQueries({ queryKey: ['coupons'] }); toast.success('Coupon deleted') }, onError: error => toast.error(error.response?.data?.message || 'Could not delete coupon') })
  const toggle = useMutation({ mutationFn: coupon => couponAPI.update(coupon._id, { isActive: !coupon.isActive }), onSuccess: () => { qc.invalidateQueries({ queryKey: ['coupons'] }); toast.success('Coupon status updated') } })
  const edit = coupon => { setEditingId(coupon._id); setForm({ code: coupon.code, type: coupon.type, value: coupon.value, minimumOrder: coupon.minimumOrder, maximumDiscount: coupon.maximumDiscount, usageLimit: coupon.usageLimit, startsAt: dateInput(coupon.startsAt), expiresAt: dateInput(coupon.expiresAt), isActive: coupon.isActive }); setOpen(true) }
  const submit = event => {
    event.preventDefault()
    if (form.startsAt && form.expiresAt && form.expiresAt <= form.startsAt) return toast.error('Expiry must be after the start date')
    save.mutate({ ...form, code: form.code.toUpperCase(), value: Number(form.value), minimumOrder: Number(form.minimumOrder || 0), maximumDiscount: Number(form.maximumDiscount || 0), usageLimit: Number(form.usageLimit || 0), startsAt: form.startsAt || null, expiresAt: form.expiresAt || null })
  }

  return <div className="space-y-6">
    <div className="flex justify-between items-start"><div><h1 className="font-display text-2xl font-light">Coupons</h1><p className="text-xs text-stone-400">Server-validated discounts</p></div><button onClick={() => open ? close() : setOpen(true)} className="btn-gold text-xs flex gap-2 items-center"><Plus size={14} /> {open ? 'Close' : 'New Coupon'}</button></div>
    {open && <form onSubmit={submit} className="bg-white border border-stone-100 p-5 grid grid-cols-1 md:grid-cols-4 gap-3">
      <div className="md:col-span-4"><h2 className="font-medium">{editingId ? 'Edit coupon' : 'Create coupon'}</h2></div>
      <input required value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} className="input-field" placeholder="CODE" />
      <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="input-field bg-white"><option value="percent">Percentage</option><option value="fixed">Fixed amount</option></select>
      <input required min="0" max={form.type === 'percent' ? 100 : undefined} type="number" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} className="input-field" placeholder="Value" />
      <input min="0" type="number" value={form.minimumOrder} onChange={e => setForm(f => ({ ...f, minimumOrder: e.target.value }))} className="input-field" placeholder="Minimum order" />
      <input min="0" type="number" value={form.maximumDiscount} onChange={e => setForm(f => ({ ...f, maximumDiscount: e.target.value }))} className="input-field" placeholder="Maximum discount" />
      <input min="0" type="number" value={form.usageLimit} onChange={e => setForm(f => ({ ...f, usageLimit: e.target.value }))} className="input-field" placeholder="Usage limit (0 unlimited)" />
      <input type="date" value={form.startsAt} onChange={e => setForm(f => ({ ...f, startsAt: e.target.value }))} className="input-field" aria-label="Start date" />
      <input type="date" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} className="input-field" aria-label="Expiry date" />
      <button disabled={save.isPending} className="btn-primary text-xs md:col-span-4">{save.isPending ? 'Saving...' : editingId ? 'Update coupon' : 'Create coupon'}</button>
    </form>}
    <div className="bg-white border border-stone-100 overflow-x-auto"><table className="w-full min-w-[760px]"><thead><tr>{['Code', 'Discount', 'Minimum', 'Usage', 'Period', 'Status', 'Actions'].map(x => <th key={x} className="px-4 py-3 text-left text-[10px] uppercase tracking-widest text-stone-400">{x}</th>)}</tr></thead><tbody className="divide-y divide-stone-50">
      {isLoading ? <tr><td colSpan="7" className="p-8 text-center">Loading...</td></tr> : coupons.map(c => <tr key={c._id}><td className="px-4 py-3 font-mono font-semibold">{c.code}</td><td className="px-4 py-3 text-sm">{c.type === 'percent' ? `${c.value}%` : `Rs. ${c.value}`}{c.maximumDiscount > 0 && <p className="text-[10px] text-stone-400">Max Rs. {c.maximumDiscount}</p>}</td><td className="px-4 py-3 text-sm">Rs. {c.minimumOrder}</td><td className="px-4 py-3 text-sm">{c.usedCount}/{c.usageLimit || '∞'}</td><td className="px-4 py-3 text-xs">{c.startsAt ? dateInput(c.startsAt) : 'Now'} → {c.expiresAt ? dateInput(c.expiresAt) : 'No expiry'}</td><td className="px-4 py-3"><button onClick={() => toggle.mutate(c)} className={`badge ${c.isActive ? 'bg-green-50 text-green-700' : 'bg-stone-100 text-stone-500'}`}>{c.isActive ? 'Active' : 'Inactive'}</button></td><td className="px-4 py-3"><div className="flex gap-2"><button onClick={() => edit(c)} className="text-stone-400 hover:text-obsidian-900"><Edit size={14} /></button><button onClick={() => confirm(`Delete ${c.code}?`) && remove.mutate(c._id)} className="text-stone-400 hover:text-red-500"><Trash2 size={14} /></button></div></td></tr>)}
    </tbody></table></div>
  </div>
}
