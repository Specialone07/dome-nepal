import { useState } from 'react'
import { formatPrice } from '../../utils/helpers'
import { NEPAL_SHIPPING } from '../../data/nepalShipping'

export default function AdminShipping() {
  const [query, setQuery] = useState('')
  const zones = Object.fromEntries(NEPAL_SHIPPING.zones.map(z => [z.id, z]))
  const q = query.trim().toLowerCase()
  const rows = NEPAL_SHIPPING.provinces.flatMap(p => p.districts.map(d => ({ ...d, province: p.name })))
    .filter(r => !q || r.name.toLowerCase().includes(q) || r.province.toLowerCase().includes(q))
  const counts = rows.reduce((acc, r) => ({ ...acc, [r.zone]: (acc[r.zone] || 0) + 1 }), {})

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-light">Delivery rates</h1>
        <p className="text-xs text-stone-400">Applied automatically at checkout by district. All orders are cash on delivery.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {NEPAL_SHIPPING.zones.map(z => (
          <div key={z.id} className="bg-white border border-stone-100 p-4">
            <p className="text-[10px] tracking-[0.2em] uppercase text-stone-400">Zone {z.id}</p>
            <p className="text-sm font-medium mt-1 min-h-[2.5rem]">{z.name}</p>
            <p className="font-display text-2xl mt-2">{formatPrice(z.fee)}</p>
            <p className="text-[11px] text-stone-400">{z.eta} · {counts[z.id] || 0} districts</p>
          </div>
        ))}
      </div>

      <p className="text-xs text-stone-500 bg-amber-50 border border-amber-100 px-4 py-3">
        Free delivery above {formatPrice(NEPAL_SHIPPING.freeShippingThreshold)} applies to zones {NEPAL_SHIPPING.freeShippingZones.join(', ')} only.
        To change rates, edit <code className="font-mono">backend/utils/nepalShipping.js</code>, then run <code className="font-mono">npm run sync:shipping</code> in the backend folder and redeploy.
      </p>

      <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search district or province…" className="input-field max-w-sm" />

      <div className="bg-white border border-stone-100 overflow-x-auto">
        <table className="w-full min-w-[560px]">
          <thead className="border-b border-stone-100">
            <tr>{['District', 'Province', 'Zone', 'Fee', 'ETA'].map(h => <th key={h} className="px-4 py-3 text-left text-[10px] tracking-[0.2em] uppercase text-stone-400 font-mono">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-stone-50">
            {rows.map(r => (
              <tr key={r.name} className="hover:bg-cream-50">
                <td className="px-4 py-2.5 text-sm">{r.name}</td>
                <td className="px-4 py-2.5 text-xs text-stone-500">{r.province}</td>
                <td className="px-4 py-2.5 text-xs text-stone-500">{zones[r.zone].name}</td>
                <td className="px-4 py-2.5 text-sm font-mono">{formatPrice(zones[r.zone].fee)}</td>
                <td className="px-4 py-2.5 text-xs text-stone-500">{zones[r.zone].eta}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={5} className="p-8 text-center text-sm text-stone-400">No match</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
