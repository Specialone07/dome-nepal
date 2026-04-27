import { motion } from 'framer-motion'

export default function Button({
  children, onClick, type = 'button', variant = 'primary',
  size = 'md', loading = false, disabled = false, className = '', fullWidth = false, icon
}) {
  const base = `relative overflow-hidden inline-flex items-center justify-center gap-2 font-body font-medium tracking-widest uppercase focus:outline-none transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed`
  const sizes = { sm: 'text-[10px] px-5 py-2.5', md: 'text-xs px-8 py-3.5', lg: 'text-xs px-10 py-4' }
  const variants = {
    primary: 'bg-obsidian-900 text-cream-50 hover:bg-obsidian-700',
    outline: 'border border-obsidian-900 text-obsidian-900 hover:bg-obsidian-900 hover:text-cream-50',
    gold: 'bg-gold-400 text-obsidian-900 hover:bg-gold-500',
    ghost: 'text-obsidian-900 hover:bg-stone-100',
    danger: 'bg-red-500 text-white hover:bg-red-600',
  }

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      whileHover={{ scale: disabled || loading ? 1 : 1.01 }}
      whileTap={{ scale: disabled || loading ? 1 : 0.98 }}
      className={`${base} ${sizes[size]} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
            className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full inline-block"
          />
          Processing...
        </span>
      ) : (
        <>
          {icon && <span>{icon}</span>}
          {children}
        </>
      )}
    </motion.button>
  )
}