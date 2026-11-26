import InfoLayout from '../../components/common/InfoLayout'

const ROWS = [
  ['S', '86–91', '71–76', '91–96'],
  ['M', '92–97', '77–82', '97–102'],
  ['L', '98–103', '83–88', '103–108'],
  ['XL', '104–109', '89–94', '109–114'],
  ['XXL', '110–116', '95–101', '115–121'],
]

const STEPS = [
  ['Chest', 'Measure around the fullest part of your chest, keeping the tape level under your arms.'],
  ['Waist', 'Measure around your natural waistline, the narrowest part of your torso.'],
  ['Hip', 'Measure around the fullest part of your hips, with feet together.'],
]

export default function SizeGuidePage() {
  return (
    <InfoLayout eyebrow="Fit" title="Size guide" wide intro="A general guide to body measurements. Every product page also shows its own size chart, which always takes priority.">
      <div className="max-w-4xl mx-auto space-y-12">
        <section>
          <h2 className="font-display text-3xl font-light mb-5">Body measurements (cm)</h2>
          <div className="overflow-x-auto bg-white border border-stone-200">
            <table className="w-full text-sm min-w-[420px]">
              <thead className="bg-cream-100 text-[11px] tracking-[0.15em] uppercase text-stone-500">
                <tr>{['Size', 'Chest', 'Waist', 'Hip'].map(h => <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {ROWS.map(([size, ...vals]) => (
                  <tr key={size}><td className="px-4 py-3 font-medium">{size}</td>{vals.map((v, i) => <td key={i} className="px-4 py-3 text-stone-600">{v}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-stone-400 mt-3">Approximate body measurements. Garment measurements differ by style, so check the chart on the product page.</p>
        </section>

        <section>
          <h2 className="font-display text-3xl font-light mb-5">How to measure</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {STEPS.map(([title, text], i) => (
              <div key={title} className="bg-white border border-stone-200 p-5">
                <span className="text-xs text-gold-600 font-mono">0{i + 1}</span>
                <h3 className="font-display text-xl mt-1 mb-2">{title}</h3>
                <p className="text-sm text-stone-500 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-stone-500 mt-5">Between sizes? Size up for a relaxed fit, or down for a closer fit. Not sure — message us on WhatsApp and we will help.</p>
        </section>
      </div>
    </InfoLayout>
  )
}
