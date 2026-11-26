import { useState } from 'react'
import { Mail, MapPin, Phone, Clock, MessageCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import InfoLayout from '../../components/common/InfoLayout'
import { SITE } from '../../data/site'

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.message.trim()) return toast.error('Please add your name and message')
    const subject = encodeURIComponent(`Message from ${form.name} — Dome Nepal website`)
    const body = encodeURIComponent(`${form.message}\n\n— ${form.name}${form.email ? ` (${form.email})` : ''}`)
    window.location.href = `mailto:${SITE.email}?subject=${subject}&body=${body}`
    toast.success('Opening your email app…')
  }

  const details = [
    { Icon: Phone, label: 'Call us', value: SITE.phone, href: `tel:${SITE.phoneHref}` },
    { Icon: MessageCircle, label: 'WhatsApp', value: 'Chat with us', href: SITE.whatsapp },
    { Icon: Mail, label: 'Email', value: SITE.email, href: `mailto:${SITE.email}` },
    { Icon: MapPin, label: 'Studio', value: SITE.address },
    { Icon: Clock, label: 'Hours', value: SITE.hours },
  ]

  return (
    <InfoLayout eyebrow="Get in touch" title="Contact us" wide intro="Questions about an order, sizing or delivery? We usually reply within a few hours.">
      <div className="grid md:grid-cols-2 gap-10 max-w-5xl mx-auto">
        <ul className="space-y-5">
          {details.map(({ Icon, label, value, href }) => (
            <li key={label} className="flex gap-4 items-start">
              <span className="w-10 h-10 bg-cream-100 flex items-center justify-center shrink-0"><Icon size={16} className="text-gold-600" /></span>
              <div>
                <p className="text-[11px] tracking-[0.15em] uppercase text-stone-400">{label}</p>
                {href
                  ? <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noreferrer" className="text-obsidian-900 hover:text-gold-600 transition-colors">{value}</a>
                  : <p className="text-obsidian-900">{value}</p>}
              </div>
            </li>
          ))}
        </ul>
        <form onSubmit={submit} className="bg-white border border-stone-200 p-6 space-y-4">
          <input className="input-field" placeholder="Your name *" value={form.name} onChange={set('name')} />
          <input className="input-field" type="email" placeholder="Your email" value={form.email} onChange={set('email')} />
          <textarea className="input-field min-h-[140px]" placeholder="How can we help? *" value={form.message} onChange={set('message')} />
          <button className="btn-primary w-full text-xs">Send message</button>
        </form>
      </div>
    </InfoLayout>
  )
}
