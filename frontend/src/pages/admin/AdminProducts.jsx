import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit, Trash2, Search, X, GripVertical, Upload, Crop, Image as ImageIcon, Package } from 'lucide-react'
import { productAPI } from '../../services/api'
import { formatPrice } from '../../utils/helpers'
import toast from 'react-hot-toast'
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'

// ─── Color Swatch ──────────────────────────────────────────────────────────────
const COLOR_PRESETS = {
  Black:   '#1a1a1a', White:  '#f5f5f5', Navy:    '#1b2a4a',
  Red:     '#c0392b', Green:  '#27ae60', Blue:    '#2980b9',
  Yellow:  '#f1c40f', Pink:   '#e91e8c', Purple:  '#8e44ad',
  Orange:  '#e67e22', Grey:   '#7f8c8d', Brown:   '#795548',
  Beige:   '#d4b896', Cream:  '#fffdd0', Khaki:   '#c3b091',
}

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

function ColorDot({ color, size = 16 }) {
  const hex = COLOR_PRESETS[color] || color || '#ccc'
  const isDark = hex === '#1a1a1a' || hex === '#1b2a4a'
  return (
    <span
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: '50%',
        background: hex,
        border: isDark ? 'none' : '1.5px solid rgba(0,0,0,0.12)',
        flexShrink: 0,
        verticalAlign: 'middle',
      }}
    />
  )
}

// ─── Image Cropper Modal ────────────────────────────────────────────────────────
function CropModal({ src, filename, onDone, onSkip }) {
  const imgRef = useRef(null)
  const [crop, setCrop] = useState()
  const [completedCrop, setCompletedCrop] = useState()

  const onImageLoad = useCallback((e) => {
    const { width, height } = e.currentTarget
    const c = centerCrop(makeAspectCrop({ unit: '%', width: 90 }, 3 / 4, width, height), width, height)
    setCrop(c)
  }, [])

  const handleApply = async () => {
    if (!completedCrop || !imgRef.current) { onSkip(); return }
    const canvas = document.createElement('canvas')
    const scaleX = imgRef.current.naturalWidth / imgRef.current.width
    const scaleY = imgRef.current.naturalHeight / imgRef.current.height
    canvas.width = completedCrop.width
    canvas.height = completedCrop.height
    const ctx = canvas.getContext('2d')
    ctx.drawImage(
      imgRef.current,
      completedCrop.x * scaleX, completedCrop.y * scaleY,
      completedCrop.width * scaleX, completedCrop.height * scaleY,
      0, 0, completedCrop.width, completedCrop.height
    )
    canvas.toBlob(blob => {
      if (!blob) { onSkip(); return }
      const file = new File([blob], filename, { type: 'image/jpeg' })
      onDone(file, canvas.toDataURL('image/jpeg'))
    }, 'image/jpeg', 0.92)
  }

  return (
    <motion.div
      className="fixed inset-0 bg-black/70 flex items-center justify-center p-6 z-[60]"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
    >
      <motion.div
        className="bg-white rounded-xl shadow-2xl p-5 max-w-lg w-full"
        initial={{ scale: 0.9 }} animate={{ scale: 1 }}
      >
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Crop size={15} className="text-stone-400" />
            <h3 className="text-sm font-semibold text-stone-800">Crop Image</h3>
          </div>
          <span className="text-xs text-stone-400 font-mono truncate max-w-[200px]">{filename}</span>
        </div>
        <div className="bg-stone-50 rounded-lg overflow-hidden flex items-center justify-center" style={{ maxHeight: 340 }}>
          <ReactCrop
            crop={crop} onChange={c => setCrop(c)}
            onComplete={c => setCompletedCrop(c)}
            aspect={3 / 4}
          >
            <img
              ref={imgRef} src={src} alt="crop"
              onLoad={onImageLoad}
              style={{ maxHeight: 320, maxWidth: '100%', display: 'block' }}
            />
          </ReactCrop>
        </div>
        <p className="text-[10px] text-stone-400 mt-2 mb-4">Drag to adjust. Default ratio: 3:4 (portrait)</p>
        <div className="flex gap-3">
          <button onClick={onSkip} className="flex-1 py-2 rounded-lg border border-stone-200 text-xs text-stone-500 hover:bg-stone-50 transition-colors">
            Skip
          </button>
          <button onClick={handleApply} className="flex-1 py-2 rounded-lg bg-stone-900 text-white text-xs hover:bg-stone-800 transition-colors">
            Apply Crop
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Drag & Drop Upload Area ────────────────────────────────────────────────────
function DropzoneArea({ images, setImages, variantColors }) {
  const inputRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)
  const [cropQueue, setCropQueue] = useState([])
  const [cropping, setCropping] = useState(null)

  const processFiles = (files) => {
    const newQueue = files.map(f => ({ src: URL.createObjectURL(f), filename: f.name, rawFile: f }))
    setCropQueue(prev => [...prev, ...newQueue])
    if (!cropping) {
      const first = newQueue[0]
      setCropping(first)
      setCropQueue(prev => prev.filter(q => q.filename !== first.filename))
    }
  }

  const handleDrop = (e) => {
    e.preventDefault(); setIsDragging(false)
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
    if (files.length) processFiles(files)
  }

  const handleFileInput = (e) => {
    const files = Array.from(e.target.files)
    if (files.length) processFiles(files)
    e.target.value = ''
  }

  const finalizeCrop = (file, preview) => {
    const colorHint = variantColors[images.length % variantColors.length] || ''
    setImages(prev => [...prev, { file, preview, color: colorHint, id: Date.now() + Math.random() }])
    advanceCropQueue()
  }

  const skipCrop = () => {
    if (cropping) {
      const f = cropping.rawFile
      const colorHint = variantColors[images.length % variantColors.length] || ''
      setImages(prev => [...prev, { file: f, preview: cropping.src, color: colorHint, id: Date.now() + Math.random() }])
    }
    advanceCropQueue()
  }

  const advanceCropQueue = () => {
    setCropQueue(prev => {
      if (prev.length > 0) {
        const [next, ...rest] = prev
        setCropping(next)
        return rest
      }
      setCropping(null)
      return []
    })
  }

  const removeImage = (id) => setImages(prev => prev.filter(img => img.id !== id))
  const updateImageColor = (id, color) => setImages(prev => prev.map(img => img.id === id ? { ...img, color } : img))

  return (
    <>
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 ${
          isDragging ? 'border-stone-900 bg-stone-50 scale-[1.01]' : 'border-stone-200 hover:border-stone-400 hover:bg-stone-50/50'
        }`}
      >
        <input ref={inputRef} type="file" multiple accept="image/*" onChange={handleFileInput} className="hidden" />
        <Upload size={22} className={`mx-auto mb-2 transition-colors ${isDragging ? 'text-stone-900' : 'text-stone-300'}`} />
        <p className="text-xs text-stone-500 font-medium">
          {isDragging ? 'Drop to add images' : 'Drag & drop images, or click to browse'}
        </p>
        <p className="text-[10px] text-stone-400 mt-1">PNG, JPG, WEBP — Each image will be cropped</p>
      </div>

      <AnimatePresence>
        {images.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-[10px] text-stone-400 font-mono mb-2 flex items-center gap-1">
              <GripVertical size={10} /> DRAG TO REORDER · {images.length} image{images.length !== 1 ? 's' : ''}
            </p>
            <Reorder.Group axis="x" values={images} onReorder={setImages} className="flex gap-2 flex-wrap">
              {images.map((img, idx) => (
                <Reorder.Item key={img.id} value={img} className="relative group cursor-grab active:cursor-grabbing">
                  <div className="w-20 h-24 rounded-lg overflow-hidden border-2 border-stone-100 bg-stone-50 relative shadow-sm hover:shadow-md transition-shadow">
                    {idx === 0 && (
                      <span className="absolute top-1 left-1 z-10 bg-stone-900 text-white text-[8px] font-mono px-1 rounded">COVER</span>
                    )}
                    <img src={img.preview} alt="" className="w-full h-full object-cover" />
                    <div className="absolute bottom-0 inset-x-0 bg-white/90 backdrop-blur-sm px-1 py-0.5 flex items-center gap-1">
                      <ColorDot color={img.color} size={8} />
                      <input
                        value={img.color}
                        onChange={e => updateImageColor(img.id, e.target.value)}
                        placeholder="color"
                        className="text-[8px] text-stone-600 bg-transparent w-full outline-none font-mono"
                        onClick={e => e.stopPropagation()}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeImage(img.id) }}
                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center z-10"
                    >
                      <X size={8} />
                    </button>
                  </div>
                </Reorder.Item>
              ))}
            </Reorder.Group>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {cropping && (
          <CropModal src={cropping.src} filename={cropping.filename} onDone={finalizeCrop} onSkip={skipCrop} />
        )}
      </AnimatePresence>
    </>
  )
}

// ─── Variant Image Picker ───────────────────────────────────────────────────────
function VariantImageSelect({ images, value, onChange }) {
  return (
    <div className="flex gap-1 flex-wrap mt-1">
      <button
        type="button"
        onClick={() => onChange('')}
        className={`w-7 h-7 rounded border flex items-center justify-center text-[9px] transition-all ${!value ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-200 text-stone-400 hover:border-stone-400'}`}
      >
        <ImageIcon size={10} />
      </button>
      {images.map((img, idx) => (
        <button
          key={img.id}
          type="button"
          onClick={() => onChange(img.id)}
          className={`relative w-7 h-7 rounded overflow-hidden border-2 transition-all ${value === img.id ? 'border-stone-900 scale-110 shadow-md' : 'border-transparent hover:border-stone-300'}`}
        >
          <img src={img.preview} alt="" className="w-full h-full object-cover" />
          {idx === 0 && <span className="absolute bottom-0 inset-x-0 bg-black/40 text-[5px] text-center text-white">CVR</span>}
        </button>
      ))}
    </div>
  )
}

// ─── Color-Grouped Variant Builder ─────────────────────────────────────────────
//
// Internal shape:  [{ id, color, imageId, sizes: { XS: '', S: '5', M: '10', L: '', XL: '', XXL: '' } }]
// On submit, flatten → [{ size, color, stock, imageId, sku }]

function buildEmptySizes() {
  return SIZES.reduce((acc, s) => ({ ...acc, [s]: '' }), {})
}

function VariantBuilder({ colorGroups, setColorGroups, images }) {
  const addColorGroup = () => {
    setColorGroups(prev => [
      ...prev,
      { id: Date.now(), color: '', imageId: '', sizes: buildEmptySizes() },
    ])
  }

  const removeColorGroup = (id) =>
    setColorGroups(prev => prev.filter(g => g.id !== id))

  const updateGroup = (id, field, value) =>
    setColorGroups(prev => prev.map(g => g.id === id ? { ...g, [field]: value } : g))

  const updateSize = (id, size, stock) =>
    setColorGroups(prev =>
      prev.map(g => g.id === id ? { ...g, sizes: { ...g.sizes, [size]: stock } } : g)
    )

  const toggleSize = (id, size) =>
    setColorGroups(prev =>
      prev.map(g => {
        if (g.id !== id) return g
        const current = g.sizes[size]
        // If currently empty string (disabled), enable with '0'; if has value, clear it
        const next = current === '' ? '0' : ''
        return { ...g, sizes: { ...g.sizes, [size]: next } }
      })
    )

  const totalStock = colorGroups.reduce((sum, g) =>
    sum + Object.values(g.sizes).reduce((s, v) => s + (v !== '' ? Number(v) : 0), 0), 0)

  return (
    <section>
      <div className="flex justify-between items-center mb-3">
        <label className="text-[10px] font-mono text-stone-400 tracking-widest uppercase">
          Variants
          <span className="ml-2 bg-stone-100 text-stone-500 rounded-full px-2 py-0.5 text-[9px]">
            {colorGroups.length} color{colorGroups.length !== 1 ? 's' : ''}
          </span>
        </label>
        <button
          type="button"
          onClick={addColorGroup}
          className="text-[10px] border border-stone-200 hover:border-stone-800 text-stone-500 hover:text-stone-800 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
        >
          <Plus size={10} /> Add Color
        </button>
      </div>

      <div className="space-y-3">
        <AnimatePresence>
          {colorGroups.map((group) => {
            const enabledSizes = SIZES.filter(s => group.sizes[s] !== '')
            return (
              <motion.div
                key={group.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="border border-stone-200 rounded-xl overflow-hidden bg-white"
              >
                {/* ── Color header row ── */}
                <div className="flex items-center gap-3 px-4 py-3 bg-stone-50 border-b border-stone-100">
                  {/* Color swatch + input */}
                  <div className="flex items-center gap-2 flex-1">
                    <ColorDot color={group.color} size={14} />
                    <input
                      list={`cg-colors-${group.id}`}
                      placeholder="Color name (e.g. Brown)"
                      value={group.color}
                      onChange={e => updateGroup(group.id, 'color', e.target.value)}
                      className="flex-1 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs bg-white outline-none focus:border-stone-800 transition-colors min-w-0"
                    />
                    <datalist id={`cg-colors-${group.id}`}>
                      {Object.keys(COLOR_PRESETS).map(c => <option key={c} value={c} />)}
                    </datalist>
                  </div>

                  {/* Quick color swatches */}
                  <div className="flex gap-1">
                    {Object.entries(COLOR_PRESETS).slice(0, 10).map(([name, hex]) => (
                      <button
                        key={name} type="button"
                        onClick={() => updateGroup(group.id, 'color', name)}
                        title={name}
                        style={{
                          background: hex,
                          border: group.color === name ? '2px solid #1a1a1a' : '1.5px solid rgba(0,0,0,0.1)',
                        }}
                        className="w-4 h-4 rounded-full transition-transform hover:scale-110 flex-shrink-0"
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => removeColorGroup(group.id)}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-stone-300 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                  >
                    <X size={11} />
                  </button>
                </div>

                {/* ── Size grid ── */}
                <div className="px-4 py-3 space-y-3">
                  {/* Size toggles */}
                  <div>
                    <p className="text-[9px] font-mono text-stone-400 uppercase tracking-wider mb-2">
                      Select sizes — click to enable, then set stock
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      {SIZES.map(size => {
                        const active = group.sizes[size] !== ''
                        return (
                          <button
                            key={size}
                            type="button"
                            onClick={() => toggleSize(group.id, size)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-all ${
                              active
                                ? 'bg-stone-900 text-white border-stone-900'
                                : 'border-stone-200 text-stone-400 hover:border-stone-400 hover:text-stone-600'
                            }`}
                          >
                            {size}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Stock inputs for enabled sizes */}
                  {enabledSizes.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                      {enabledSizes.map(size => (
                        <div key={size} className="space-y-1">
                          <p className="text-[9px] font-mono text-stone-500 uppercase text-center">{size}</p>
                          <input
                            type="number"
                            min={0}
                            value={group.sizes[size]}
                            onChange={e => updateSize(group.id, size, e.target.value)}
                            placeholder="0"
                            className="w-full border border-stone-200 rounded-lg px-2 py-1.5 text-xs text-center bg-white outline-none focus:border-stone-800 transition-colors"
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {enabledSizes.length === 0 && (
                    <p className="text-[10px] text-stone-300 italic">No sizes selected — click a size above to enable it</p>
                  )}

                  {/* Variant image */}
                  {images.length > 0 && (
                    <div>
                      <p className="text-[9px] font-mono text-stone-400 uppercase tracking-wider mb-1">Linked image</p>
                      <VariantImageSelect
                        images={images}
                        value={group.imageId}
                        onChange={val => updateGroup(group.id, 'imageId', val)}
                      />
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {colorGroups.length > 0 && (
        <div className="mt-3 flex items-center gap-2">
          <div className="h-px flex-1 bg-stone-100" />
          <p className="text-[10px] text-stone-400 font-mono">
            Total Stock: <span className="font-semibold text-stone-700">{totalStock}</span>
            {' · '}
            {colorGroups.reduce((sum, g) => sum + SIZES.filter(s => g.sizes[s] !== '').length, 0)} variant{colorGroups.reduce((sum, g) => sum + SIZES.filter(s => g.sizes[s] !== '').length, 0) !== 1 ? 's' : ''}
          </p>
          <div className="h-px flex-1 bg-stone-100" />
        </div>
      )}
    </section>
  )
}

// ─── Flatten color groups → flat variant array ──────────────────────────────────
function flattenColorGroups(colorGroups) {
  const flat = []
  for (const group of colorGroups) {
    for (const size of SIZES) {
      if (group.sizes[size] === '') continue // not selected
      flat.push({
        size,
        color: group.color,
        stock: Number(group.sizes[size] || 0),
        imageId: group.imageId || '',
        sku: `SKU-${size}-${group.color}-${Date.now()}`,
      })
    }
  }
  return flat
}

// ─── Inflate flat variants → color groups (for edit mode) ──────────────────────
function inflateToColorGroups(variants) {
  const map = new Map()
  for (const v of variants) {
    if (!map.has(v.color)) {
      map.set(v.color, { id: Date.now() + Math.random(), color: v.color, imageId: v.imageId || '', sizes: buildEmptySizes() })
    }
    map.get(v.color).sizes[v.size] = String(v.stock)
  }
  return Array.from(map.values())
}

// ─── Bulk Upload Modal ──────────────────────────────────────────────────────────
function BulkUploadModal({ onClose, onImport }) {
  const [rows, setRows] = useState([
    { name: '', price: '', category: 'tops', color: 'Black', size: 'M', stock: '10' },
  ])
  const [csvText, setCsvText] = useState('')
  const [tab, setTab] = useState('manual')

  const parseCsv = () => {
    try {
      const lines = csvText.trim().split('\n')
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
      const parsed = lines.slice(1).map(line => {
        const vals = line.split(',').map(v => v.trim())
        return headers.reduce((obj, h, i) => ({ ...obj, [h]: vals[i] || '' }), {})
      })
      setRows(parsed)
      toast.success(`Parsed ${parsed.length} rows`)
    } catch {
      toast.error('CSV parse failed — check format')
    }
  }

  const updateRow = (i, field, val) =>
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r))

  const handleImport = () => {
    const valid = rows.filter(r => r.name && r.price)
    if (!valid.length) { toast.error('No valid rows'); return }
    onImport(valid)
    onClose()
  }

  return (
    <motion.div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[55]"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <motion.div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col"
        initial={{ scale: 0.9 }} animate={{ scale: 1 }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <Package size={15} className="text-stone-400" />
            <h3 className="text-sm font-semibold text-stone-800">Bulk Upload Products</h3>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex gap-1 text-xs">
              {['manual', 'csv'].map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-3 py-1.5 rounded-lg transition-colors capitalize ${tab === t ? 'bg-stone-900 text-white' : 'text-stone-500 hover:bg-stone-100'}`}>
                  {t === 'csv' ? 'CSV Import' : 'Manual Entry'}
                </button>
              ))}
            </div>
            <button onClick={onClose}><X size={16} className="text-stone-400" /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'csv' ? (
            <div className="space-y-3">
              <div className="bg-stone-50 border border-stone-100 rounded-lg p-3 text-[10px] font-mono text-stone-400">
                name,price,category,color,size,stock<br />
                "Classic Tee",29.99,tops,Black,M,50<br />
                "Slim Jogger",49.99,bottoms,Navy,L,25
              </div>
              <textarea
                value={csvText} onChange={e => setCsvText(e.target.value)}
                placeholder="Paste CSV here..."
                className="w-full h-36 font-mono text-xs border border-stone-200 rounded-lg p-3 outline-none focus:border-stone-400 resize-none"
              />
              <button onClick={parseCsv} className="text-xs bg-stone-900 text-white px-4 py-2 rounded-lg hover:bg-stone-800 transition-colors">
                Parse CSV
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-6 gap-2 text-[9px] font-mono text-stone-400 uppercase tracking-wider px-1">
                {['Name', 'Price', 'Category', 'Color', 'Size', 'Stock'].map(h => <div key={h}>{h}</div>)}
              </div>
              {rows.map((row, i) => (
                <div key={i} className="grid grid-cols-6 gap-2 items-center">
                  {['name', 'price', 'category', 'color', 'size', 'stock'].map(field => (
                    field === 'category' ? (
                      <select key={field} value={row[field] || 'tops'} onChange={e => updateRow(i, field, e.target.value)}
                        className="border border-stone-200 rounded px-2 py-1.5 text-xs outline-none focus:border-stone-400">
                        {['tops', 'bottoms', 'outerwear', 'dresses', 'accessories', 'footwear', 'activewear'].map(c => <option key={c}>{c}</option>)}
                      </select>
                    ) : (
                      <input key={field} value={row[field] || ''} onChange={e => updateRow(i, field, e.target.value)}
                        className="border border-stone-200 rounded px-2 py-1.5 text-xs outline-none focus:border-stone-400"
                        type={['price', 'stock'].includes(field) ? 'number' : 'text'}
                      />
                    )
                  ))}
                </div>
              ))}
              <button type="button" onClick={() => setRows([...rows, { name: '', price: '', category: 'tops', color: 'Black', size: 'M', stock: '10' }])}
                className="text-xs text-stone-500 hover:text-stone-800 border border-dashed border-stone-200 rounded-lg py-2 w-full hover:border-stone-400 transition-colors">
                + Add Row
              </button>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-stone-100 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 text-xs border border-stone-200 rounded-lg text-stone-500 hover:bg-stone-50 transition-colors">Cancel</button>
          <button onClick={handleImport} className="flex-1 py-2 text-xs bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors">
            Import {rows.filter(r => r.name).length} Products
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Product Form Modal ─────────────────────────────────────────────────────────
function ProductFormModal({ product, onClose }) {
  const qc = useQueryClient()
  const isEdit = !!product

  const [form, setForm] = useState(product || {
    name: '', description: '', price: '', comparePrice: '',
    category: 'tops', gender: 'unisex', material: '', isFeatured: false, isNew: true,
  })

  const [images, setImages] = useState(
    product?.images?.map((img, i) => ({
      file: null, preview: img.url, color: '', id: i, isExisting: true,
    })) || []
  )

  // Color-grouped variant state
  const [colorGroups, setColorGroups] = useState(
    product?.variants?.length
      ? inflateToColorGroups(product.variants)
      : [{ id: Date.now(), color: '', imageId: '', sizes: buildEmptySizes() }]
  )

  const mutation = useMutation({
    mutationFn: (formData) =>
      isEdit ? productAPI.update(product._id, formData) : productAPI.create(formData),
    onSuccess: () => {
      qc.invalidateQueries(['admin-products'])
      toast.success(isEdit ? 'Updated!' : 'Created!')
      onClose()
    },
    onError: err => toast.error(err?.response?.data?.message || 'Failed'),
  })

  const handleSubmit = (e) => {
    e.preventDefault()

    // Validate color groups
    for (const group of colorGroups) {
      if (!group.color.trim()) {
        toast.error('Every color group needs a color name')
        return
      }
      const enabledSizes = SIZES.filter(s => group.sizes[s] !== '')
      if (enabledSizes.length === 0) {
        toast.error(`Color "${group.color}" has no sizes selected`)
        return
      }
      for (const size of enabledSizes) {
        if (Number(group.sizes[size]) < 0) {
          toast.error(`Stock for ${group.color} / ${size} cannot be negative`)
          return
        }
      }
    }

    // Check duplicate colors
    const colors = colorGroups.map(g => g.color.trim().toLowerCase())
    const uniqueColors = new Set(colors)
    if (uniqueColors.size !== colors.length) {
      toast.error('Duplicate colors found — each color must be unique')
      return
    }

    const flatVariants = flattenColorGroups(colorGroups)

    const formData = new FormData()
    Object.entries(form).forEach(([k, v]) => {
      if (typeof v === 'object') return
      formData.append(k, v)
    })
    formData.append('variants', JSON.stringify(flatVariants))
    images.forEach(img => { if (img.file) formData.append('images', img.file) })

    mutation.mutate(formData)
  }

  return (
    <motion.div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <motion.div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto"
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}>

        {/* HEADER */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-stone-100 px-6 py-4 flex justify-between items-center z-10">
          <div>
            <h2 className="text-base font-semibold text-stone-900 tracking-tight">
              {isEdit ? 'Edit Product' : 'New Product'}
            </h2>
            <p className="text-[10px] text-stone-400 font-mono mt-0.5">
              {isEdit ? `ID: ${product._id}` : 'Fill in product details below'}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-stone-100 transition-colors">
            <X size={15} className="text-stone-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {/* ── Images ── */}
          <section>
            <label className="block text-[10px] font-mono text-stone-400 tracking-widest uppercase mb-2">Images</label>
            <DropzoneArea
              images={images}
              setImages={setImages}
              variantColors={colorGroups.map(g => g.color).filter(Boolean)}
            />
          </section>

          {/* ── Basic Info ── */}
          <section className="space-y-3">
            <label className="block text-[10px] font-mono text-stone-400 tracking-widest uppercase">Details</label>
            <input
              placeholder="Product Name *"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-stone-800 transition-colors"
              required
            />
            <textarea
              placeholder="Description *"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-stone-800 transition-colors resize-none h-20"
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number" placeholder="Price *"
                value={form.price}
                onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-stone-800 transition-colors"
              />
              <input
                type="number" placeholder="Compare Price"
                value={form.comparePrice}
                onChange={e => setForm(f => ({ ...f, comparePrice: e.target.value }))}
                className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-stone-800 transition-colors"
              />
            </div>
            <select
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-stone-800 transition-colors bg-white"
            >
              {['tops', 'bottoms', 'outerwear', 'dresses', 'accessories', 'footwear', 'activewear'].map(c => (
                <option key={c} value={c} className="capitalize">{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          </section>

          {/* ── Variants ── */}
          <VariantBuilder
            colorGroups={colorGroups}
            setColorGroups={setColorGroups}
            images={images}
          />

          {/* ── Flags ── */}
          <section className="flex gap-6">
            {[
              { key: 'isFeatured', label: 'Featured', color: 'bg-amber-400' },
              { key: 'isNew', label: 'New Arrival', color: 'bg-blue-500' },
            ].map(({ key, label, color }) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer group">
                <div
                  onClick={() => setForm(f => ({ ...f, [key]: !f[key] }))}
                  className={`w-9 h-5 rounded-full transition-all duration-200 relative ${form[key] ? color : 'bg-stone-200'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-200 ${form[key] ? 'left-4' : 'left-0.5'}`} />
                </div>
                <span className="text-xs text-stone-600">{label}</span>
              </label>
            ))}
          </section>

          {/* ── Actions ── */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 text-sm border border-stone-200 rounded-xl text-stone-600 hover:bg-stone-50 transition-colors">
              Cancel
            </button>
            <button type="submit"
              className="flex-1 py-2.5 text-sm bg-stone-900 text-white rounded-xl hover:bg-stone-800 transition-colors disabled:opacity-50"
              disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Product'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────────────
export default function AdminProducts() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [modal, setModal] = useState(null)
  const [bulkModal, setBulkModal] = useState(false)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-products', page, search],
    queryFn: () =>
      productAPI.getAll({ page, limit: 15, search: search || undefined, isActive: undefined })
        .then(r => r.data.data),
  })

  const deleteMutation = useMutation({
    mutationFn: productAPI.delete,
    onSuccess: () => { qc.invalidateQueries(['admin-products']); toast.success('Product removed') },
  })

  const handleBulkImport = (rows) => {
    toast.success(`Queued ${rows.length} products for import`)
    console.log('Bulk import rows:', rows)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-light">Products</h1>
          <p className="text-xs text-stone-400 font-mono">{data?.pagination?.total || 0} total</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setBulkModal(true)}
            className="text-xs border border-stone-200 hover:border-stone-800 text-stone-500 hover:text-stone-800 px-3 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            <Package size={13} /> Bulk Upload
          </button>
          <button onClick={() => setModal('new')} className="btn-gold text-xs flex items-center gap-2">
            <Plus size={14} /> Add Product
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
          placeholder="Search products..." className="input-field pl-9 text-sm" />
      </div>

      {/* Table */}
      <div className="bg-white border border-stone-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-stone-100">
              <tr>
                {['Product', 'Category', 'Price', 'Stock', 'Colors', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] tracking-[0.2em] uppercase text-stone-400 font-mono whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {isLoading
                ? Array(8).fill(0).map((_, i) => (
                    <tr key={i}><td colSpan={7} className="px-4 py-3"><div className="skeleton h-8 rounded" /></td></tr>
                  ))
                : (data?.products || []).map((p, i) => (
                    <motion.tr key={p._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                      className="hover:bg-cream-50 transition-colors group">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <img src={p.images?.[0]?.url} alt={p.name} className="w-10 h-10 object-cover bg-cream-100 flex-shrink-0 rounded" />
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
                          {[...new Set((p.variants || []).map(v => v.color))].slice(0, 5).map(color => (
                            <ColorDot key={color} color={color} size={14} />
                          ))}
                        </div>
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
                          <button onClick={() => { if (confirm('Delete this product?')) deleteMutation.mutate(p._id) }}
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

      {/* Modals */}
      <AnimatePresence>
        {modal && <ProductFormModal product={modal === 'new' ? null : modal} onClose={() => setModal(null)} />}
        {bulkModal && <BulkUploadModal onClose={() => setBulkModal(false)} onImport={handleBulkImport} />}
      </AnimatePresence>
    </div>
  )
}