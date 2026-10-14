import { motion, AnimatePresence } from 'framer-motion'
import { useEffect } from 'react'
import { Heart, ShoppingBag } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useWishlistStore, useAuthStore } from '../stores'
import { wishlistAPI, productAPI } from '../services/api'
import ProductCard from '../components/product/ProductCard'
import { ProductCardSkeleton } from '../components/common/Skeletons'
import PageTransition from '../components/common/PageTransition'

export default function WishlistPage() {
  const { items: localIds, setItems } = useWishlistStore()
  const { isAuthenticated } = useAuthStore()

  const { data: serverWishlist, isLoading } = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => wishlistAPI.get().then(r => r.data.data.wishlist),
    enabled: isAuthenticated,
  })

  const { data: guestWishlist = [], isLoading: guestLoading } = useQuery({
    queryKey: ['guest-wishlist', localIds],
    queryFn: async () => (await Promise.all(localIds.map(id => productAPI.getOne(id).then(r => r.data.data.product).catch(() => null)))).filter(Boolean),
    enabled: !isAuthenticated && localIds.length > 0,
  })

  useEffect(() => {
    if (isAuthenticated && serverWishlist) setItems(serverWishlist.map(product => product._id))
  }, [isAuthenticated, serverWishlist, setItems])

  const products = isAuthenticated ? (serverWishlist || []) : guestWishlist
  const count = isAuthenticated ? products.length : localIds.length

  return (
    <PageTransition>
      <div className="page-container py-10 md:py-14">
        <div className="mb-10">
          <p className="section-subtitle">Saved Items</p>
          <h1 className="section-title flex items-center gap-3">
            Wishlist
            {count > 0 && <span className="font-mono text-lg text-stone-300">({count})</span>}
          </h1>
        </div>

        {!isAuthenticated && localIds.length === 0 ? (
          <div className="text-center py-24 border border-stone-100">
            <Heart size={48} strokeWidth={1} className="text-stone-200 mx-auto mb-4" />
            <h2 className="font-display text-2xl text-stone-300 mb-3">Sign in to view your wishlist</h2>
            <p className="text-sm text-stone-400 mb-8">Your saved items will sync across all devices</p>
            <Link to="/login" className="btn-primary text-xs">Sign In</Link>
          </div>
        ) : (isLoading || guestLoading) ? (
          <div className="product-grid">
            {Array(4).fill(0).map((_, i) => <ProductCardSkeleton key={i} />)}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-24">
            <Heart size={56} strokeWidth={1} className="text-stone-200 mx-auto mb-5" />
            <h2 className="font-display text-3xl text-stone-200 mb-3">Your wishlist is empty</h2>
            <p className="text-sm text-stone-400 mb-8">Save pieces you love and come back to them anytime</p>
            <Link to="/shop" className="btn-primary text-xs inline-flex items-center gap-2">
              <ShoppingBag size={14} /> Explore Collection
            </Link>
          </div>
        ) : (
          <><div className="product-grid">
            {products.map((p, i) => <ProductCard key={p._id} product={p} index={i} />)}
          </div>{!isAuthenticated && <p className="mt-8 text-center text-xs text-stone-400">Saved on this device. <Link to="/login" className="underline text-obsidian-900">Sign in</Link> to sync your wishlist.</p>}</>
        )}
      </div>
    </PageTransition>
  )
}
