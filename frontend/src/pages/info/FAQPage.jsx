import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import InfoLayout from '../../components/common/InfoLayout'
import { NEPAL_SHIPPING } from '../../data/nepalShipping'

const minFee = Math.min(...NEPAL_SHIPPING.zones.map(z => z.fee))
const maxFee = Math.max(...NEPAL_SHIPPING.zones.map(z => z.fee))

const FAQS = [
  { q: 'Do you deliver outside Kathmandu?', a: <>Yes, we deliver to all 77 districts of Nepal. Delivery costs Rs. {minFee} to Rs. {maxFee} depending on your district. See the full list on our <Link to="/shipping-returns">Shipping &amp; Returns</Link> page.</> },
  { q: 'How does cash on delivery work?', a: 'Place your order online without paying anything. When the parcel arrives, check it and pay the rider in cash. Please keep the exact amount ready.' },
  { q: 'How long will delivery take?', a: 'Kathmandu Valley: 1–2 days. Major cities: 2–3 days. Other Terai and hill districts: 3–5 days. Remote and Himalayan districts: 5–10 days.' },
  { q: 'Is delivery free?', a: `Delivery is free in Kathmandu Valley, major cities and Terai/accessible hill districts when your order is Rs. ${NEPAL_SHIPPING.freeShippingThreshold.toLocaleString()} or more. Remote districts always pay the delivery fee.` },
  { q: 'How do I track my order?', a: <>Open <Link to="/orders">Track Order</Link>. Guests can see orders placed on their device; account holders can see all orders under My Account.</> },
  { q: 'Can I cancel or change my order?', a: 'You can cancel while the order is still Pending or Processing, from the order page. Once it has shipped, please contact us.' },
  { q: 'What is your return policy?', a: <>We accept returns within 30 days for unworn items with tags. Details are on the <Link to="/shipping-returns">Shipping &amp; Returns</Link> page.</> },
  { q: 'How do I find my size?', a: <>Each product page has a size chart. For general guidance see our <Link to="/size-guide">Size Guide</Link>, or message us on WhatsApp.</> },
]

export default function FAQPage() {
  const [open, setOpen] = useState(0)
  return (
    <InfoLayout eyebrow="Help" title="Frequently asked questions" intro="Quick answers about ordering, delivery and returns.">
      <div className="divide-y divide-stone-200 border-y border-stone-200">
        {FAQS.map((item, i) => (
          <div key={item.q}>
            <button onClick={() => setOpen(open === i ? -1 : i)} className="w-full flex justify-between items-center gap-4 py-5 text-left" aria-expanded={open === i}>
              <span className="font-medium text-obsidian-900">{item.q}</span>
              <ChevronDown size={18} className={`shrink-0 transition-transform ${open === i ? 'rotate-180' : ''}`} />
            </button>
            {open === i && <div className="pb-5 text-stone-600 leading-relaxed [&_a]:underline [&_a]:text-obsidian-900">{item.a}</div>}
          </div>
        ))}
      </div>
      <p className="text-center text-sm text-stone-500 mt-8">Still stuck? <Link to="/contact" className="underline text-obsidian-900">Contact us</Link>.</p>
    </InfoLayout>
  )
}
