import { useState } from 'react'
import { motion } from 'framer-motion'
import { Star } from 'lucide-react'

export default function StarRating({ value = 0, onChange, size = 16, readonly = false, showCount, count }) {
  const [hovered, setHovered] = useState(0)
  const display = hovered || value

  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <motion.button
            key={star}
            type="button"
            disabled={readonly}
            onClick={() => !readonly && onChange?.(star)}
            onMouseEnter={() => !readonly && setHovered(star)}
            onMouseLeave={() => !readonly && setHovered(0)}
            whileHover={!readonly ? { scale: 1.2 } : {}}
            whileTap={!readonly ? { scale: 0.9 } : {}}
            className={readonly ? 'cursor-default' : 'cursor-pointer'}
          >
            <motion.div
              animate={{ scale: star <= display && hovered ? 1.1 : 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            >
              <Star
                size={size}
                className={`transition-colors duration-150 ${
                  star <= display ? 'fill-gold-400 text-gold-400' : 'fill-transparent text-stone-300'
                }`}
              />
            </motion.div>
          </motion.button>
        ))}
      </div>
      {showCount && (
        <span className="text-xs text-stone-400 font-mono ml-1">({count || 0})</span>
      )}
    </div>
  )
}