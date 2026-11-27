import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion'
import { ArrowRight, ArrowLeft, Truck } from 'lucide-react'
import { formatPrice } from '../../utils/helpers'
import { enhance } from '../../utils/cloudinary'
import { resolveColor } from '../../utils/colors'

const SLIDE_MS = 7000
const EASE = [0.16, 1, 0.3, 1]

const pad = n => String(n).padStart(2, '0')

function RotatingBadge() {
  return (
    <motion.svg viewBox="0 0 120 120" className="w-24 h-24 md:w-28 md:h-28" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 24, ease: 'linear' }} aria-hidden="true">
      <defs><path id="badge-circle" d="M60,60 m-44,0 a44,44 0 1,1 88,0 a44,44 0 1,1 -88,0" /></defs>
      <text fontSize="8.5" fill="#D4AF7A" fontFamily="DM Mono, monospace">
        <textPath href="#badge-circle" textLength="270" lengthAdjust="spacing">MADE IN NEPAL • DESIGNED IN KATHMANDU •</textPath>
      </text>
      <circle cx="60" cy="60" r="3" fill="#C9A84C" />
    </motion.svg>
  )
}

export default function ProductHero({ products = [], loading = false, fallback = null }) {
  const reduceMotion = useReducedMotion()
  const [bad, setBad] = useState(() => new Set())
  const [active, setActive] = useState(0)
  const [shot, setShot] = useState(0)
  const [paused, setPaused] = useState(false)
  const stage = useRef(null)

  // products with at least one photo that actually loads
  const slides = useMemo(() => products
    .map(p => ({ ...p, photos: (p.images || []).filter(i => i?.url && !bad.has(i.url)) }))
    .filter(p => p.photos.length > 0)
    .slice(0, 4), [products, bad])

  // warm the cache and drop dead links (deleted Cloudinary files) before they are shown
  useEffect(() => {
    products.slice(0, 4).forEach(p => (p.images || []).slice(0, 4).forEach(img => {
      if (!img?.url) return
      const probe = new Image()
      probe.onerror = () => setBad(prev => (prev.has(img.url) ? prev : new Set(prev).add(img.url)))
      probe.src = enhance(img.url, { w: 1100, h: 1375 })
    }))
  }, [products])

  useEffect(() => { if (active >= slides.length) setActive(0) }, [slides.length, active])
  useEffect(() => { setShot(0) }, [active])

  useEffect(() => {
    if (reduceMotion || paused || slides.length < 2) return
    const t = setTimeout(() => setActive(a => (a + 1) % slides.length), SLIDE_MS)
    return () => clearTimeout(t)
  }, [active, paused, reduceMotion, slides.length])

  // mouse parallax
  const mx = useMotionValue(0), my = useMotionValue(0)
  const sx = useSpring(mx, { stiffness: 80, damping: 18 }), sy = useSpring(my, { stiffness: 80, damping: 18 })
  const imgX = useTransform(sx, [-1, 1], [-14, 14]), imgY = useTransform(sy, [-1, 1], [-10, 10])
  const chipX = useTransform(sx, [-1, 1], [18, -18]), chipY = useTransform(sy, [-1, 1], [12, -12])
  const onMove = (e) => {
    const r = stage.current?.getBoundingClientRect()
    if (!r) return
    mx.set(((e.clientX - r.left) / r.width) * 2 - 1)
    my.set(((e.clientY - r.top) / r.height) * 2 - 1)
  }

  if (loading) return <section className="bg-obsidian-900 h-[calc(100svh-7rem)] min-h-[680px] max-h-[900px] flex items-center justify-center"><div className="w-8 h-8 border-2 border-gold-400/30 border-t-gold-400 rounded-full animate-spin" /></section>
  if (!slides.length) return fallback
  const p = slides[Math.min(active, slides.length - 1)]
  const photo = p.photos[Math.min(shot, p.photos.length - 1)]
  const discount = p.comparePrice > p.price ? Math.round((1 - p.price / p.comparePrice) * 100) : 0
  const colors = [...new Map((p.variants || []).map(v => [v.color, v])).values()].slice(0, 7)
  const blurb = (p.shortDescription || p.description || '').replace(/\s+/g, ' ').slice(0, 120)
  const go = (dir) => setActive(a => (a + dir + slides.length) % slides.length)

  return (
    <section
      className="relative overflow-hidden bg-obsidian-900 text-cream-50 h-[calc(100svh-7rem)] min-h-[680px] max-h-[900px]"
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel" aria-label="Featured products"
    >
      {/* atmosphere */}
      <div className="absolute inset-0 bg-[radial-gradient(55%_60%_at_78%_45%,rgba(201,168,76,0.20),transparent_70%)]" />
      <div className="absolute inset-0 bg-noise opacity-60 mix-blend-overlay" />
      <AnimatePresence mode="wait">
        <motion.div key={`ghost-${p._id}`} initial={{ opacity: 0, x: -40 }} animate={{ opacity: 0.05, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.9, ease: EASE }}
          className="hidden lg:block absolute -left-6 bottom-20 font-display italic font-light text-[15rem] leading-none whitespace-nowrap pointer-events-none select-none">
          {pad(active + 1)}
        </motion.div>
      </AnimatePresence>

      <div className="relative h-full page-container grid lg:grid-cols-12 gap-6 items-center">
        {/* ── product stage ── */}
        <div className="lg:col-span-7 lg:col-start-6 lg:order-2 absolute inset-0 lg:static lg:h-[88%]">
          <div ref={stage} onMouseMove={onMove} className="relative h-full lg:ml-auto lg:max-w-[640px] lg:aspect-[4/5] lg:h-auto lg:max-h-full">
            <div className="hidden lg:block absolute -inset-3 -translate-x-4 translate-y-4 border border-gold-400/40" />
            <div className="relative h-full overflow-hidden bg-obsidian-800">
              <AnimatePresence mode="popLayout">
                <motion.img
                  key={`${p._id}-${photo.url}`}
                  src={enhance(photo.url, { w: 1100, h: 1375 })}
                  alt={`${p.name}${photo.color ? ` in ${photo.color}` : ''}`}
                  initial={{ opacity: 0, scale: 1.12 }} animate={{ opacity: 1, scale: 1.04 }} exit={{ opacity: 0 }}
                  transition={{ opacity: { duration: 0.8 }, scale: { duration: SLIDE_MS / 1000 + 1, ease: 'linear' } }}
                  style={{ x: reduceMotion ? 0 : imgX, y: reduceMotion ? 0 : imgY }}
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={() => setBad(prev => new Set(prev).add(photo.url))}
                  fetchpriority="high"
                />
              </AnimatePresence>
              <div className="absolute inset-0 bg-gradient-to-t from-obsidian-900/85 via-obsidian-900/10 to-obsidian-900/20 lg:from-obsidian-900/50 lg:via-transparent lg:to-transparent" />
              <div className="absolute inset-0 lg:hidden bg-gradient-to-r from-obsidian-900/60 to-transparent" />
            </div>

            {/* floating chips (desktop) */}
            <motion.div style={{ x: reduceMotion ? 0 : chipX, y: reduceMotion ? 0 : chipY }} className="hidden lg:block">
              <div className="absolute -left-14 top-12 backdrop-blur-md bg-obsidian-900/70 border border-white/10 px-4 py-3">
                <p className="font-mono text-[9px] tracking-[0.25em] uppercase text-gold-300 mb-1">{pad(active + 1)} / {pad(slides.length)}</p>
                <p className="font-display text-xl leading-none">{formatPrice(p.price)}</p>
                {discount > 0 && <p className="text-[11px] text-stone-400 mt-1"><span className="line-through">{formatPrice(p.comparePrice)}</span> <span className="text-red-400 ml-1">−{discount}%</span></p>}
              </div>
              <div className="absolute -right-3 bottom-20"><RotatingBadge /></div>
            </motion.div>

            {/* photo gallery rail */}
            {p.photos.length > 1 && (
              <div className="absolute right-3 top-3 lg:right-4 lg:top-4 flex lg:flex-col gap-2 z-10" role="tablist" aria-label="Product photos">
                {p.photos.slice(0, 5).map((img, i) => (
                  <button key={img.url} role="tab" aria-selected={i === shot} aria-label={`Photo ${i + 1}`} onClick={() => setShot(i)}
                    className={`w-11 h-14 lg:w-12 lg:h-16 overflow-hidden border transition-all ${i === shot ? 'border-gold-400 opacity-100 scale-105' : 'border-white/20 opacity-60 hover:opacity-100'}`}>
                    <img src={enhance(img.url, { w: 120, h: 160 })} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── copy ── */}
        <div className="lg:col-span-5 lg:order-1 relative z-10 self-end lg:self-center pb-24 lg:pb-0">
          <AnimatePresence mode="wait">
            <motion.div key={p._id} initial="hidden" animate="show" exit="exit"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.09, delayChildren: 0.1 } }, exit: { opacity: 0, transition: { duration: 0.25 } } }}>
              <motion.p variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }} transition={{ duration: 0.6, ease: EASE }}
                className="font-mono text-[11px] tracking-[0.35em] uppercase text-gold-300 mb-4 flex items-center gap-3">
                <span className="w-8 h-px bg-gold-400" /> {p.newArrival ? 'New in' : 'Featured'} · {p.category}
              </motion.p>
              <motion.h1 variants={{ hidden: { opacity: 0, y: 40 }, show: { opacity: 1, y: 0 } }} transition={{ duration: 0.9, ease: EASE }}
                className="font-display font-light text-5xl sm:text-6xl xl:text-7xl leading-[0.95] mb-5 text-balance">
                {p.name}
              </motion.h1>
              {blurb && (
                <motion.p variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }} transition={{ duration: 0.6, ease: EASE }}
                  className="text-sm md:text-base text-cream-100/70 max-w-md leading-relaxed mb-6">{blurb}</motion.p>
              )}

              <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }} transition={{ duration: 0.6, ease: EASE }} className="flex items-center gap-5 mb-7 flex-wrap">
                <div className="flex items-baseline gap-3 lg:hidden">
                  <span className="font-display text-3xl">{formatPrice(p.price)}</span>
                  {discount > 0 && <span className="text-xs text-stone-400 line-through">{formatPrice(p.comparePrice)}</span>}
                  {discount > 0 && <span className="badge bg-red-500 text-white">−{discount}%</span>}
                </div>
                {colors.length > 0 && (
                  <div className="flex items-center gap-2" aria-label={`${colors.length} colours`}>
                    {colors.map(v => (
                      <span key={v.color} title={v.color} className="w-5 h-5 rounded-full ring-1 ring-white/30 ring-offset-2 ring-offset-obsidian-900" style={{ background: resolveColor(v.color, v.colorHex) }} />
                    ))}
                    <span className="font-mono text-[10px] tracking-widest uppercase text-stone-400 ml-1">{new Set((p.variants || []).map(v => v.color)).size} colours</span>
                  </div>
                )}
              </motion.div>

              <motion.div variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }} transition={{ duration: 0.6, ease: EASE }} className="flex flex-col sm:flex-row gap-3">
                <Link to={`/products/${p.slug}`} className="btn-gold flex items-center justify-center gap-3 text-xs group">
                  Shop this piece <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                </Link>
                <Link to="/shop" className="border border-cream-50/35 text-cream-50 px-8 py-3.5 text-xs tracking-widest uppercase font-body hover:bg-white/10 transition-colors text-center">
                  Shop all
                </Link>
              </motion.div>

              <motion.p variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }} className="hidden md:flex items-center gap-2 mt-6 text-[11px] text-stone-400">
                <Truck size={13} className="text-gold-400" /> Cash on delivery · FonePay QR · all 77 districts
              </motion.p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ── slide selector ── */}
      {slides.length > 1 && (
        <div className="absolute bottom-6 left-0 right-0 z-20">
          <div className="page-container flex items-center gap-3 lg:gap-4">
            <button onClick={() => go(-1)} aria-label="Previous product" className="w-9 h-9 border border-white/25 flex items-center justify-center hover:bg-white/10 transition-colors"><ArrowLeft size={14} /></button>
            <button onClick={() => go(1)} aria-label="Next product" className="w-9 h-9 border border-white/25 flex items-center justify-center hover:bg-white/10 transition-colors"><ArrowRight size={14} /></button>
            <div className="flex-1 flex gap-2 lg:gap-3 lg:max-w-[22rem] xl:max-w-md">
              {slides.map((s, i) => (
                <button key={s._id} onClick={() => setActive(i)} aria-label={`Show ${s.name}`} aria-current={i === active}
                  className="group flex-1 min-w-0 text-left">
                  <div className="h-0.5 bg-white/20 overflow-hidden">
                    {i === active && !reduceMotion
                      ? <motion.div key={`${active}-${paused}`} className="h-full bg-gold-400" initial={{ width: 0 }} animate={{ width: paused ? '35%' : '100%' }} transition={{ duration: paused ? 0 : SLIDE_MS / 1000, ease: 'linear' }} />
                      : <div className={`h-full bg-gold-400 ${i === active ? 'w-full' : 'w-0'}`} />}
                  </div>
                  <p className={`hidden sm:block mt-2 text-[10px] tracking-[0.15em] uppercase truncate transition-colors ${i === active ? 'text-cream-50' : 'text-stone-500 group-hover:text-stone-300'}`}>{s.name}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
