import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, ChevronDown, Truck, Banknote, QrCode, RotateCcw } from 'lucide-react'
import { productAPI } from '../services/api'
import ProductCard from '../components/product/ProductCard'
import { ProductCardSkeleton } from '../components/common/Skeletons'
import ScrollReveal, { ScrollRevealGroup, ScrollRevealItem } from '../components/common/ScrollReveal'
import PageTransition from '../components/common/PageTransition'
import ProductHero from '../components/home/ProductHero'

const CATEGORIES = [
  { label: 'Tops', slug: 'tops', desc: 'Refined essentials', img: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800&q=80' },
  { label: 'Outerwear', slug: 'outerwear', desc: 'Statement pieces', img: 'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=800&q=80' },
  { label: 'Bottoms', slug: 'bottoms', desc: 'Modern silhouettes', img: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&q=80' },
  // { label: 'Accessories', slug: 'accessories', desc: 'Finishing touches', img: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600&q=80' },
]

function HeroSection() {
  const heroRef = useRef(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '30%'])
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0])

  return (
    <section ref={heroRef} className="relative h-[100svh] min-h-[600px] overflow-hidden">
      {/* Parallax BG */}
      <motion.div className="absolute inset-0" style={{ y }}>
        <img
          src="https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=2200&q=85"
          alt="Hero"
          className="w-full h-[115%] object-cover object-center"
        />
      </motion.div>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-obsidian-900/30 via-obsidian-900/20 to-obsidian-900/70" />
      <div className="absolute inset-0 bg-gradient-to-r from-obsidian-900/40 via-transparent to-transparent" />

      {/* Content */}
      <motion.div
        style={{ opacity }}
        className="absolute inset-0 flex flex-col justify-center page-container"
      >
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="font-mono text-[11px] tracking-[0.4em] uppercase text-gold-300 mb-5">
            New Collection · Now Available
          </p>
          <h1 className="font-display text-6xl sm:text-7xl md:text-8xl xl:text-9xl font-light text-cream-50 leading-none mb-4">
            Born From<br />
            <em className="italic text-gold-300">Mountains</em>
          </h1>
          <p className="font-body text-sm md:text-base text-cream-100/70 max-w-md mt-6 mb-10 leading-relaxed">
            Clothing made for those who move between worlds. Designed in Kathmandu, proudly Nepali-made, built for every day.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link to="/shop">
              <motion.div
                whileHover={{ scale: 1.03, x: 4 }}
                whileTap={{ scale: 0.98 }}
                className="btn-gold flex items-center gap-3 text-xs"
              >
                Explore Collection
                <ArrowRight size={14} />
              </motion.div>
            </Link>
            <Link to="/shop">
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="border border-cream-50/40 text-cream-50 px-8 py-3.5 text-xs tracking-widest uppercase font-body hover:bg-white/10 transition-colors"
              >
                Shop All
              </motion.div>
            </Link>
          </div>
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      >
        <span className="font-mono text-[9px] tracking-[0.3em] uppercase text-cream-50/50">Scroll</span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
        >
          <ChevronDown size={16} className="text-cream-50/50" />
        </motion.div>
      </motion.div>
    </section>
  )
}

function MarqueeBar() {
  const items = ['New Arrivals', 'Made in Nepal', 'Delivery to all 77 districts', 'Cash on Delivery', 'Pay by FonePay QR', 'Free delivery over NPR 5,000']
  return (
    <div className="bg-obsidian-900 py-4 overflow-hidden border-y border-obsidian-800">
      <div className="flex animate-marquee whitespace-nowrap">
        {[...items, ...items].map((item, i) => (
          <span key={i} className="inline-flex items-center gap-4 mx-8">
            <span className="w-1 h-1 bg-gold-400 rounded-full" />
            <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-cream-100/60">{item}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

export default function HomePage() {
  const { data: featuredData, isLoading: featuredLoading } = useQuery({
    queryKey: ['featured-products'],
    queryFn: () => productAPI.getFeatured().then(r => r.data.data.products)
  })
  const { data: newData, isLoading: newLoading } = useQuery({
    queryKey: ['new-arrivals'],
    queryFn: () => productAPI.getNewArrivals().then(r => r.data.data.products)
  })

  return (
    <PageTransition>
      <ProductHero products={featuredData} loading={featuredLoading} fallback={<HeroSection />} />
      <MarqueeBar />

      {/* Categories */}
      <section className="page-container py-24">
        <ScrollReveal>
          <div className="text-center mb-14">
            <p className="section-subtitle">Explore</p>
            <h2 className="section-title">Shop by Category</h2>
          </div>
        </ScrollReveal>

        <ScrollRevealGroup className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-6xl mx-auto">
          {CATEGORIES.map((cat) => (
            <ScrollRevealItem key={cat.slug}>
              <Link to={`/shop?category=${cat.slug}`} className="group block">
                <div className="relative overflow-hidden aspect-[3/4] mb-3">
                  <motion.img
                    src={cat.img}
                    alt={cat.label}
                    whileHover={{ scale: 1.07 }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-obsidian-900/70 via-obsidian-900/10 to-transparent" />
                  <div className="absolute inset-0 flex flex-col items-center justify-end p-5 text-center">
                    <motion.div
                      initial={{ y: 8, opacity: 0.7 }}
                      whileHover={{ y: 0, opacity: 1 }}
                      className="text-cream-50"
                    >
                      <h3 className="font-display text-2xl font-light">{cat.label}</h3>
                      <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-cream-50/70 mt-1">{cat.desc}</p>
                    </motion.div>
                  </div>
                </div>
              </Link>
            </ScrollRevealItem>
          ))}
        </ScrollRevealGroup>
      </section>

      {/* Featured Products */}
      <section className="bg-cream-100 py-24">
        <div className="page-container">
          <ScrollReveal>
            <div className="flex items-end justify-between mb-14">
              <div>
                <p className="section-subtitle">Curated</p>
                <h2 className="section-title">Featured Pieces</h2>
              </div>
              <Link to="/shop" className="hidden md:flex items-center gap-2 text-xs tracking-[0.15em] uppercase font-body text-obsidian-900/60 hover:text-obsidian-900 transition-colors group">
                View All <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </ScrollReveal>

          <div className="product-grid">
            {featuredLoading
              ? Array(8).fill(0).map((_, i) => <ProductCardSkeleton key={i} />)
              : (featuredData || []).map((p, i) => <ProductCard key={p._id} product={p} index={i} />)
            }
          </div>

          <div className="text-center mt-12 md:hidden">
            <Link to="/shop" className="btn-outline text-xs inline-flex">View All</Link>
          </div>
        </div>
      </section>

      {/* Brand Statement */}
      <section className="relative py-32 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1445205170230-053b83016050?w=1800&q=80"
            alt="Brand"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-obsidian-900/75" />
        </div>
        <ScrollReveal className="relative page-container text-center">
          <p className="font-mono text-[10px] tracking-[0.5em] uppercase text-gold-400 mb-6">Our Philosophy</p>
          <h2 className="font-display text-4xl md:text-6xl xl:text-7xl font-light text-cream-50 max-w-4xl mx-auto leading-tight mb-8">
            "Craftsmanship is the<br />
            <em className="italic text-gold-300">soul of every stitch</em>"
          </h2>
          <p className="font-body text-sm text-cream-50/60 max-w-2xl mx-auto mb-10 leading-relaxed">
            Every Dome Nepal piece is designed in Kathmandu and made by Nepali hands, with care in every stitch. We believe clothing should tell a story.
          </p>
          <Link to="/shop">
            <motion.div
              whileHover={{ scale: 1.03 }}
              className="inline-flex items-center gap-3 border border-cream-50/30 text-cream-50 px-10 py-4 text-xs tracking-widest uppercase hover:bg-white/10 transition-colors"
            >
              Discover the Story <ArrowRight size={14} />
            </motion.div>
          </Link>
        </ScrollReveal>
      </section>

      {/* New Arrivals */}
      <section className="page-container py-24">
        <ScrollReveal>
          <div className="flex items-end justify-between mb-14">
            <div>
              <p className="section-subtitle">Just In</p>
              <h2 className="section-title">New Arrivals</h2>
            </div>
            <Link to="/shop?filter=new" className="hidden md:flex items-center gap-2 text-xs tracking-[0.15em] uppercase text-obsidian-900/60 hover:text-obsidian-900 transition-colors group">
              View All <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </ScrollReveal>

        <div className="product-grid">
          {newLoading
            ? Array(4).fill(0).map((_, i) => <ProductCardSkeleton key={i} />)
            : (newData || []).slice(0, 8).map((p, i) => <ProductCard key={p._id} product={p} index={i} />)
          }
        </div>
      </section>

      {/* Features strip */}
      <section className="border-y border-stone-200">
        <div className="page-container py-12">
          <ScrollRevealGroup className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { Icon: Truck, title: 'Delivery across Nepal', desc: 'All 77 districts, from Rs. 100' },
              { Icon: Banknote, title: 'Cash on Delivery', desc: 'Pay when it arrives' },
              { Icon: QrCode, title: 'FonePay QR', desc: 'Pay instantly by QR' },
              { Icon: RotateCcw, title: 'Easy Returns', desc: '30-day hassle-free returns' },
            ].map(({ Icon, title, desc }) => (
              <ScrollRevealItem key={title}>
                <Icon size={22} strokeWidth={1.25} className="mx-auto mb-3 text-gold-500" />
                <h4 className="font-body font-medium text-sm text-obsidian-900 mb-1">{title}</h4>
                <p className="text-xs text-stone-400">{desc}</p>
              </ScrollRevealItem>
            ))}
          </ScrollRevealGroup>
        </div>
      </section>
    </PageTransition>
  )
}