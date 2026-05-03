import { useRef, useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useMotionValue,
  useInView,
  AnimatePresence,
} from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { productAPI } from '../services/api'
import ProductCard from '../components/product/ProductCard'
import { ProductCardSkeleton } from '../components/common/Skeletons'
import PageTransition from '../components/common/PageTransition'

/* ─────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────── */
const CATEGORIES = [
  {
    label: 'Tops',
    slug: 'tops',
    desc: 'Refined essentials',
    img: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800&q=85',
    num: '01',
  },
  {
    label: 'Outerwear',
    slug: 'outerwear',
    desc: 'Statement pieces',
    img: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800&q=85',
    num: '02',
  },
  {
    label: 'Bottoms',
    slug: 'bottoms',
    desc: 'Modern silhouettes',
    img: 'https://images.unsplash.com/photo-1704253800605-9d5becf3b0d0?w=800&q=85',
    num: '03',
  },
  {
    label: 'Accessories',
    slug: 'accessories',
    desc: 'Finishing touches',
    img: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&q=85',
    num: '04',
  },
]

const FEATURES = [
  { icon: '✦', title: 'Free Shipping', desc: 'On orders over NPR 5,000' },
  { icon: '◈', title: 'Sustainable', desc: 'Eco-conscious production' },
  { icon: '⬡', title: 'Made in Nepal', desc: 'Authentic Himalayan craft' },
  { icon: '↺', title: 'Easy Returns', desc: '30-day hassle-free returns' },
]

/* ─────────────────────────────────────────────
   HOOKS
───────────────────────────────────────────── */
function useMagneticCursor() {
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const smoothX = useSpring(mouseX, { stiffness: 60, damping: 18 })
  const smoothY = useSpring(mouseY, { stiffness: 60, damping: 18 })

  useEffect(() => {
    const move = (e) => {
      mouseX.set(e.clientX)
      mouseY.set(e.clientY)
    }
    window.addEventListener('mousemove', move)
    return () => window.removeEventListener('mousemove', move)
  }, [mouseX, mouseY])

  return { smoothX, smoothY }
}

/* ─────────────────────────────────────────────
   CUSTOM CURSOR
───────────────────────────────────────────── */
function CustomCursor() {
  const { smoothX, smoothY } = useMagneticCursor()
  const [hovered, setHovered] = useState(false)

  useEffect(() => {
    const on = () => setHovered(true)
    const off = () => setHovered(false)
    const els = document.querySelectorAll('a, button, [data-cursor]')
    els.forEach((el) => {
      el.addEventListener('mouseenter', on)
      el.addEventListener('mouseleave', off)
    })
    return () => {
      els.forEach((el) => {
        el.removeEventListener('mouseenter', on)
        el.removeEventListener('mouseleave', off)
      })
    }
  }, [])

  return (
    <>
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-[9999] mix-blend-difference"
        style={{ x: smoothX, y: smoothY, translateX: '-50%', translateY: '-50%' }}
      >
        <motion.div
          animate={{ width: hovered ? 48 : 8, height: hovered ? 48 : 8, opacity: hovered ? 0.6 : 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="rounded-full bg-cream-50"
        />
      </motion.div>
    </>
  )
}

/* ─────────────────────────────────────────────
   SPLIT TEXT ANIMATION
───────────────────────────────────────────── */
function SplitText({ text, className, delay = 0, as: Tag = 'span' }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })

  const words = text.split(' ')
  return (
    <Tag ref={ref} className={className} aria-label={text}>
      {words.map((word, wi) => (
        <span key={wi} className="inline-block overflow-hidden mr-[0.28em]">
          <motion.span
            className="inline-block"
            initial={{ y: '105%', opacity: 0 }}
            animate={inView ? { y: 0, opacity: 1 } : {}}
            transition={{
              duration: 0.9,
              delay: delay + wi * 0.07,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            {word}
          </motion.span>
        </span>
      ))}
    </Tag>
  )
}

/* ─────────────────────────────────────────────
   MARQUEE BAR
───────────────────────────────────────────── */
function MarqueeBar() {
  const items = [
    'New Arrivals',
    'Himalayan Craft',
    'Premium Quality',
    'Free Shipping Over NPR 5000',
    'Sustainable Fashion',
    'Made in Nepal',
  ]
  return (
    <div className="bg-obsidian-900 py-3.5 overflow-hidden border-b border-white/5">
      <motion.div
        className="flex whitespace-nowrap"
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
      >
        {[...items, ...items, ...items, ...items].map((item, i) => (
          <span key={i} className="inline-flex items-center gap-5 mx-7">
            <span className="w-[3px] h-[3px] bg-gold-400 rounded-full opacity-70" />
            <span className="font-mono text-[9px] tracking-[0.35em] uppercase text-cream-100/50">
              {item}
            </span>
          </span>
        ))}
      </motion.div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   HERO SECTION
───────────────────────────────────────────── */
function HeroSection() {
  const heroRef = useRef(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })

  const bgY = useTransform(scrollYProgress, [0, 1], ['0%', '35%'])
  const bgScale = useTransform(scrollYProgress, [0, 1], [1, 1.08])
  const contentY = useTransform(scrollYProgress, [0, 1], ['0%', '18%'])
  const opacity = useTransform(scrollYProgress, [0, 0.65], [1, 0])
  const lineWidth = useTransform(scrollYProgress, [0, 0.3], ['0%', '100%'])

  return (
    <section
      ref={heroRef}
      className="relative h-[100svh] min-h-[640px] overflow-hidden bg-obsidian-950"
    >
      {/* Parallax background */}
      <motion.div className="absolute inset-0" style={{ y: bgY, scale: bgScale }}>
        <img
          src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=2000&q=90"
          alt=""
          className="w-full h-[120%] object-cover object-center"
          fetchpriority="high"
        />
      </motion.div>

      {/* Overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-obsidian-950/10 via-obsidian-950/30 to-obsidian-950/90" />
      <div className="absolute inset-0 bg-gradient-to-r from-obsidian-950/60 via-obsidian-950/10 to-transparent" />

      {/* Noise grain texture */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: '180px 180px',
        }}
      />

      {/* Content */}
      <motion.div
        style={{ y: contentY, opacity }}
        className="absolute inset-0 flex flex-col justify-end page-container pb-16 md:pb-24"
      >
        {/* Tag line */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center gap-3 mb-8"
        >
          <motion.div
            className="h-[1px] bg-gold-400 origin-left"
            style={{ width: lineWidth }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 1.4, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
          />
          <span className="font-mono text-[9px] tracking-[0.4em] uppercase text-gold-300">
            Spring 2025 · New Collection
          </span>
        </motion.div>

        {/* Headline */}
        <div className="mb-6 overflow-hidden">
          <SplitText
            text="Born From"
            as="h1"
            className="block font-display text-[clamp(3.5rem,10vw,8.5rem)] font-light text-cream-50 leading-[0.92]"
            delay={0.5}
          />
          <SplitText
            text="Mountains"
            as="h1"
            className="block font-display text-[clamp(3.5rem,10vw,8.5rem)] font-light italic text-gold-300 leading-[0.92]"
            delay={0.65}
          />
        </div>

        {/* Sub copy + CTA row */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 1.0, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col md:flex-row md:items-end gap-8 md:gap-16"
        >
          <p className="font-body text-sm text-cream-100/60 max-w-xs leading-relaxed">
            Clothing crafted for those who move between worlds. Premium Himalayan heritage meets contemporary design.
          </p>

          <div className="flex items-center gap-5">
            <Link to="/shop?filter=new">
              <motion.div
                whileHover={{ scale: 1.04, x: 5 }}
                whileTap={{ scale: 0.97 }}
                className="btn-gold inline-flex items-center gap-3 text-[10px] tracking-widest"
              >
                Explore Collection
                <ArrowRight size={13} />
              </motion.div>
            </Link>
            <Link
              to="/shop"
              className="font-mono text-[10px] tracking-[0.3em] uppercase text-cream-100/50 hover:text-cream-100 transition-colors duration-300 underline underline-offset-4 decoration-cream-100/20"
            >
              Shop All
            </Link>
          </div>
        </motion.div>

        {/* Bottom stats bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.3 }}
          className="flex gap-10 mt-14 pt-8 border-t border-white/10"
        >
          {[['200+', 'Products'], ['4', 'Collections'], ['100%', 'Himalayan']].map(([val, label]) => (
            <div key={label}>
              <div className="font-display text-xl font-light text-cream-50">{val}</div>
              <div className="font-mono text-[9px] tracking-[0.25em] uppercase text-cream-100/40 mt-0.5">
                {label}
              </div>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* Scroll progress line */}
      <motion.div
        className="absolute right-8 top-1/2 -translate-y-1/2 h-24 w-[1px] bg-cream-100/15 origin-top hidden md:block"
        style={{ scaleY: scrollYProgress }}
      />
    </section>
  )
}

/* ─────────────────────────────────────────────
   CATEGORIES SECTION — horizontal editorial
───────────────────────────────────────────── */
function CategoriesSection() {
  const [hovered, setHovered] = useState(null)
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section ref={ref} className="page-container py-28">
      {/* Header */}
      <div className="flex items-baseline justify-between mb-16">
        <div>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
            className="section-subtitle"
          >
            Explore
          </motion.p>
          <SplitText
            text="Shop by Category"
            as="h2"
            className="section-title"
            delay={0.1}
          />
        </div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.6 }}
          className="hidden md:flex items-center gap-2 font-mono text-[9px] tracking-[0.3em] uppercase text-obsidian-900/40"
        >
          {CATEGORIES.length} categories
        </motion.div>
      </div>

      {/* Category grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {CATEGORIES.map((cat, i) => (
          <motion.div
            key={cat.slug}
            initial={{ opacity: 0, y: 40 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.15 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            <Link
              to={`/shop?category=${cat.slug}`}
              className="group block relative"
              onMouseEnter={() => setHovered(cat.slug)}
              onMouseLeave={() => setHovered(null)}
            >
              {/* Image container */}
              <div className="relative overflow-hidden aspect-[3/4]">
                <motion.img
                  src={cat.img}
                  alt={cat.label}
                  animate={{ scale: hovered === cat.slug ? 1.08 : 1 }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />

                {/* Gradient overlay */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-t from-obsidian-950/80 via-transparent to-transparent"
                  animate={{ opacity: hovered === cat.slug ? 0.9 : 0.5 }}
                  transition={{ duration: 0.4 }}
                />

                {/* Category number — top left */}
                <div className="absolute top-4 left-4">
                  <span className="font-mono text-[10px] tracking-[0.2em] text-cream-50/40">
                    {cat.num}
                  </span>
                </div>

                {/* Text block */}
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <div className="overflow-hidden">
                    <motion.h3
                      animate={{ y: hovered === cat.slug ? -2 : 0 }}
                      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                      className="font-display text-2xl md:text-3xl font-light text-cream-50 leading-tight"
                    >
                      {cat.label}
                    </motion.h3>
                  </div>
                  <motion.div
                    animate={{
                      opacity: hovered === cat.slug ? 1 : 0,
                      y: hovered === cat.slug ? 0 : 6,
                    }}
                    transition={{ duration: 0.35 }}
                    className="flex items-center justify-between mt-2"
                  >
                    <span className="font-mono text-[9px] tracking-[0.25em] uppercase text-cream-100/60">
                      {cat.desc}
                    </span>
                    <ArrowUpRight size={14} className="text-gold-300" />
                  </motion.div>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────
   PRODUCTS SECTION (reusable)
───────────────────────────────────────────── */
function ProductsSection({ title, subtitle, products, isLoading, viewAllLink, bg = 'bg-cream-100' }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })

  return (
    <section className={`${bg} py-24`}>
      <div className="page-container" ref={ref}>
        {/* Header */}
        <div className="flex items-end justify-between mb-14">
          <div>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5 }}
              className="section-subtitle"
            >
              {subtitle}
            </motion.p>
            <SplitText text={title} as="h2" className="section-title" delay={0.05} />
          </div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Link
              to={viewAllLink}
              className="hidden md:flex items-center gap-2 font-mono text-[9px] tracking-[0.3em] uppercase text-obsidian-900/50 hover:text-obsidian-900 transition-colors duration-300 group"
            >
              View All
              <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform duration-200" />
            </Link>
          </motion.div>
        </div>

        {/* Grid */}
        <div className="product-grid">
          {isLoading
            ? Array(8).fill(0).map((_, i) => <ProductCardSkeleton key={i} />)
            : (products || []).slice(0, 8).map((p, i) => (
                <motion.div
                  key={p._id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.7, delay: 0.05 * i, ease: [0.16, 1, 0.3, 1] }}
                >
                  <ProductCard product={p} index={i} />
                </motion.div>
              ))}
        </div>

        <div className="text-center mt-10 md:hidden">
          <Link to={viewAllLink} className="btn-outline text-xs inline-flex">
            View All
          </Link>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────
   EDITORIAL INTERLUDE — full-bleed image + text
───────────────────────────────────────────── */
function EditorialInterlude() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const imgY = useTransform(scrollYProgress, [0, 1], ['-8%', '8%'])

  return (
    <section ref={ref} className="relative overflow-hidden bg-obsidian-950 py-0">
      <div className="grid md:grid-cols-2 min-h-[540px]">
        {/* Image side */}
        <div className="relative overflow-hidden">
          <motion.img
            src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=900&q=85"
            alt="Summer Collection"
            style={{ y: imgY }}
            className="w-full h-full object-cover object-top scale-[1.15]"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-obsidian-950/80 md:block hidden" />
        </div>

        {/* Text side */}
        <div className="flex flex-col justify-center px-8 md:px-16 py-20 bg-obsidian-950">
          <motion.p
            initial={{ opacity: 0, x: 20 }}
            animate={inView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="font-mono text-[9px] tracking-[0.4em] uppercase text-gold-400 mb-6"
          >
            The Story
          </motion.p>

          <SplitText
            text="Crafted Where Earth Meets Sky"
            as="h2"
            className="font-display text-4xl md:text-5xl font-light text-cream-50 leading-tight mb-8"
            delay={0.3}
          />

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.7 }}
            className="font-body text-sm text-cream-100/50 leading-relaxed max-w-sm mb-10"
          >
            Each piece carries the soul of the Himalayas — woven by artisans who have passed their craft through generations, now reimagined for the modern wanderer.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.9 }}
          >
            <Link to="/about">
              <motion.div
                whileHover={{ x: 6 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className="inline-flex items-center gap-3 font-mono text-[10px] tracking-[0.3em] uppercase text-gold-300 border-b border-gold-400/30 pb-1 hover:border-gold-400 transition-colors duration-300"
              >
                Our Story
                <ArrowRight size={12} />
              </motion.div>
            </Link>
          </motion.div>

          {/* Decorative rule */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={inView ? { scaleX: 1 } : {}}
            transition={{ duration: 1.2, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-gold-400/30 to-transparent origin-left hidden md:block"
          />
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────
   FEATURES STRIP
───────────────────────────────────────────── */
function FeaturesStrip() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })

  return (
    <section className="border-y border-stone-200/70" ref={ref}>
      <div className="page-container py-14">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-stone-200/60">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : {}}
              transition={{ duration: 0.5, delay: 0.1 * i }}
              className="bg-cream-50 px-8 py-10 text-center group hover:bg-obsidian-900 transition-colors duration-500"
            >
              <div className="font-mono text-xl text-obsidian-900/30 mb-4 group-hover:text-gold-400 transition-colors duration-500">
                {f.icon}
              </div>
              <h4 className="font-body font-medium text-sm text-obsidian-900 mb-1 group-hover:text-cream-50 transition-colors duration-500">
                {f.title}
              </h4>
              <p className="text-xs text-stone-400 group-hover:text-cream-100/50 transition-colors duration-500">
                {f.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────
   NEWSLETTER STRIP
───────────────────────────────────────────── */
function NewsletterStrip() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault()
      if (!email) return
      setSent(true)
    },
    [email]
  )

  return (
    <section ref={ref} className="bg-obsidian-900 py-20 overflow-hidden relative">
      {/* Decorative lines */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={inView ? { scaleX: 1 } : {}}
        transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
        className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-gold-400/40 to-transparent origin-left"
      />

      <div className="page-container">
        <div className="max-w-lg mx-auto text-center">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="font-mono text-[9px] tracking-[0.4em] uppercase text-gold-400 mb-5"
          >
            Stay Connected
          </motion.p>

          <SplitText
            text="Join the Inner Circle"
            as="h2"
            className="font-display text-3xl md:text-4xl font-light text-cream-50 mb-4"
            delay={0.3}
          />

          <motion.p
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="font-body text-xs text-cream-100/40 leading-relaxed mb-10"
          >
            Early access to new arrivals, exclusive offers, and stories from the mountains.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.85 }}
          >
            <AnimatePresence mode="wait">
              {sent ? (
                <motion.p
                  key="thanks"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="font-mono text-[10px] tracking-[0.3em] uppercase text-gold-300"
                >
                  ✦ Thank you — welcome to the circle
                </motion.p>
              ) : (
                <motion.form
                  key="form"
                  onSubmit={handleSubmit}
                  className="flex gap-0 max-w-sm mx-auto"
                >
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="flex-1 bg-white/5 border border-white/10 text-cream-50 text-xs px-5 py-3.5 focus:outline-none focus:border-gold-400/50 transition-colors placeholder:text-cream-100/20 font-body"
                  />
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    className="bg-gold-400 text-obsidian-900 px-6 py-3.5 font-mono text-[9px] tracking-[0.25em] uppercase hover:bg-gold-300 transition-colors"
                  >
                    Join
                  </motion.button>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────── */
export default function HomePage() {
  const { data: featuredData, isLoading: featuredLoading } = useQuery({
    queryKey: ['featured-products'],
    queryFn: () => productAPI.getFeatured().then((r) => r.data.data.products),
  })
  const { data: newData, isLoading: newLoading } = useQuery({
    queryKey: ['new-arrivals'],
    queryFn: () => productAPI.getNewArrivals().then((r) => r.data.data.products),
  })

  return (
    <PageTransition>
      {/* Custom cursor — desktop only */}
      <div className="hidden md:block">
        <CustomCursor />
      </div>

      <HeroSection />
      <MarqueeBar />
      <CategoriesSection />

      <ProductsSection
        title="Featured Pieces"
        subtitle="Curated"
        products={featuredData}
        isLoading={featuredLoading}
        viewAllLink="/shop?filter=featured"
        bg="bg-cream-100"
      />

      <EditorialInterlude />

      <ProductsSection
        title="New Arrivals"
        subtitle="Just In"
        products={newData}
        isLoading={newLoading}
        viewAllLink="/shop?filter=new"
        bg="bg-white"
      />

      <FeaturesStrip />
      <NewsletterStrip />
    </PageTransition>
  )
}