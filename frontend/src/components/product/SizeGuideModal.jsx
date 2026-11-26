import { motion, AnimatePresence } from 'framer-motion'
import { X, Ruler } from 'lucide-react'
import { useEffect, useRef } from 'react'

export default function SizeGuideModal({ isOpen, onClose, sizeChart, productName = '', selectedSize = '' }) {
  const modalRef = useRef(null)
  const closeButtonRef = useRef(null)

  // Handle keyboard accessibility
  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus()
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }

    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  // Focus trap
  useEffect(() => {
    if (!isOpen || !modalRef.current) return

    const focusableElements = modalRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    const handleTab = (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault()
            lastElement?.focus()
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault()
            firstElement?.focus()
          }
        }
      }
    }

    modalRef.current.addEventListener('keydown', handleTab)
    return () => modalRef.current?.removeEventListener('keydown', handleTab)
  }, [isOpen])

  if (!sizeChart || !sizeChart.enabled || !sizeChart.measurements?.length || !sizeChart.rows?.length) {
    return null
  }

  const activeRows = sizeChart.rows.filter(row => row.size)

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50"
            aria-hidden="true"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              ref={modalRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="size-guide-title"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 bg-stone-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-stone-900 flex items-center justify-center">
                    <Ruler size={18} className="text-white" />
                  </div>
                  <div>
                    <h2 id="size-guide-title" className="text-lg font-semibold text-stone-900">
                      SIZE GUIDE
                    </h2>
                    {productName && (
                      <p className="text-xs text-stone-500 mt-0.5 line-clamp-1">{productName}</p>
                    )}
                  </div>
                </div>
                <button
                  ref={closeButtonRef}
                  onClick={onClose}
                  className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-stone-200 transition-colors text-stone-500 hover:text-stone-900"
                  aria-label="Close size guide"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="mb-4 flex items-center gap-2 flex-wrap">
                  {sizeChart.unit && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 rounded-full text-xs font-mono text-stone-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
                      All measurements in {sizeChart.unit === 'in' ? 'inches' : 'centimetres'}
                    </span>
                  )}
                  {sizeChart.preset && sizeChart.preset !== 'custom' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 rounded-full text-xs font-mono text-white">
                      {sizeChart.preset.charAt(0).toUpperCase() + sizeChart.preset.slice(1)}
                    </span>
                  )}
                </div>

                {activeRows.length > 0 && sizeChart.measurements.length > 0 ? (
                  <div className="overflow-x-auto -mx-6 px-6">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-stone-50 border-b-2 border-stone-200">
                          <th className="px-4 py-3 text-left text-[10px] font-mono tracking-[0.2em] uppercase text-stone-500 w-16 sticky left-0 bg-stone-50">
                            Size
                          </th>
                          {sizeChart.measurements.map(m => (
                            <th key={m.key} className="px-4 py-3 text-left text-[10px] font-mono tracking-[0.2em] uppercase text-stone-500 min-w-[100px] whitespace-nowrap">
                              {m.label}
                              <span className="ml-1.5 normal-case text-stone-400 font-normal tracking-normal">
                                ({sizeChart.unit})
                              </span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {activeRows.map((row, i) => (
                          <tr key={row.size} className={`${row.size === selectedSize ? 'bg-gold-300/20 ring-1 ring-inset ring-gold-400' : i % 2 === 0 ? 'bg-white' : 'bg-stone-50/50'} border-b border-stone-100 hover:bg-stone-50 transition-colors`}>
                            <td className="px-4 py-3 sticky left-0 bg-inherit">
                              <span className="font-mono text-sm font-semibold text-stone-900 bg-stone-100 px-3 py-1.5 rounded-lg inline-block">
                                {row.size}
                              </span>
                            </td>
                            {sizeChart.measurements.map(m => (
                              <td key={m.key} className="px-4 py-3 text-stone-600 font-mono text-sm">
                                {row.values?.[m.key] || '—'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Ruler size={48} className="text-stone-200 mx-auto mb-4" />
                    <p className="text-stone-400">No size chart data available</p>
                  </div>
                )}

                <div className="mt-6 p-4 bg-cream-50 rounded-xl border border-cream-100">
                  <p className="text-xs text-stone-500 leading-relaxed">
                    <strong className="text-stone-700">Note:</strong> Measurements are approximate. 
                    If you're between sizes, we recommend sizing up for a more comfortable fit. 
                    For specific measurements, please contact our customer service.
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-stone-100 bg-stone-50">
                <button
                  onClick={onClose}
                  className="w-full py-3 bg-stone-900 text-white rounded-xl font-medium text-sm hover:bg-stone-800 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
