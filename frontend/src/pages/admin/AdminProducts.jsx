import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit, Trash2, Search, X } from 'lucide-react'
import { productAPI } from '../../services/api'
import { formatPrice } from '../../utils/helpers'
import toast from 'react-hot-toast'

function ProductFormModal({ product, onClose }) {
  const qc = useQueryClient()
  const isEdit = !!product

  const SIZES = ['XS','S','M','L','XL','XXL']

  const [form, setForm] = useState(product || {
    name: '',
    description: '',
    price: '',
    comparePrice: '',
    category: 'tops',
    gender: 'unisex',
    material: '',
    isFeatured: false,
    isNew: true
  })

  const [images, setImages] = useState([])

  const [variants, setVariants] = useState(
    product?.variants || [
      { size: 'M', color: 'Black', stock: 10 }
    ]
  )

  const generateSKU = (v) =>
    `SKU-${v.size}-${v.color}-${Math.random().toString(36).slice(2,6).toUpperCase()}`

  const mutation = useMutation({
    mutationFn: (formData) =>
      isEdit
        ? productAPI.update(product._id, formData)
        : productAPI.create(formData),

    onSuccess: () => {
      qc.invalidateQueries(['admin-products'])
      toast.success(isEdit ? 'Updated!' : 'Created!')
      onClose()
    },
    onError: err => toast.error(err?.response?.data?.message || 'Failed')
  })

  const handleSubmit = (e) => {
    e.preventDefault()

    // ✅ VALIDATION
    const seen = new Set()

    for (let v of variants) {
      if (!v.size || !v.color) {
        toast.error('Fill all variant fields')
        return
      }

      if (v.stock < 0) {
        toast.error('Stock cannot be negative')
        return
      }

      const key = `${v.size}-${v.color}`

      if (seen.has(key)) {
        toast.error(`Duplicate: ${key}`)
        return
      }

      seen.add(key)
    }

    const formData = new FormData()

    Object.entries(form).forEach(([k, v]) => {
      formData.append(k, v)
    })

    formData.append(
      "variants",
      JSON.stringify(
        variants.map(v => ({
          ...v,
          stock: Number(v.stock),
          sku: generateSKU(v)
        }))
      )
    )

    images.forEach(file => formData.append("images", file))

    mutation.mutate(formData)
  }

  const totalStock = variants.reduce((sum, v) => sum + Number(v.stock || 0), 0)

  const updateVariant = (index, field, value) => {
    setVariants(prev =>
      prev.map((v, i) =>
        i === index ? { ...v, [field]: value } : v
      )
    )
  }

  return (
    <motion.div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <motion.div className="bg-white w-full max-w-xl p-6 rounded shadow-lg max-h-[90vh] overflow-y-auto">

        {/* HEADER */}
        <div className="flex justify-between mb-4">
          <h2 className="text-lg font-semibold">
            {isEdit ? 'Edit Product' : 'New Product'}
          </h2>
          <button onClick={onClose}><X /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* NAME */}
          <input
            placeholder="Product Name"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="input-field"
            required
          />

          {/* DESCRIPTION */}
          <textarea
            placeholder="Description"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            className="input-field"
            required
          />

          {/* PRICE */}
          <div className="grid grid-cols-2 gap-4">
            <input
              type="number"
              placeholder="Price"
              value={form.price}
              onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
              className="input-field"
            />
            <input
              type="number"
              placeholder="Compare Price"
              value={form.comparePrice}
              onChange={e => setForm(f => ({ ...f, comparePrice: e.target.value }))}
              className="input-field"
            />
          </div>

          {/* CATEGORY */}
          <select
            value={form.category}
            onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            className="input-field"
          >
            {['tops','bottoms','outerwear','dresses','accessories','footwear','activewear'].map(c => (
              <option key={c}>{c}</option>
            ))}
          </select>

          {/* IMAGE */}
          <input
            type="file"
            multiple
            onChange={(e) => setImages(Array.from(e.target.files))}
          />

          {/* ================= VARIANTS ================= */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <p className="text-sm font-semibold">Variants</p>
              <button
                type="button"
                onClick={() =>
                  setVariants([...variants, { size: 'M', color: '', stock: 0 }])
                }
                className="text-xs border px-2 py-1 rounded"
              >
                + Add
              </button>
            </div>

            {variants.map((v, i) => (
              <div key={i} className="grid grid-cols-4 gap-2 border p-2 rounded">

                <select
                  value={v.size}
                  onChange={(e) => updateVariant(i, 'size', e.target.value)}
                  className="input-field"
                >
                  {SIZES.map(s => <option key={s}>{s}</option>)}
                </select>

                <input
                  placeholder="Color"
                  value={v.color}
                  onChange={(e) => updateVariant(i, 'color', e.target.value)}
                  className="input-field"
                />

                <input
                  type="number"
                  value={v.stock}
                  onChange={(e) => updateVariant(i, 'stock', e.target.value)}
                  className="input-field"
                />

                <button
                  type="button"
                  onClick={() =>
                    setVariants(variants.filter((_, idx) => idx !== i))
                  }
                  className="text-red-500 text-xs"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          {/* TOTAL STOCK */}
          <p className="text-xs text-gray-500">
            Total Stock: <b>{totalStock}</b>
          </p>

          {/* CHECKBOX */}
          <div className="flex gap-4">
            <label>
              <input
                type="checkbox"
                checked={form.isFeatured}
                onChange={e => setForm(f => ({ ...f, isFeatured: e.target.checked }))}
              />
              Featured
            </label>

            <label>
              <input
                type="checkbox"
                checked={form.isNew}
                onChange={e => setForm(f => ({ ...f, isNew: e.target.checked }))}
              />
              New
            </label>
          </div>

          {/* ACTIONS */}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-outline flex-1">
              Cancel
            </button>

            <button type="submit" className="btn-primary flex-1">
              {mutation.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>

        </form>
      </motion.div>
    </motion.div>
  )
}
export default function AdminProducts() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState(null)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-products', page, search],
    queryFn: () => productAPI.getAll({ page, limit: 15, search: search || undefined, isActive: undefined }).then(r => r.data.data)
  })

  const deleteMutation = useMutation({
    mutationFn: productAPI.delete,
    onSuccess: () => { qc.invalidateQueries(['admin-products']); toast.success('Product removed') }
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-light">Products</h1>
          <p className="text-xs text-stone-400 font-mono">{data?.pagination?.total || 0} total</p>
        </div>
        <button onClick={() => setModal('new')} className="btn-gold text-xs flex items-center gap-2">
          <Plus size={14} /> Add Product
        </button>
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
          placeholder="Search products..." className="input-field pl-9 text-sm" />
      </div>

      <div className="bg-white border border-stone-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-stone-100">
              <tr>
                {['Product','Category','Price','Stock','Status','Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] tracking-[0.2em] uppercase text-stone-400 font-mono whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {isLoading ? Array(8).fill(0).map((_, i) => (
                <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="skeleton h-8 rounded" /></td></tr>
              )) : (data?.products || []).map((p, i) => (
                <motion.tr key={p._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  className="hover:bg-cream-50 transition-colors group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img src={p.images?.[0]?.url} alt={p.name} className="w-10 h-10 object-cover bg-cream-100 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-body text-obsidian-900 line-clamp-1">{p.name}</p>
                        <p className="text-[10px] text-stone-400 font-mono line-clamp-1">{p.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-stone-500 capitalize">{p.category}</td>
                  <td className="px-4 py-3 font-display text-sm text-obsidian-900">{formatPrice(p.price)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-mono ${p.totalStock > 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {p.totalStock ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {p.isFeatured && <span className="badge bg-gold-400/20 text-gold-600">Featured</span>}
                      {p.isNew && <span className="badge bg-blue-50 text-blue-600">New</span>}
                      {!p.isActive && <span className="badge bg-red-50 text-red-500">Inactive</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setModal(p)} className="p-1.5 hover:bg-stone-100 rounded transition-colors text-stone-400 hover:text-obsidian-900">
                        <Edit size={13} />
                      </button>
                      <button onClick={() => { if(confirm('Delete this product?')) deleteMutation.mutate(p._id) }}
                        className="p-1.5 hover:bg-red-50 rounded transition-colors text-stone-400 hover:text-red-500">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {modal && <ProductFormModal product={modal === 'new' ? null : modal} onClose={() => setModal(null)} />}
      </AnimatePresence>
    </div>
  )
}