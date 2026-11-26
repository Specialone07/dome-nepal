import { useState } from 'react'
import InfoLayout, { Prose } from '../../components/common/InfoLayout'
import { formatPrice } from '../../utils/helpers'
import { NEPAL_SHIPPING } from '../../data/nepalShipping'

export default function ShippingReturnsPage() {
  const [query, setQuery] = useState('')
  const zones = Object.fromEntries(NEPAL_SHIPPING.zones.map(z => [z.id, z]))
  const q = query.trim().toLowerCase()
  const provinces = NEPAL_SHIPPING.provinces
    .map(p => ({ ...p, districts: p.districts.filter(d => !q || d.name.toLowerCase().includes(q) || p.name.toLowerCase().includes(q)) }))
    .filter(p => p.districts.length)

  return (
    <InfoLayout eyebrow="Delivery" title="Shipping & Returns" wide
      intro="We deliver to every district in Nepal, with cash on delivery available everywhere.">
      <div className="max-w-5xl mx-auto space-y-14">
        <section>
          <h2 className="font-display text-3xl font-light mb-6">Delivery zones</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {NEPAL_SHIPPING.zones.map(z => (
              <div key={z.id} className="bg-white border border-stone-200 p-4">
                <p className="text-[10px] tracking-[0.2em] uppercase text-stone-400">Zone {z.id}</p>
                <p className="font-medium text-sm mt-1 min-h-[2.5rem]">{z.name}</p>
                <p className="font-display text-2xl mt-2">{formatPrice(z.fee)}</p>
                <p className="text-xs text-stone-500 mt-1">{z.eta}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-stone-500 mt-4">
            Free delivery on orders of {formatPrice(NEPAL_SHIPPING.freeShippingThreshold)} or more to zones {NEPAL_SHIPPING.freeShippingZones.join(', ')}. All orders can be paid in cash on delivery.
          </p>
        </section>

        <section>
          <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
            <h2 className="font-display text-3xl font-light">Find your district</h2>
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search district or province…" className="input-field max-w-xs" aria-label="Search districts" />
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            {provinces.map(p => (
              <div key={p.name} className="bg-white border border-stone-200">
                <h3 className="px-4 py-3 bg-cream-100 font-display text-xl border-b border-stone-200">
                  {p.name} <span className="text-xs text-stone-400 font-body">· {p.districts.length} districts</span>
                </h3>
                <ul className="divide-y divide-stone-100">
                  {p.districts.map(d => (
                    <li key={d.name} className="flex justify-between px-4 py-2 text-sm">
                      <span>{d.name}</span>
                      <span className="text-stone-500">{formatPrice(zones[d.zone].fee)} · {zones[d.zone].eta}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {!provinces.length && <p className="text-stone-500">No district matches “{query}”.</p>}
          </div>
        </section>

        <section className="max-w-3xl">
          <Prose>
            <h2>Returns &amp; exchanges</h2>
            <ul>
              <li>Returns and exchanges are accepted within 30 days of delivery.</li>
              <li>Items must be unworn, unwashed and have original tags attached.</li>
              <li>Faulty or wrong items are replaced at our cost. Contact us within 48 hours of delivery with a photo.</li>
              <li>For change-of-mind returns, the customer covers the return courier charge.</li>
              <li>Refunds are made by bank transfer or eSewa/Khalti within 5–7 working days after we receive the item.</li>
            </ul>
            <h2>Cash on delivery</h2>
            <p>Pay the rider in cash when your parcel arrives. You may check the parcel before paying. Repeatedly refused deliveries may lead to COD being disabled for that phone number.</p>
          </Prose>
        </section>
      </div>
    </InfoLayout>
  )
}
