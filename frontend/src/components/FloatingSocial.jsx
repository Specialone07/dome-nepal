import { motion } from 'framer-motion'
import { Instagram, Facebook } from 'lucide-react'
import { FaTiktok } from 'react-icons/fa'

export default function FloatingSocial() {
  const socials = [
    { Icon: Instagram, link: 'https://www.instagram.com/domeenp/' },
    { Icon: FaTiktok, link: 'https://www.tiktok.com/@domeenp_?lang=en' },
    { Icon: Facebook, link: 'https://www.facebook.com/domeenp' },
  ]

  return (
    <div className="fixed left-4 top-1/2 -translate-y-1/2 z-50 hidden md:flex flex-col gap-4">
      {socials.map(({ Icon, link }, i) => (
        <motion.a
          key={i}
          href={link}
          target="_blank"
          rel="noreferrer"
          whileHover={{ scale: 1.2 }}
          className="bg-white/80 backdrop-blur p-2 rounded-full shadow text-black"
        >
          <Icon size={16} />
        </motion.a>
      ))}
    </div>
  )
}