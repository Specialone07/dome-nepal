import { useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Instagram, Facebook, Mail, MapPin, Phone, MessageCircle } from 'lucide-react'
import { FaTiktok } from 'react-icons/fa'
import { SITE } from '../../data/site'

const SHOP_LINKS = [
  ['New Arrivals', '/shop?filter=new'],
  ['Featured', '/shop?filter=featured'],
  ['Tops', '/shop?category=tops'],
  ['Outerwear', '/shop?category=outerwear'],
  ['Bottoms', '/shop?category=bottoms'],
  ['Sale', '/shop?filter=sale'],
]

const HELP_LINKS = [
  ['Track Order', '/orders'],
  ['Shipping & Returns', '/shipping-returns'],
  ['Size Guide', '/size-guide'],
  ['FAQ', '/faq'],
  ['Contact Us', '/contact'],
]

const COMPANY_LINKS = [
  ['About Dome', '/about'],
  ['My Account', '/account'],
  ['Wishlist', '/wishlist'],
]

function LinkColumn({ title, links }) {
  return (
    <div>
      <h4 className="font-mono text-[10px] tracking-[0.25em] uppercase text-gold-400 mb-5">{title}</h4>
      <ul className="space-y-3">
        {links.map(([label, to]) => (
          <li key={label}>
            <Link to={to} className="text-stone-400 text-sm hover:text-cream-50 transition-colors">{label}</Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function Footer() {
  const [email, setEmail] = useState('')

  const subscribe = (e) => {
    e.preventDefault()
    // No newsletter backend yet: hand the signup to the shop inbox so it is never lost.
    window.location.href = `mailto:${SITE.email}?subject=${encodeURIComponent('Newsletter signup')}&body=${encodeURIComponent(`Please add ${email} to the Dome Circle.`)}`
    toast.success('Thanks for joining the Dome Circle!')
    setEmail('')
  }

  const socials = [
    { Icon: Instagram, href: SITE.socials.instagram, label: 'Instagram' },
    { Icon: Facebook, href: SITE.socials.facebook, label: 'Facebook' },
    { Icon: FaTiktok, href: SITE.socials.tiktok, label: 'TikTok' },
    { Icon: MessageCircle, href: SITE.whatsapp, label: 'WhatsApp' },
  ]

  return (
    <footer className="bg-obsidian-900 text-cream-100 mt-24">
      <div className="border-b border-white/10">
        <div className="page-container py-14 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-center md:text-left">
            <p className="section-subtitle text-gold-300">Stay connected</p>
            <h3 className="font-display text-3xl md:text-4xl font-light text-cream-50">Join the Dome Circle</h3>
            <p className="text-stone-400 text-sm mt-2">Early access, new drops and style notes.</p>
          </div>
          <form className="flex w-full md:w-auto" onSubmit={subscribe}>
            <input
              type="email" required value={email} onChange={e => setEmail(e.target.value)} aria-label="Email address"
              placeholder="Your email address"
              className="flex-1 md:w-72 px-4 py-3.5 bg-white/10 border border-white/20 text-cream-50 placeholder-stone-500 text-sm focus:outline-none focus:border-gold-400"
            />
            <button className="btn-gold px-6 text-xs whitespace-nowrap">Subscribe</button>
          </form>
        </div>
      </div>

      <div className="page-container py-14">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10">
          <div className="col-span-2">
            <Link to="/" className="inline-block mb-5">
              <div className="font-display text-3xl tracking-[0.1em] text-cream-50">DOME</div>
              <div className="font-mono text-[9px] tracking-[0.4em] text-gold-400 uppercase -mt-1">Nepal</div>
            </Link>
            <p className="text-stone-400 text-sm max-w-xs leading-relaxed mb-6">
              Premium streetwear crafted in Kathmandu. Delivered to all 77 districts. Pay by cash on delivery or FonePay QR.
            </p>
            <ul className="space-y-2.5 text-sm text-stone-400 mb-6">
              <li className="flex gap-3 items-center"><MapPin size={14} className="text-gold-400 shrink-0" />{SITE.address}</li>
              <li><a href={`tel:${SITE.phoneHref}`} className="flex gap-3 items-center hover:text-cream-50"><Phone size={14} className="text-gold-400 shrink-0" />{SITE.phone}</a></li>
              <li><a href={`mailto:${SITE.email}`} className="flex gap-3 items-center hover:text-cream-50"><Mail size={14} className="text-gold-400 shrink-0" />{SITE.email}</a></li>
            </ul>
            <div className="flex gap-3">
              {socials.map(({ Icon, href, label }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} title={label}
                  className="w-9 h-9 border border-white/15 flex items-center justify-center text-stone-400 hover:text-gold-400 hover:border-gold-400 transition-colors">
                  <Icon size={15} />
                </a>
              ))}
            </div>
          </div>
          <LinkColumn title="Shop" links={SHOP_LINKS} />
          <LinkColumn title="Help" links={HELP_LINKS} />
          <LinkColumn title="Company" links={COMPANY_LINKS} />
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="page-container py-5 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-stone-500 text-xs">© {new Date().getFullYear()} Dome Nepal. All rights reserved.</p>
          <div className="flex items-center gap-2 text-[10px] tracking-widest uppercase text-stone-400">
            <span>We accept</span>
            <span className="border border-white/15 px-2 py-1">Cash on delivery</span>
            <span className="border border-white/15 px-2 py-1">FonePay QR</span>
          </div>
          <div className="flex gap-6 text-xs text-stone-500">
            <Link to="/privacy" className="hover:text-stone-300">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-stone-300">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
