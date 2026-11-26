import { Link } from 'react-router-dom'
import { Mountain, Scissors, Leaf, HeartHandshake } from 'lucide-react'
import InfoLayout from '../../components/common/InfoLayout'

const VALUES = [
  { Icon: Mountain, title: 'Himalayan roots', text: 'Designed in Kathmandu, inspired by the textures, colours and spirit of the mountains.' },
  { Icon: Scissors, title: 'Considered craft', text: 'Small batches, careful finishing and fabrics chosen to last well beyond a season.' },
  { Icon: Leaf, title: 'Made responsibly', text: 'Local production, less waste and fewer, better pieces instead of fast fashion.' },
  { Icon: HeartHandshake, title: 'Service you can reach', text: 'Real people on call and WhatsApp, and delivery to all 77 districts.' },
]

export default function AboutPage() {
  return (
    <InfoLayout eyebrow="Our story" title="Born from the Mountains" wide
      intro="Dome Nepal is a Kathmandu clothing label bringing Himalayan heritage together with contemporary streetwear.">
      <div className="grid md:grid-cols-2 gap-10 items-center max-w-5xl mx-auto mb-16">
        <img src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1000&q=80" alt="Dome Nepal collection" className="w-full aspect-[4/5] object-cover" loading="lazy" />
        <div className="space-y-5 text-stone-600 leading-relaxed">
          <h2 className="font-display text-3xl font-light text-obsidian-900">Clothing for people who move between worlds</h2>
          <p>We started Dome with a simple idea: Nepali-made clothing should look as good, fit as well and feel as premium as anything you would find abroad, without leaving home to get it.</p>
          <p>Every piece is designed in Kathmandu and made in Nepal, with attention to cut, fabric and finish. We keep collections tight so each piece earns its place in your wardrobe.</p>
          <Link to="/shop" className="btn-primary text-xs inline-flex">Shop the collection</Link>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
        {VALUES.map(({ Icon, title, text }) => (
          <div key={title} className="bg-white border border-stone-200 p-6">
            <Icon size={24} strokeWidth={1.25} className="text-gold-500 mb-4" />
            <h3 className="font-display text-xl mb-2">{title}</h3>
            <p className="text-sm text-stone-500 leading-relaxed">{text}</p>
          </div>
        ))}
      </div>
    </InfoLayout>
  )
}
