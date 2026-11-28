import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { Grid3X3, Grid2X2 } from 'lucide-react'
import { productAPI } from '../services/api'
import ProductCard from '../components/product/ProductCard'
import { ProductCardSkeleton } from '../components/common/Skeletons'
import PageTransition from '../components/common/PageTransition'
import { CATEGORIES } from '../utils/helpers'

const SORT_OPTIONS = [
  { value: 'createdAt:desc', label: 'Newest First' },
  { value: 'price:asc',      label: 'Price: Low to High' },
  { value: 'price:desc',     label: 'Price: High to Low' },
  { value: 'ratingsAverage:desc', label: 'Top Rated' },
  { value: 'totalSold:desc', label: 'Best Selling' },
]

export default function ShopPage() {
  const [searchParams] = useSearchParams()
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

  // Men / Women pages also show unisex pieces (most of the range is unisex)
  const apiFilters = ['men', 'women'].includes(filters.gender) ? { ...filters, gender: `${filters.gender},unisex` } : filters
  const queryParams = Object.fromEntries(
    Object.entries(apiFilters).filter(([, v]) => v !== '' && v !== null && v !== undefined)
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

  const labelOf = (value) => CATEGORIES.find(c => c.value === value)?.label || value.charAt(0).toUpperCase() + value.slice(1)
  const categoryLabel = filters.category ? filters.category.split(',').filter(Boolean).map(labelOf).join(' · ') : ''
  const genderLabel = filters.gender ? filters.gender.split(',').filter(Boolean).map(g => g.charAt(0).toUpperCase() + g.slice(1)).join(' · ') : ''
  let eyebrow = 'All products'
  let title = 'Shop'
  if (filters.search) { eyebrow = 'Search results'; title = `“${filters.search}”` }
  else if (filters.onSale === 'true') { eyebrow = 'Limited prices'; title = 'Sale' }
  else if (filters.isNew === 'true') { eyebrow = 'Just in'; title = 'New Arrivals' }
  else if (filters.featured === 'true') { eyebrow = 'Curated'; title = 'Featured' }
  else if (categoryLabel || genderLabel) { eyebrow = genderLabel && categoryLabel ? genderLabel : 'Collection'; title = categoryLabel || genderLabel }

  return (
    <PageTransition>
      <div className="page-container py-10 md:py-14">
        {/* Header */}
        <div className="mb-8">
          <p className="section-subtitle">{eyebrow}</p>
          <h1 className="section-title">{title}</h1>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between mb-6 py-4 border-y border-stone-100">
          <div className="flex items-center gap-3">
            <span className="text-xs text-stone-400 font-mono">
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
                <p className="text-sm text-stone-400 mb-8">Nothing here yet. Have a look at the rest of the collection.</p>
                <Link to="/shop" className="btn-outline text-xs inline-flex">Browse all products</Link>
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
