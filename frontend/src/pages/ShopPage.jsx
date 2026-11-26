import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { SlidersHorizontal, X, ChevronDown, ChevronUp, Grid3X3, Grid2X2 } from 'lucide-react'
import { productAPI } from '../services/api'
import ProductCard from '../components/product/ProductCard'
import { ProductCardSkeleton } from '../components/common/Skeletons'
import PageTransition from '../components/common/PageTransition'
import { CATEGORIES, SIZES } from '../utils/helpers'

const SORT_OPTIONS = [
  { value: 'createdAt:desc', label: 'Newest First' },
  { value: 'price:asc',      label: 'Price: Low to High' },
  { value: 'price:desc',     label: 'Price: High to Low' },
  { value: 'ratingsAverage:desc', label: 'Top Rated' },
  { value: 'totalSold:desc', label: 'Best Selling' },
]

function FilterSection({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-stone-100 pb-5 mb-5">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full mb-4"
      >
        <span className="font-mono text-[10px] tracking-[0.25em] uppercase text-obsidian-900">{title}</span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [gridCols, setGridCols] = useState(4)

  const getParam = (key, def = '') => searchParams.get(key) || def

  const [filters, setFilters] = useState({
    category: getParam('category'),
    gender: getParam('gender'),
    minPrice: getParam('minPrice'),
    maxPrice: getParam('maxPrice'),
    sizes: getParam('sizes'),
    sortBy: getParam('sortBy'),
    order: getParam('order'),
    page: 1,
    limit: 16,
    search: getParam('search'),
    featured: getParam('filter') === 'featured' ? 'true' : '',
    isNew: getParam('filter') === 'new' ? 'true' : '',
    onSale: getParam('filter') === 'sale' ? 'true' : '',
  })

  useEffect(() => {
    const sort = getParam('sort')
    const [sortBy, order] = sort ? sort.split(':') : ['', '']
    setFilters(f => ({
      ...f,
      category: getParam('category'),
      gender: getParam('gender'),
      search: getParam('search'),
      featured: getParam('filter') === 'featured' ? 'true' : '',
      isNew: getParam('filter') === 'new' ? 'true' : '',
      onSale: getParam('filter') === 'sale' ? 'true' : '',
      sortBy: sortBy,
      order: order,
    }))
  }, [searchParams])

  const queryParams = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== '' && v !== null && v !== undefined)
  )

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['products', queryParams],
    queryFn: () => productAPI.getAll(queryParams).then(r => r.data.data),
    keepPreviousData: true,
  })

  const products = data?.products || []
  const pagination = data?.pagination

  const updateFilter = (key, value) => {
    setFilters(f => ({ ...f, [key]: value, page: 1 }))
  }

  const toggleCategory = (cat) => {
    const current = filters.category ? filters.category.split(',') : []
    const next = current.includes(cat) ? current.filter(c => c !== cat) : [...current, cat]
    updateFilter('category', next.join(','))
  }

  const toggleSize = (size) => {
    const current = filters.sizes ? filters.sizes.split(',') : []
    const next = current.includes(size) ? current.filter(s => s !== size) : [...current, size]
    updateFilter('sizes', next.join(','))
  }

  const clearFilters = () => {
    setFilters({ category: '', gender: '', minPrice: '', maxPrice: '', sizes: '', sortBy: 'createdAt', order: 'desc', page: 1, limit: 16, search: '', featured: '', isNew: '', onSale: '' })
    setSearchParams({})
  }

  const activeFiltersCount = [filters.category, filters.gender, filters.sizes, filters.minPrice, filters.maxPrice].filter(Boolean).length

  const FilterPanel = () => (
    <div className="space-y-0">
      {/* Categories */}
      <FilterSection title="Category">
        <div className="space-y-2">
          {CATEGORIES.map(cat => (
            <label key={cat.value} className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={filters.category?.split(',').includes(cat.value) || false}
                onChange={() => toggleCategory(cat.value)}
                className="w-3.5 h-3.5 accent-obsidian-900"
              />
              <span className="text-xs text-stone-500 group-hover:text-obsidian-900 transition-colors capitalize">
                {cat.label}
              </span>
            </label>
          ))}
        </div>
      </FilterSection>

      {/* Gender */}
      <FilterSection title="Gender">
        <div className="flex flex-wrap gap-2">
          {['men', 'women', 'unisex'].map(g => (
            <button
              key={g}
              onClick={() => updateFilter('gender', filters.gender === g ? '' : g)}
              className={`px-4 py-1.5 text-[10px] tracking-widest uppercase border transition-colors ${
                filters.gender === g
                  ? 'bg-obsidian-900 text-cream-50 border-obsidian-900'
                  : 'border-stone-200 text-stone-500 hover:border-obsidian-900 hover:text-obsidian-900'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Sizes */}
      <FilterSection title="Size">
        <div className="flex flex-wrap gap-2">
          {SIZES.map(s => (
            <button
              key={s}
              onClick={() => toggleSize(s)}
              className={`w-10 h-10 text-xs border transition-colors ${
                filters.sizes?.split(',').includes(s)
                  ? 'bg-obsidian-900 text-cream-50 border-obsidian-900'
                  : 'border-stone-200 text-stone-500 hover:border-obsidian-900'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Price Range */}
      <FilterSection title="Price Range">
        <div className="flex items-center gap-3">
          <input
            type="number"
            placeholder="Min"
            value={filters.minPrice}
            onChange={e => updateFilter('minPrice', e.target.value)}
            className="input-field text-xs py-2 w-full"
          />
          <span className="text-stone-300 flex-shrink-0">—</span>
          <input
            type="number"
            placeholder="Max"
            value={filters.maxPrice}
            onChange={e => updateFilter('maxPrice', e.target.value)}
            className="input-field text-xs py-2 w-full"
          />
        </div>
      </FilterSection>
    </div>
  )

  return (
    <PageTransition>
      <div className="page-container py-10 md:py-14">
        {/* Header */}
        <div className="mb-8">
          <p className="section-subtitle">
            {filters.search ? `Search: "${filters.search}"` : filters.category || 'All Products'}
          </p>
          <h1 className="section-title">
            {filters.isNew === 'true' ? 'New Arrivals' : filters.featured === 'true' ? 'Featured' : 'Shop'}
          </h1>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between mb-6 py-4 border-y border-stone-100">
          <div className="flex items-center gap-3">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setFiltersOpen(!filtersOpen)}
              className="flex items-center gap-2 text-xs tracking-[0.1em] uppercase text-obsidian-900 border border-stone-200 px-4 py-2 hover:border-obsidian-900 transition-colors"
            >
              <SlidersHorizontal size={14} />
              Filters
              {activeFiltersCount > 0 && (
                <span className="bg-gold-400 text-obsidian-900 text-[10px] font-mono w-4 h-4 rounded-full flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </motion.button>
            {activeFiltersCount > 0 && (
              <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-stone-400 hover:text-obsidian-900 transition-colors">
                <X size={12} /> Clear
              </button>
            )}
            <span className="text-xs text-stone-400 font-mono hidden sm:inline">
              {isFetching ? 'Loading...' : `${pagination?.total || 0} items`}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Grid toggle */}
            <div className="hidden md:flex items-center gap-1 border border-stone-200 p-0.5">
              {[4, 3].map(n => (
                <button
                  key={n}
                  onClick={() => setGridCols(n)}
                  className={`p-1.5 transition-colors ${gridCols === n ? 'bg-obsidian-900 text-white' : 'text-stone-400 hover:text-obsidian-900'}`}
                >
                  {n === 4 ? <Grid3X3 size={14} /> : <Grid2X2 size={14} />}
                </button>
              ))}
            </div>
            {/* Sort */}
            <select
              value={`${filters.sortBy}:${filters.order}`}
              onChange={e => { const [s, o] = e.target.value.split(':'); updateFilter('sortBy', s); updateFilter('order', o) }}
              className="text-xs border border-stone-200 px-3 py-2 bg-white focus:outline-none focus:border-obsidian-900 tracking-wide"
            >
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        <div className="flex gap-8">
          {/* Sidebar Filters - Desktop */}
          <AnimatePresence>
            {filtersOpen && (
              <motion.aside
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 260, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="hidden md:block flex-shrink-0 overflow-hidden"
              >
                <div className="w-[260px]">
                  <FilterPanel />
                </div>
              </motion.aside>
            )}
          </AnimatePresence>

          {/* Mobile Filter Drawer */}
          <AnimatePresence>
            {filtersOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/40 z-40 md:hidden"
                  onClick={() => setFiltersOpen(false)}
                />
                <motion.div
                  initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
                  transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                  className="fixed left-0 top-0 bottom-0 w-80 bg-white z-50 md:hidden overflow-y-auto p-6"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-display text-lg">Filters</h3>
                    <button onClick={() => setFiltersOpen(false)}><X size={20} /></button>
                  </div>
                  <FilterPanel />
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* Product Grid */}
          <div className="flex-1 min-w-0">
            <div className={`grid grid-cols-2 ${gridCols === 4 ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-4 md:gap-6`}>
              {isLoading
                ? Array(16).fill(0).map((_, i) => <ProductCardSkeleton key={i} />)
                : products.map((p, i) => <ProductCard key={p._id} product={p} index={i} />)
              }
            </div>

            {!isLoading && products.length === 0 && (
              <div className="text-center py-24">
                <p className="font-display text-3xl text-stone-200 mb-3">No products found</p>
                <p className="text-sm text-stone-400 mb-8">Try adjusting your filters</p>
                <button onClick={clearFilters} className="btn-outline text-xs">Clear Filters</button>
              </div>
            )}

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-12">
                {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(p => (
                  <motion.button
                    key={p}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setFilters(f => ({ ...f, page: p }))}
                    className={`w-10 h-10 text-sm border transition-colors ${
                      filters.page === p
                        ? 'bg-obsidian-900 text-cream-50 border-obsidian-900'
                        : 'border-stone-200 text-stone-500 hover:border-obsidian-900'
                    }`}
                  >
                    {p}
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  )
}
