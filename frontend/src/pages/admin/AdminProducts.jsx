import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit, Trash2, Search, X, GripVertical, Upload, Crop, Image as ImageIcon, Package, Ruler, ChevronDown, ChevronUp, Eye, AlertCircle, Loader2, RotateCcw } from 'lucide-react'
import api, { productAPI } from '../../services/api'
import { formatPrice } from '../../utils/helpers'
import { 
  SIZE_CHART_PRESETS, 
  DEFAULT_SIZES, 
  DEFAULT_SIZE_CHART,
  validateMeasurementName,
  validateSizeName,
  applyPreset,
  normalizeSizeChartFromAPI,
  prepareSizeChartForAPI,
  getActiveRows,
  getMeasurementCount,
  getActiveSizeCount,
  guessPreset
} from '../../utils/sizeChartUtils'
import { resolveColor, isDarkColor } from '../../utils/colors'
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
const MAX_IMAGES = 10
const MAX_IMAGE_MB = 60 // raw files can be big phone/camera photos; they are shrunk before upload
const MAX_EDGE = 2400 // longest side after shrinking
const PLACEHOLDER_PREVIEW = 'data:image/svg+xml;utf8,' + encodeURIComponent("<svg xmlns='http://www.w3.org/2000/svg' width='160' height='200'><rect width='160' height='200' fill='#f5efe0'/><text x='80' y='105' font-size='13' text-anchor='middle' fill='#8a7a4e' font-family='sans-serif'>Photo ready</text></svg>")

const isImageFile = f => f.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|avif|heic|heif|bmp|tiff?)$/i.test(f.name)

// Returns an ImageBitmap if this browser can decode the file (HEIC usually can't outside Safari).
async function decodeImage(file) {
  try { return await createImageBitmap(file) } catch { return null }
}

// Shrinks large photos and converts them to a web-friendly format. Files the browser can't
// decode are sent untouched and converted by the server.
async function shrinkImage(file) {
  const bitmap = await decodeImage(file)
  if (!bitmap) return file
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const smallEnough = scale === 1 && file.size <= 3 * 1024 * 1024 && /^image\/(jpe?g|webp)$/.test(file.type)
  if (smallEnough) { bitmap.close?.(); return file }
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close?.()
  const keepAlpha = /^image\/(png|gif|avif)$/.test(file.type)
  const type = keepAlpha ? 'image/webp' : 'image/jpeg'
  const blob = await new Promise(resolve => canvas.toBlob(resolve, type, 0.88))
  if (!blob) return file
  const ext = keepAlpha ? 'webp' : 'jpg'
  return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.' + ext, { type })
}

function ColorDot({ color, size = 16 }) {
  const hex = resolveColor(color)
  const isDark = isDarkColor(hex)
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
function DropzoneArea({ images, setImages, variantColors, disabled = false }) {
  const inputRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)
  const [, setCropQueue] = useState([])
  const [cropping, setCropping] = useState(null)

  const processFiles = (incoming) => {
    const okType = isImageFile
    const okSize = f => f.size <= MAX_IMAGE_MB * 1024 * 1024
    const rejectedType = incoming.filter(f => !okType(f))
    const rejectedSize = incoming.filter(f => okType(f) && !okSize(f))
    if (rejectedType.length) toast.error(`${rejectedType.length} file(s) skipped — they are not photos`)
    if (rejectedSize.length) toast.error(`${rejectedSize.length} file(s) skipped — each photo must be under ${MAX_IMAGE_MB} MB`)
    let files = incoming.filter(f => okType(f) && okSize(f))
    const room = MAX_IMAGES - images.length
    if (files.length > room) { toast.error(`You can add at most ${MAX_IMAGES} images per product`); files = files.slice(0, Math.max(0, room)) }
    if (!files.length) return
    ;(async () => {
      const decodable = []
      for (const f of files) {
        const bmp = await decodeImage(f)
        if (bmp) { bmp.close?.(); decodable.push(f) }
        else {
          const hint = variantColors.length === 1 ? variantColors[0] : ''
          setImages(prev => [...prev, { file: f, preview: PLACEHOLDER_PREVIEW, color: hint, id: Date.now() + Math.random() }])
          toast('Preview is not available for this photo type — it will be converted when you save', { icon: 'ℹ️' })
        }
      }
      queueForCrop(decodable)
    })()
  }

  const queueForCrop = (files) => {
    if (!files.length) return
    const newQueue = files.map(f => ({ src: URL.createObjectURL(f), filename: f.name, rawFile: f }))
    setCropQueue(prev => [...prev, ...newQueue])
    if (!cropping) {
      const first = newQueue[0]
      setCropping(first)
      setCropQueue(prev => prev.filter(q => q.filename !== first.filename))
    }
  }

  const handleDrop = (e) => {
    if (disabled) return
    e.preventDefault(); setIsDragging(false)
    const files = Array.from(e.dataTransfer.files).filter(isImageFile)
    if (files.length) processFiles(files)
  }

  const handleFileInput = (e) => {
    if (disabled) return
    const files = Array.from(e.target.files)
    if (files.length) processFiles(files)
    e.target.value = ''
  }

  const finalizeCrop = (file, preview) => {
    const colorHint = variantColors.length === 1 ? variantColors[0] : ''
    setImages(prev => [...prev, { file, preview, color: colorHint, id: Date.now() + Math.random() }])
    advanceCropQueue()
  }

  const skipCrop = () => {
    if (cropping) {
      const f = cropping.rawFile
      const colorHint = variantColors.length === 1 ? variantColors[0] : ''
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
        onDragOver={(e) => { if (!disabled) { e.preventDefault(); setIsDragging(true) } }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 ${
          disabled ? 'border-stone-200 bg-stone-50 cursor-not-allowed opacity-50' : 
          isDragging ? 'border-stone-900 bg-stone-50 scale-[1.01] cursor-pointer' : 'border-stone-200 hover:border-stone-400 hover:bg-stone-50/50 cursor-pointer'
        }`}
      >
        <input ref={inputRef} type="file" multiple accept="image/*" onChange={handleFileInput} className="hidden" disabled={disabled} />
        <Upload size={22} className={`mx-auto mb-2 transition-colors ${isDragging ? 'text-stone-900' : 'text-stone-300'}`} />
        <p className="text-xs text-stone-500 font-medium">
          {disabled ? 'Image upload disabled during processing' : 
          isDragging ? 'Drop to add images' : 'Drag & drop images, or click to browse'}
        </p>
        <p className="text-[10px] text-stone-400 mt-1">Any photo — JPG, PNG, WEBP, HEIC and more. Big photos are shrunk automatically.</p>
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
                      <select
                        value={variantColors.includes(img.color) ? img.color : ''}
                        onChange={e => updateImageColor(img.id, e.target.value)}
                        title="Show this photo when this colour is selected"
                        className="text-[8px] text-stone-600 bg-transparent w-full outline-none font-mono"
                        onClick={e => e.stopPropagation()}
                        onPointerDown={e => e.stopPropagation()}
                      >
                        <option value="">Any colour</option>
                        {variantColors.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); !disabled && removeImage(img.id) }}
                      disabled={disabled}
                      className={`absolute top-1 right-1 transition-opacity bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center z-10 ${disabled ? 'opacity-30 cursor-not-allowed' : 'opacity-0 group-hover:opacity-100'}`}
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

function VariantBuilder({ colorGroups, setColorGroups, images, disabled = false }) {
  const addColorGroup = () => {
    if (disabled) return
    setColorGroups(prev => [
      ...prev,
      { id: Date.now(), color: '', imageId: '', sizes: buildEmptySizes() },
    ])
  }

  const removeColorGroup = (id) => {
    if (disabled) return
    setColorGroups(prev => prev.filter(g => g.id !== id))
  }

  const updateGroup = (id, field, value) => {
    if (disabled) return
    setColorGroups(prev => prev.map(g => g.id === id ? { ...g, [field]: value } : g))
  }

  const updateSize = (id, size, stock) => {
    if (disabled) return
    setColorGroups(prev =>
      prev.map(g => g.id === id ? { ...g, sizes: { ...g.sizes, [size]: stock } } : g)
    )
  }

  const toggleSize = (id, size) => {
    if (disabled) return
    setColorGroups(prev =>
      prev.map(g => {
        if (g.id !== id) return g
        const current = g.sizes[size]
        // If currently empty string (disabled), enable with '0'; if has value, clear it
        const next = current === '' ? '0' : ''
        return { ...g, sizes: { ...g.sizes, [size]: next } }
      })
    )
  }

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
          disabled={disabled}
          className="text-[10px] border border-stone-200 hover:border-stone-800 text-stone-500 hover:text-stone-800 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
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
                    disabled={disabled}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-stone-300 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
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
function slugPart(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 14)
}

function flattenColorGroups(colorGroups, productName = '') {
  const flat = []
  for (const group of colorGroups) {
    for (const size of SIZES) {
      if (group.sizes[size] === '') continue // not selected
      flat.push({
        size,
        color: group.color,
        colorHex: resolveColor(group.color),
        stock: Number(group.sizes[size] || 0),
        imageId: group.imageId || '',
        sku: [slugPart(productName) || 'DOME', slugPart(group.color), size].filter(Boolean).join('-'),
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

// ─── Size Chart ────────────────────────────────────────────────────────────────

function buildDefaultSizeChart() {
  return {
    ...DEFAULT_SIZE_CHART,
    rows: [] // Start with no sizes for new products
  };
}

function inflateSizeChart(raw) {
  if (!raw) return buildDefaultSizeChart();
  
  const normalized = normalizeSizeChartFromAPI(raw);
  
  // Only use the sizes that exist in the product's size chart
  // Don't add default sizes automatically
  const rows = normalized.rows.map(r => ({
    ...r,
    active: true // All loaded sizes should be active by default
  }));
  
  return {
    ...normalized,
    rows
  };
}

// ─── Size Chart Preview Modal ───────────────────────────────────────────────────
function SizeChartPreview({ sizeChart, onClose }) {
  const activeRows = getActiveRows(sizeChart);
  
  if (!sizeChart || !sizeChart.enabled) return null;

  return (
    <motion.div
      className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[60]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col"
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <Ruler size={15} className="text-stone-400" />
            <h3 className="text-sm font-semibold text-stone-800">Size Guide Preview</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-stone-100 transition-colors">
            <X size={16} className="text-stone-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {sizeChart.unit && (
            <p className="text-[10px] font-mono text-stone-400 uppercase tracking-wider mb-3">
              All measurements in {sizeChart.unit === 'in' ? 'inches' : 'centimetres'}
            </p>
          )}
          
          {activeRows.length > 0 && sizeChart.measurements.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-stone-100">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-100">
                    <th className="px-4 py-2.5 text-left text-[9px] font-mono text-stone-400 uppercase tracking-wider w-14 sticky left-0 bg-stone-50">
                      Size
                    </th>
                    {sizeChart.measurements.map(m => (
                      <th key={m.key} className="px-4 py-2.5 text-left text-[9px] font-mono text-stone-400 uppercase tracking-wider min-w-[90px] whitespace-nowrap">
                        {m.label}
                        <span className="ml-1 normal-case text-stone-300 font-normal">({sizeChart.unit})</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {activeRows.map((row, i) => (
                    <tr key={row.size} className={i % 2 === 0 ? 'bg-white' : 'bg-stone-50/40'}>
                      <td className="px-4 py-2.5 sticky left-0 bg-inherit">
                        <span className="font-mono text-[10px] font-semibold text-stone-700">
                          {row.size}
                        </span>
                      </td>
                      {sizeChart.measurements.map(m => (
                        <td key={m.key} className="px-4 py-2.5 text-stone-500 font-mono text-[11px]">
                          {row.values?.[m.key] || '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertCircle size={32} className="text-stone-300 mx-auto mb-3" />
              <p className="text-sm text-stone-400">No size chart data to display</p>
            </div>
          )}
          
          <p className="text-[10px] text-stone-400 mt-4 leading-relaxed">
            Measurements are approximate. If you're between sizes, we recommend sizing up.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ChartImageField({ sizeChart, setSizeChart, disabled }) {
  const ref = useRef(null)
  const shown = sizeChart.imageFile ? sizeChart.imagePreview : sizeChart.image?.url
  const pick = (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (!isImageFile(f)) return toast.error('Choose an image file')
    if (f.size > MAX_IMAGE_MB * 1024 * 1024) return toast.error(`Image must be under ${MAX_IMAGE_MB} MB`)
    setSizeChart(sc => ({ ...sc, imageFile: f, imagePreview: URL.createObjectURL(f) }))
  }
  const clear = () => setSizeChart(sc => ({ ...sc, imageFile: null, imagePreview: '', image: null }))
  return (
    <div>
      <p className="text-[9px] font-mono text-stone-400 uppercase tracking-wider mb-1.5">SIZE CHART IMAGE (OPTIONAL)</p>
      <div className="flex items-center gap-3">
        {shown ? (
          <div className="relative w-20 h-24 rounded-lg overflow-hidden border border-stone-200 bg-stone-50">
            <img src={shown} alt="Size chart" className="w-full h-full object-contain" onError={e => { e.currentTarget.style.opacity = 0.2 }} />
            <button type="button" onClick={clear} disabled={disabled} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center"><X size={8} /></button>
          </div>
        ) : null}
        <div>
          <input ref={ref} type="file" accept="image/*" onChange={pick} className="hidden" disabled={disabled} />
          <button type="button" disabled={disabled} onClick={() => ref.current?.click()}
            className="px-3 py-2 rounded-lg text-[11px] border border-dashed border-stone-300 text-stone-600 hover:border-stone-700 transition-colors flex items-center gap-2">
            <Upload size={12} /> {shown ? 'Replace image' : 'Upload your own size chart image'}
          </button>
          <p className="text-[10px] text-stone-400 mt-1.5 max-w-xs">Shown to customers in the size guide. Use it instead of the table, or together with it.</p>
        </div>
      </div>
    </div>
  )
}

function SizeChartBuilder({ sizeChart, setSizeChart, disabled = false }) {
  const [open, setOpen] = useState(false)
  const [newMeasurement, setNewMeasurement] = useState('')
  const [newSize, setNewSize] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [presetConfirm, setPresetConfirm] = useState(null)

  const toggle = () => {
    if (disabled) return
    setSizeChart(sc => ({ ...sc, enabled: !sc.enabled }))
    if (!sizeChart.enabled) setOpen(true)
  }

  const setUnit = (unit) => {
    if (disabled) return
    setSizeChart(sc => ({ ...sc, unit }))
  }

  const addMeasurement = () => {
    if (disabled) return
    const validation = validateMeasurementName(newMeasurement, sizeChart.measurements);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }
    
    if (getMeasurementCount(sizeChart) >= 10) {
      toast.error('Maximum 10 measurement columns allowed');
      return;
    }

    setSizeChart(sc => ({
      ...sc,
      measurements: [...sc.measurements, { key: validation.key, label: validation.label }],
      rows: sc.rows.map(r => ({ ...r, values: { ...r.values, [validation.key]: '' } })),
    }))
    setNewMeasurement('')
  }

  const removeMeasurement = (key) => {
    if (disabled) return
    if (getMeasurementCount(sizeChart) <= 1 && sizeChart.enabled) {
      toast.error('Cannot remove the final measurement column');
      return;
    }
    
    setSizeChart(sc => ({
      ...sc,
      measurements: sc.measurements.filter(m => m.key !== key),
      rows: sc.rows.map(r => { 
        const { [key]: _, ...rest } = r.values; 
        return { ...r, values: rest } 
      }),
    }))
  }

  const handlePresetClick = (presetKey) => {
    if (disabled) return
    const hasData = getMeasurementCount(sizeChart) > 0 || getActiveSizeCount(sizeChart) > 0;
    
    if (hasData) {
      setPresetConfirm(presetKey);
    } else {
      const updated = applyPreset(presetKey, sizeChart);
      setSizeChart(updated);
    }
  }

  const confirmPreset = () => {
    if (disabled) return
    if (presetConfirm) {
      const updated = applyPreset(presetConfirm, sizeChart);
      setSizeChart(updated);
      setPresetConfirm(null);
    }
  }

  const addSize = () => {
    if (disabled) return
    
    // Split input by comma or space to support multiple sizes
    const sizesToAdd = newSize.split(/[, ]+/).filter(s => s.trim()).map(s => s.trim())
    
    if (sizesToAdd.length === 0) return
    
    // Validate each size
    const validSizes = []
    for (const size of sizesToAdd) {
      const validation = validateSizeName(size, sizeChart.rows)
      if (!validation.valid) {
        toast.error(`${size}: ${validation.error}`)
        return
      }
      validSizes.push(validation.size)
    }
    
    // Check total size limit
    if (sizeChart.rows.length + validSizes.length > 20) {
      toast.error('Maximum 20 sizes allowed')
      return
    }

    // Add all valid sizes
    setSizeChart(sc => ({
      ...sc,
      rows: [
        ...sc.rows,
        ...validSizes.map(size => ({
          size,
          active: true,
          values: sizeChart.measurements.reduce((acc, m) => ({ ...acc, [m.key]: '' }), {})
        }))
      ]
    }))
    setNewSize('')
  }

  const removeSize = (size) => {
    if (disabled) return
    setSizeChart(sc => ({
      ...sc,
      rows: sc.rows.filter(r => r.size !== size)
    }))
  }

  const toggleRow = (size) => {
    if (disabled) return
    setSizeChart(sc => ({
      ...sc,
      rows: sc.rows.map(r => r.size === size ? { ...r, active: !r.active } : r),
    }))
  }

  const updateCell = (size, key, value) => {
    if (disabled) return
    setSizeChart(sc => ({
      ...sc,
      rows: sc.rows.map(r =>
        r.size === size ? { ...r, values: { ...r.values, [key]: value } } : r
      ),
    }))
  }

  const activeRows = getActiveRows(sizeChart);
  const measurementCount = getMeasurementCount(sizeChart);
  const activeSizeCount = getActiveSizeCount(sizeChart);

  return (
    <section className="border border-stone-200 rounded-xl overflow-hidden">
      {/* Header toggle */}
      <div
        className={`flex items-center justify-between px-4 py-3 cursor-pointer select-none transition-colors ${sizeChart.enabled ? 'bg-stone-900' : 'bg-stone-50 hover:bg-stone-100'}`}
        onClick={toggle}
      >
        <div className="flex items-center gap-2">
          <Ruler size={13} className={sizeChart.enabled ? 'text-stone-300' : 'text-stone-400'} />
          <span className={`text-[10px] font-mono tracking-widest uppercase ${sizeChart.enabled ? 'text-white' : 'text-stone-500'}`}>
            SIZE CHART
          </span>
          {sizeChart.enabled && (activeSizeCount > 0 || measurementCount > 0) && (
            <span className="bg-white/20 text-white text-[9px] font-mono px-2 py-0.5 rounded-full">
              {activeSizeCount} sizes · {measurementCount} measurements
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {sizeChart.enabled && (
            <>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); setShowPreview(true) }}
                className="text-stone-300 hover:text-white transition-colors p-0.5"
                title="Preview"
              >
                <Eye size={14} />
              </button>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
                className="text-stone-300 hover:text-white transition-colors p-0.5"
              >
                {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </>
          )}
          <div className={`w-8 h-4 rounded-full relative transition-colors pointer-events-none ${sizeChart.enabled ? 'bg-white/30' : 'bg-stone-200'}`}>
            <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-all ${sizeChart.enabled ? 'left-4' : 'left-0.5'}`} />
          </div>
        </div>
      </div>

      {/* Body */}
      <AnimatePresence>
        {sizeChart.enabled && open && (
          <motion.div
            key="chart-body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-4 border-t border-stone-100">

              {/* Unit + Presets */}
              <div className="flex items-start gap-4 flex-wrap">
                <div>
                  <p className="text-[9px] font-mono text-stone-400 uppercase tracking-wider mb-1.5">UNIT</p>
                  <div className="flex gap-1">
                    {['in', 'cm'].map(u => (
                      <button key={u} type="button" onClick={() => setUnit(u)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-all ${sizeChart.unit === u ? 'bg-stone-900 text-white border-stone-900' : 'border-stone-200 text-stone-500 hover:border-stone-400'}`}>
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-mono text-stone-400 uppercase tracking-wider mb-1.5">QUICK PRESETS</p>
                  <div className="flex gap-1 flex-wrap">
                    {Object.keys(SIZE_CHART_PRESETS).map(key => (
                      <button key={key} type="button" onClick={() => handlePresetClick(key)}
                        className={`px-2.5 py-1.5 rounded-lg text-[10px] border transition-colors ${sizeChart.preset === key ? 'bg-stone-900 text-white border-stone-900' : 'border-stone-200 text-stone-500 hover:border-stone-800 hover:text-stone-800'}`}>
                        {SIZE_CHART_PRESETS[key].label || key}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <ChartImageField sizeChart={sizeChart} setSizeChart={setSizeChart} disabled={disabled} />

              {/* Measurement columns */}
              <div>
                <p className="text-[9px] font-mono text-stone-400 uppercase tracking-wider mb-2">MEASUREMENT COLUMNS</p>
                <div className="flex gap-1.5 flex-wrap items-center">
                  {sizeChart.measurements.map(m => (
                    <span key={m.key} className="flex items-center gap-1 bg-stone-100 text-stone-700 text-[10px] font-mono px-2 py-1 rounded-lg">
                      {m.label}
                      <button type="button" onClick={() => removeMeasurement(m.key)}
                        className="text-stone-400 hover:text-red-500 transition-colors leading-none">
                        <X size={9} />
                      </button>
                    </span>
                  ))}
                  <div className="flex items-center gap-1">
                    <input
                      value={newMeasurement}
                      onChange={e => setNewMeasurement(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addMeasurement() } }}
                      placeholder="Add column…"
                      className="border border-dashed border-stone-300 rounded-lg px-2.5 py-1 text-[10px] outline-none focus:border-stone-600 w-32 transition-colors"
                    />
                    <button type="button" onClick={addMeasurement}
                      className="w-6 h-6 rounded-lg bg-stone-900 text-white flex items-center justify-center hover:bg-stone-700 transition-colors flex-shrink-0">
                      <Plus size={10} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Size row toggles */}
              <div>
                <p className="text-[9px] font-mono text-stone-400 uppercase tracking-wider mb-2">SIZES IN CHART</p>
                <div className="flex gap-1.5 flex-wrap items-center">
                  {sizeChart.rows.map(row => (
                    <span key={row.size} className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => toggleRow(row.size)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-all ${row.active ? 'bg-stone-900 text-white border-stone-900' : 'border-stone-200 text-stone-400 hover:border-stone-400'}`}>
                        {row.size}
                      </button>
                      {row.size && !DEFAULT_SIZES.includes(row.size) && (
                        <button
                          type="button"
                          onClick={() => removeSize(row.size)}
                          className="text-stone-400 hover:text-red-500 transition-colors leading-none"
                        >
                          <X size={9} />
                        </button>
                      )}
                    </span>
                  ))}
                  <div className="flex items-center gap-1">
                    <input
                      value={newSize}
                      onChange={e => setNewSize(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSize() } }}
                      placeholder="XL, XXL…"
                      className="border border-dashed border-stone-300 rounded-lg px-2.5 py-1 text-[10px] outline-none focus:border-stone-600 w-28 transition-colors"
                    />
                    <button type="button" onClick={addSize}
                      className="w-6 h-6 rounded-lg bg-stone-900 text-white flex items-center justify-center hover:bg-stone-700 transition-colors flex-shrink-0">
                      <Plus size={10} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Table */}
              {activeRows.length > 0 && sizeChart.measurements.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-stone-100">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-stone-50 border-b border-stone-100">
                        <th className="px-3 py-2.5 text-left text-[9px] font-mono text-stone-400 uppercase tracking-wider w-12 sticky left-0 bg-stone-50">
                          SIZE
                        </th>
                        {sizeChart.measurements.map(m => (
                          <th key={m.key} className="px-3 py-2.5 text-left text-[9px] font-mono text-stone-400 uppercase tracking-wider min-w-[88px] whitespace-nowrap">
                            {m.label}
                            <span className="ml-1 normal-case text-stone-300 font-normal">({sizeChart.unit})</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-50">
                      {activeRows.map(row => (
                        <tr key={row.size} className="hover:bg-stone-50/50 transition-colors">
                          <td className="px-3 py-2 sticky left-0 bg-white">
                            <span className="font-mono text-[10px] font-semibold text-stone-700 bg-stone-100 px-2 py-1 rounded">
                              {row.size}
                            </span>
                          </td>
                          {sizeChart.measurements.map(m => (
                            <td key={m.key} className="px-2 py-1.5">
                              <input
                                type="text"
                                value={row.values?.[m.key] ?? ''}
                                onChange={e => updateCell(row.size, m.key, e.target.value)}
                                placeholder="—"
                                className="w-full border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs text-center outline-none focus:border-stone-800 transition-colors bg-white"
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-[10px] text-stone-300 italic text-center py-4 border border-dashed border-stone-100 rounded-xl">
                  {activeRows.length === 0 ? 'Enable at least one size above' : 'Add at least one measurement column'}
                </p>
              )}

              <p className="text-[9px] text-stone-300 font-mono">
                Leave cells blank to hide them. Size chart is saved with the product.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preview Modal */}
      <AnimatePresence>
        {showPreview && (
          <SizeChartPreview sizeChart={sizeChart} onClose={() => setShowPreview(false)} />
        )}
      </AnimatePresence>

      {/* Preset Confirmation Modal */}
      <AnimatePresence>
        {presetConfirm && (
          <motion.div
            className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[65]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-xl shadow-2xl w-full max-w-md p-5"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
            >
              <div className="flex items-start gap-3 mb-4">
                <AlertCircle size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-stone-800 mb-1">Apply Preset?</h4>
                  <p className="text-xs text-stone-500">
                    This will replace your current measurement columns. Existing measurement values will be preserved where possible.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setPresetConfirm(null)}
                  className="flex-1 py-2 text-xs border border-stone-200 rounded-lg text-stone-600 hover:bg-stone-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmPreset}
                  className="flex-1 py-2 text-xs bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors"
                >
                  Apply {presetConfirm}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

// ─── Bulk Upload Modal ──────────────────────────────────────────────────────────
function BulkUploadModal({ onClose, onImport }) {
  const [rows, setRows] = useState([
    { name: '', price: '', category: 'tops', color: 'Black', size: 'M', stock: '10', image: '' },
  ])
  const [csvText, setCsvText] = useState('')
  const [tab, setTab] = useState('manual')
  const [importing, setImporting] = useState(false)

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

  const handleImport = async () => {
    const valid = rows.filter(r => r.name && r.price)
    if (!valid.length) { toast.error('No valid rows'); return }
    try {
      setImporting(true)
      await onImport(valid)
      onClose()
    } finally { setImporting(false) }
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
                 name,price,category,color,size,stock,image<br />
                 "Classic Tee",2999,tops,Black,M,50,https://example.com/tee.jpg<br />
                 "Slim Jogger",4999,bottoms,Navy,L,25,https://example.com/jogger.jpg
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
              <div className="grid grid-cols-7 gap-2 text-[9px] font-mono text-stone-400 uppercase tracking-wider px-1 min-w-[760px]">
                {['Name', 'Price', 'Category', 'Color', 'Size', 'Stock', 'Image URL'].map(h => <div key={h}>{h}</div>)}
              </div>
              {rows.map((row, i) => (
                <div key={i} className="grid grid-cols-7 gap-2 items-center min-w-[760px]">
                  {['name', 'price', 'category', 'color', 'size', 'stock', 'image'].map(field => (
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
              <button type="button" onClick={() => setRows([...rows, { name: '', price: '', category: 'tops', color: 'Black', size: 'M', stock: '10', image: '' }])}
                className="text-xs text-stone-500 hover:text-stone-800 border border-dashed border-stone-200 rounded-lg py-2 w-full hover:border-stone-400 transition-colors">
                + Add Row
              </button>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-stone-100 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 text-xs border border-stone-200 rounded-lg text-stone-500 hover:bg-stone-50 transition-colors">Cancel</button>
          <button disabled={importing} onClick={handleImport} className="flex-1 py-2 text-xs bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors disabled:opacity-50">
            {importing ? 'Importing...' : `Import ${rows.filter(r => r.name).length} Products`}
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

  const [form, setForm] = useState({
    name: '', description: '', price: '', comparePrice: '', category: 'tops', gender: 'unisex',
    material: '', isFeatured: false, isBestSeller: false,
    ...(product || {}),
    isNew: product ? Boolean(product.newArrival) : true,
  })

  const [images, setImages] = useState(
    product?.images?.map((img, i) => ({
      file: null, preview: img.url, publicId: img.publicId || '', color: img.color || '', id: i, isExisting: true,
    })) || []
  )

  // Color-grouped variant state
  const [colorGroups, setColorGroups] = useState(
    product?.variants?.length
      ? inflateToColorGroups(product.variants)
      : [{ id: Date.now(), color: '', imageId: '', sizes: buildEmptySizes() }]
  )

  // Size chart state
  const [sizeChart, setSizeChart] = useState(
    product?.sizeChart ? inflateSizeChart(product.sizeChart) : buildDefaultSizeChart()
  )

  // Keep the size chart in step with the product: choose the chart type from the name/category
  // (hoodie, jacket, trousers ...) until the owner starts typing values, and make sure there
  // is a row for every size being sold.
  const autoPreset = useRef('')
  useEffect(() => {
    const sc = sizeChart
    if (!sc.enabled) return
    let next = sc
    const guess = guessPreset(form.name, form.category)
    const untouched = !sc.rows.some(r => Object.values(r.values || {}).some(v => String(v).trim()))
    const canAuto = !sc.measurements.length || (sc.preset === autoPreset.current && untouched)
    if (guess && canAuto && sc.preset !== guess) {
      next = applyPreset(guess, next)
      autoPreset.current = guess
    }
    const sizes = SIZES.filter(sz => colorGroups.some(g => g.sizes[sz] !== ''))
    const have = new Set(next.rows.map(r => r.size))
    const missing = sizes.filter(sz => !have.has(sz))
    if (missing.length) {
      const blank = Object.fromEntries(next.measurements.map(m => [m.key, '']))
      const rows = [...next.rows, ...missing.map(size => ({ size, active: true, values: { ...blank } }))]
      const order = sz => { const i = SIZES.indexOf(sz); return i < 0 ? 99 : i }
      rows.sort((x, y) => order(x.size) - order(y.size))
      next = { ...next, rows }
    }
    if (next !== sc) setSizeChart(next)
  }, [sizeChart, colorGroups, form.category, form.name])

  // Loading states
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 })
  const [submitStatus, setSubmitStatus] = useState('') // 'uploading', 'creating', 'updating', ''

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Prevent duplicate submissions
    if (isSubmitting) return

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

    if (!images.length) {
      toast.error('Add at least one product image')
      return
    }

    const flatVariants = flattenColorGroups(colorGroups, form.name)

    // A colour group may point at a specific photo — make that the photo's colour.
    const colorByImageId = new Map(colorGroups.filter(g => g.imageId && g.color.trim()).map(g => [String(g.imageId), g.color.trim()]))
    const colorOf = (img) => colorByImageId.get(String(img.id)) || img.color || ''

    // Count new images to upload
    const newImages = images.filter(img => img.file && !img.isExisting)
    const totalImagesToUpload = newImages.length

    try {
      setIsSubmitting(true)
      
      // Step 1: Upload images if there are any new ones
      let finalImagesToUse = [...images]
      
      if (totalImagesToUpload > 0) {
        setSubmitStatus('uploading')
        setUploadProgress({ current: 0, total: totalImagesToUpload })

        const uploadFormData = new FormData()
        for (const img of newImages) {
          const ready = await shrinkImage(img.file)
          uploadFormData.append('images', ready)
        }

        
        const uploadResponse = await api.post('/upload', uploadFormData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            const progress = Math.round((progressEvent.loaded * 100) / (progressEvent.total || progressEvent.loaded || 1))
            setUploadProgress({ current: progress, total: totalImagesToUpload })
          }
        })


        // Update images with uploaded URLs
        const uploadedUrls = uploadResponse.data.data?.images || uploadResponse.data.images || []
        const updatedImages = [...images]
        let urlIndex = 0
        
        updatedImages.forEach((img, index) => {
          if (img.file && !img.isExisting && uploadedUrls[urlIndex]) {
            updatedImages[index] = {
              ...img,
              preview: uploadedUrls[urlIndex].url || uploadedUrls[urlIndex],
              publicId: uploadedUrls[urlIndex].publicId || '',
              file: null,
              isExisting: true
            }
            urlIndex++
          }
        })
        
        setImages(updatedImages)
        setUploadProgress({ current: 100, total: totalImagesToUpload })
        finalImagesToUse = updatedImages
      }

     
    // Step 2: Prepare product data with final image URLs
      // Size chart image (optional): upload now so it is saved with the product
      let chartImage = sizeChart.image?.url ? { url: sizeChart.image.url, publicId: sizeChart.image.publicId || '' } : null
      if (sizeChart.enabled && sizeChart.imageFile) {
        setSubmitStatus('uploading')
        setUploadProgress({ current: 0, total: 1 })
        const chartForm = new FormData()
        chartForm.append('images', await shrinkImage(sizeChart.imageFile))
        const chartRes = await api.post('/upload', chartForm, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (p) => setUploadProgress({ current: Math.round((p.loaded * 100) / (p.total || p.loaded || 1)), total: 1 })
        })
        const up = chartRes.data.data?.images?.[0]
        if (!up?.url) throw new Error('Could not upload the size chart image')
        chartImage = { url: up.url, publicId: up.publicId || '' }
        setSizeChart(sc => ({ ...sc, image: chartImage, imageFile: null, imagePreview: '' }))
      }

      setSubmitStatus(isEdit ? 'updating' : 'creating')
      
      const formData = new FormData()
      Object.entries(form).forEach(([k, v]) => {
        if (typeof v === 'object') return
        formData.append(k, v)
      })
      formData.append('variants', JSON.stringify(flatVariants))

      // Size chart — always send, so disabling it actually persists
      const chartPayload = prepareSizeChartForAPI(sizeChart)
      if (chartPayload.enabled) {
        const availableSizes = new Set(flatVariants.map(variant => variant.size))
        chartPayload.rows = chartPayload.rows.filter(row => availableSizes.has(row.size))
        const tableHasData = chartPayload.rows.some(r => chartPayload.measurements.some(m => String(r.values?.[m.key] ?? '').trim()))
        if (chartImage && !tableHasData) {
          // image-only size chart
          chartPayload.measurements = []
          chartPayload.rows = []
        } else {
          if (!chartPayload.measurements.length) {
            throw new Error('Add at least one measurement column to the size chart, or upload a size chart image')
          }
          if (!chartPayload.rows.length) {
            throw new Error('The size chart needs at least one row matching an enabled product size')
          }
          const empty = chartPayload.rows.find(r => !chartPayload.measurements.some(m => String(r.values?.[m.key] ?? '').trim()))
          if (empty) {
            throw new Error(`Size chart: add at least one measurement for size ${empty.size}`)
          }
        }
        if (chartImage) chartPayload.image = chartImage
      }
      formData.append('sizeChart', JSON.stringify(chartPayload))

      // Add image URLs instead of files (since they're already uploaded)
      // Always send images to preserve order and ensure consistency
      const finalImages = finalImagesToUse.map(img => ({
        url: img.preview,
        publicId: img.publicId || '',
        alt: form.name || product?.name || '',
        color: colorOf(img)
      }))
      formData.append('images', JSON.stringify(finalImages))


      // Step 3: Send product create/update request
      isEdit 
        ? await productAPI.update(product._id, formData)
        : await productAPI.create(formData)


      // Step 4: Success - refresh and close
      qc.invalidateQueries(['admin-products'])
      toast.success(isEdit ? 'Product updated successfully!' : 'Product created successfully!')
      onClose()

    } catch (error) {
      console.error('❌ Error during product operation:', error)
      
      // Handle different error types
      if (error.response) {
        // Backend error
        const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Operation failed'
        toast.error(errorMessage)
      } else if (error.request) {
        // Network error
        toast.error('Network error. Please check your connection and try again.')
      } else {
        // Other error
        toast.error(error.message || 'An unexpected error occurred')
      }
      
      // Keep modal open and preserve form data for retry
    } finally {
      setIsSubmitting(false)
      setSubmitStatus('')
      setUploadProgress({ current: 0, total: 0 })
    }
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
          <button 
            onClick={onClose} 
            disabled={isSubmitting}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-stone-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X size={15} className="text-stone-400" />
          </button>
        </div>

        {/* LOADING OVERLAY */}
        <AnimatePresence>
          {isSubmitting && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-white/90 backdrop-blur-sm z-20 flex flex-col items-center justify-center"
            >
              <Loader2 size={32} className="animate-spin text-stone-900 mb-4" />
              <p className="text-sm font-medium text-stone-900 mb-2">
                {submitStatus === 'uploading' && 'Uploading images...'}
                {submitStatus === 'creating' && 'Creating product...'}
                {submitStatus === 'updating' && 'Updating product...'}
              </p>
              {submitStatus === 'uploading' && uploadProgress.total > 0 && (
                <p className="text-xs text-stone-500 font-mono">
                  {uploadProgress.total} image{uploadProgress.total !== 1 ? 's' : ''} · {uploadProgress.current}%
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {/* ── Images ── */}
          <section>
            <label className="block text-[10px] font-mono text-stone-400 tracking-widest uppercase mb-2">Images</label>
            <DropzoneArea
              images={images}
              setImages={setImages}
              variantColors={colorGroups.map(g => g.color).filter(Boolean)}
              disabled={isSubmitting}
            />
          </section>

          {/* ── Basic Info ── */}
          <section className="space-y-3">
            <label className="block text-[10px] font-mono text-stone-400 tracking-widest uppercase">Details</label>
            <input
              placeholder="Product Name *"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              required
              disabled={isSubmitting}
            />
            <textarea
              placeholder="Description *"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-stone-800 transition-colors resize-none h-20 disabled:opacity-50 disabled:cursor-not-allowed"
              required
              disabled={isSubmitting}
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number" placeholder="Price *"
                value={form.price}
                onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting}
              />
              <input
                type="number" placeholder="Compare Price"
                value={form.comparePrice}
                onChange={e => setForm(f => ({ ...f, comparePrice: e.target.value }))}
                className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting}
              />
            </div>
            <select
              value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              className="w-full border border-stone-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-stone-800 transition-colors bg-white disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
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
            disabled={isSubmitting}
          />

          {/* ── Size Chart ── */}
          <SizeChartBuilder sizeChart={sizeChart} setSizeChart={setSizeChart} disabled={isSubmitting} />

          {/* ── Flags ── */}
          <section className="flex gap-6">
            {[
              { key: 'isFeatured', label: 'Featured', color: 'bg-amber-400' },
              { key: 'isNew', label: 'New Arrival', color: 'bg-blue-500' },
              { key: 'isBestSeller', label: 'Best Seller', color: 'bg-emerald-500' },
            ].map(({ key, label, color }) => (
              <label key={key} className={`flex items-center gap-2 cursor-pointer group ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <div
                  onClick={() => !isSubmitting && setForm(f => ({ ...f, [key]: !f[key] }))}
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
            <button 
              type="button" 
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-2.5 text-sm border border-stone-200 rounded-xl text-stone-600 hover:bg-stone-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="flex-1 py-2.5 text-sm bg-stone-900 text-white rounded-xl hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 size={16} className="animate-spin" />}
              {isSubmitting ? 'Processing...' : isEdit ? 'Save Changes' : 'Create Product'}
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
  const [stockFilter, setStockFilter] = useState('')
  const [modal, setModal] = useState(null)
  const [bulkModal, setBulkModal] = useState(false)
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['admin-products', page, search, stockFilter],
    queryFn: () =>
      productAPI.getAdminAll({ page, limit: 15, search: search || undefined, stock: stockFilter || undefined })
        .then(r => r.data.data),
  })

  const activeMutation = useMutation({
    mutationFn: ({ id, isActive }) => productAPI.setActive(id, isActive),
    onSuccess: (_response, values) => { qc.invalidateQueries({ queryKey: ['admin-products'] }); qc.invalidateQueries({ queryKey: ['admin-stats'] }); toast.success(values.isActive ? 'Product restored' : 'Product archived') },
    onError: error => toast.error(error.response?.data?.message || 'Could not update product')
  })

  const handleBulkImport = async (rows) => {
    try {
      const { data: result } = await productAPI.bulkCreate(rows)
      qc.invalidateQueries({ queryKey: ['admin-products'] })
      toast.success(`${result.data.count} products imported`)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Bulk import failed')
      throw error
    }
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
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} placeholder="Search product name, slug, or SKU..." className="input-field pl-9 text-sm" />
        </div>
        <select value={stockFilter} onChange={e => { setStockFilter(e.target.value); setPage(1) }} className="input-field bg-white sm:w-44 text-xs">
          <option value="">All inventory</option><option value="low">Low stock (1–10)</option><option value="out">Out of stock</option>
        </select>
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
                        <button title="Edit variant inventory" onClick={() => setModal(p)} className={`text-xs font-mono underline decoration-dotted ${p.totalStock === 0 ? 'text-red-500' : p.totalStock <= 10 ? 'text-amber-600' : 'text-green-600'}`}>
                          {p.totalStock ?? '—'}
                        </button>
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
                          {p.newArrival && <span className="badge bg-blue-50 text-blue-600">New</span>}
                          {p.isBestSeller && <span className="badge bg-emerald-50 text-emerald-700">Best seller</span>}
                          {p.sizeChart?.enabled && <span className="badge bg-purple-50 text-purple-700">Size chart</span>}
                          {!p.isActive && <span className="badge bg-red-50 text-red-500">Inactive</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setModal(p)} className="p-1.5 hover:bg-stone-100 rounded transition-colors text-stone-400 hover:text-obsidian-900">
                            <Edit size={13} />
                          </button>
                          {p.isActive ? <button title="Archive product" onClick={() => { if (confirm('Archive this product?')) activeMutation.mutate({ id: p._id, isActive: false }) }}
                            className="p-1.5 hover:bg-red-50 rounded transition-colors text-stone-400 hover:text-red-500">
                            <Trash2 size={13} />
                          </button> : <button title="Restore product" onClick={() => activeMutation.mutate({ id: p._id, isActive: true })} className="p-1.5 hover:bg-green-50 rounded text-stone-400 hover:text-green-600"><RotateCcw size={13} /></button>}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>

      {(data?.pagination?.pages || 0) > 1 && <div className="flex items-center justify-between">
        <p className="text-xs text-stone-400">Page {page} of {data.pagination.pages}</p>
        <div className="flex gap-2"><button disabled={page === 1} onClick={() => setPage(value => value - 1)} className="btn-outline text-xs disabled:opacity-40">Previous</button><button disabled={page >= data.pagination.pages} onClick={() => setPage(value => value + 1)} className="btn-outline text-xs disabled:opacity-40">Next</button></div>
      </div>}

      {/* Modals */}
      <AnimatePresence>
        {modal && <ProductFormModal product={modal === 'new' ? null : modal} onClose={() => setModal(null)} />}
        {bulkModal && <BulkUploadModal onClose={() => setBulkModal(false)} onImport={handleBulkImport} />}
      </AnimatePresence>
    </div>
  )
}
