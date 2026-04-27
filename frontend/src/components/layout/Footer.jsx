import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Instagram, Facebook, Twitter, Mail, MapPin, Phone } from 'lucide-react'

/* ✅ TikTok SVG (no external lib needed) */
const TikTokIcon = ({ size = 16, className = '' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    width={size}
    height={size}
    className={className}
  >
    <path d="M19 7.5a5.5 5.5 0 01-4.5-2.3V14a5 5 0 11-5-5c.3 0 .6 0 .9.1v2.6a2.4 2.4 0 102.1 2.3V2h2.5a5.5 5.5 0 004.5 5.5v2z"/>
  </svg>
)

export default function Footer() {

  const socials = [
    { Icon: Instagram, link: 'https://instagram.com/yourusername', label: 'Instagram' },
    { Icon: Facebook, link: 'https://facebook.com/yourpage', label: 'Facebook' },
    { Icon: Twitter, link: 'https://twitter.com/yourusername', label: 'Twitter' },
    { Icon: TikTokIcon, link: 'https://www.tiktok.com/@yourusername', label: 'TikTok' },
  ]

  return (
    <footer className="bg-obsidian-900 text-cream-100 mt-24">

      {/* Newsletter */}
      <div className="border-b border-white/10">
        <div className="page-container py-16 flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <p className="section-subtitle text-gold-300">Stay Connected</p>
            <h3 className="font-display text-3xl md:text-4xl font-light text-cream-50">
              Join the Dome Circle
            </h3>
            <p className="text-stone-400 text-sm mt-2">
              Get early access, exclusive drops, and style notes.
            </p>
          </div>

          <form className="flex w-full md:w-auto gap-0" onSubmit={e => e.preventDefault()}>
            <input
              type="email"
              placeholder="Your email address"
              className="flex-1 md:w-72 px-4 py-3.5 bg-white/10 border border-white/20 text-cream-50 placeholder-stone-500 text-sm focus:outline-none focus:border-gold-400"
            />
            <button className="btn-gold px-6 text-xs whitespace-nowrap">
              Subscribe
            </button>
          </form>
        </div>
      </div>

      {/* Main Footer */}
      <div className="page-container py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">

          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="mb-6">
              <div className="font-display text-3xl text-cream-50">DOME</div>
              <div className="font-mono text-[9px] tracking-[0.4em] text-gold-400 uppercase -mt-1">Nepal</div>
            </div>

            <p className="text-stone-400 text-xs mb-6">
              Crafted in Nepal. Premium streetwear.
            </p>

            {/* ✅ Social Links */}
            <div className="flex gap-4">
              {socials.map(({ Icon, link, label }, i) => (
                <motion.a
                  key={i}
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={label}
                  whileHover={{ scale: 1.2, color: '#C9A84C' }}
                  className="text-stone-500"
                >
                  <Icon size={16} />
                </motion.a>
              ))}
            </div>
          </div>

          {/* Shop */}
          <div>
            <h4 className="font-mono text-[10px] uppercase text-gold-400 mb-5">Shop</h4>
            <ul className="space-y-3">
              {['New Arrivals', 'Men', 'Women', 'Accessories', 'Sale'].map(link => (
                <li key={link}>
                  <Link to="/shop" className="text-stone-400 text-xs hover:text-cream-50">
                    {link}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Help */}
          <div>
            <h4 className="font-mono text-[10px] uppercase text-gold-400 mb-5">Help</h4>
            <ul className="space-y-3">
              {['Size Guide', 'Shipping & Returns', 'FAQ'].map(link => (
                <li key={link}>
                  <Link to="#" className="text-stone-400 text-xs hover:text-cream-50">
                    {link}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-mono text-[10px] uppercase text-gold-400 mb-5">Contact</h4>
            <ul className="space-y-3">
              {[
                { Icon: MapPin, text: 'Tahachal, Kathmandu, Nepal' },
                { Icon: Phone, text: '+977 9844280168' },
                { Icon: Mail, text: 'domee.clothing@gmail.com' },
              ].map(({ Icon, text }) => (
                <li key={text} className="flex gap-2">
                  <Icon size={12} className="text-gold-400" />
                  <span className="text-stone-400 text-xs">{text}</span>
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>

      {/* Bottom */}
      <div className="border-t border-white/10">
        <div className="page-container py-5 flex flex-col sm:flex-row justify-between items-center">
          <p className="text-stone-600 text-[10px] uppercase">
            © {new Date().getFullYear()} Dome Nepal
          </p>

          <div className="flex gap-6">
            <Link to="#" className="text-stone-600 text-[10px] hover:text-stone-400">
              Privacy Policy
            </Link>
            <Link to="#" className="text-stone-600 text-[10px] hover:text-stone-400">
              Terms
            </Link>
          </div>
        </div>
      </div>

    </footer>
  )
}