import { Link } from 'react-router-dom'
import PageTransition from '../components/common/PageTransition'

export default function NotFoundPage() {
  return (
    <PageTransition>
      <div className="page-container py-28 text-center">
        <p className="font-mono text-xs tracking-[0.4em] uppercase text-gold-500 mb-4">Error 404</p>
        <h1 className="font-display text-6xl md:text-8xl font-light text-obsidian-900 mb-4">Lost in the mountains</h1>
        <p className="text-stone-500 max-w-md mx-auto mb-8">The page you are looking for does not exist or has moved.</p>
        <div className="flex justify-center gap-3 flex-wrap">
          <Link to="/" className="btn-primary text-xs">Back home</Link>
          <Link to="/shop" className="btn-outline text-xs">Browse the shop</Link>
        </div>
      </div>
    </PageTransition>
  )
}
