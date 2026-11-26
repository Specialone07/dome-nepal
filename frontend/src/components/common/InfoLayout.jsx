import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import PageTransition from './PageTransition'

export default function InfoLayout({ eyebrow, title, intro, updated, children, wide = false }) {
  useEffect(() => {
    document.title = `${title} — Dome Nepal`
    return () => { document.title = 'Dome Nepal — Premium Himalayan Streetwear' }
  }, [title])

  return (
    <PageTransition>
      <header className="bg-cream-100 border-b border-stone-200">
        <div className="page-container py-14 md:py-20 text-center">
          {eyebrow && <p className="section-subtitle">{eyebrow}</p>}
          <h1 className="font-display text-4xl md:text-6xl font-light text-obsidian-900">{title}</h1>
          {intro && <p className="text-stone-500 max-w-2xl mx-auto mt-4 leading-relaxed">{intro}</p>}
          {updated && <p className="text-[11px] tracking-widest uppercase text-stone-400 mt-5">Last updated {updated}</p>}
        </div>
      </header>
      <div className={`page-container py-12 md:py-16 ${wide ? '' : 'max-w-3xl'}`}>{children}</div>
      <div className="page-container pb-16 text-center">
        <Link to="/shop" className="btn-outline text-xs inline-flex">Continue shopping</Link>
      </div>
    </PageTransition>
  )
}

export function Prose({ children }) {
  return (
    <div className="space-y-5 text-stone-600 leading-relaxed [&_h2]:font-display [&_h2]:text-2xl [&_h2]:text-obsidian-900 [&_h2]:font-light [&_h2]:pt-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_a]:underline [&_a]:text-obsidian-900">
      {children}
    </div>
  )
}
