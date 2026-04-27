// Format price in NPR
export const formatPrice = (amount) => {
  return new Intl.NumberFormat('ne-NP', {
    style: 'currency',
    currency: 'NPR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}


// Format date
export const formatDate = (date) => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  }).format(new Date(date))
}

// Capitalize first letter
export const capitalize = (str) => str ? str.charAt(0).toUpperCase() + str.slice(1) : ''

// Truncate text
export const truncate = (str, n) => str?.length > n ? str.slice(0, n) + '...' : str

// Generate star array
export const getStars = (rating) => {
  return Array.from({ length: 5 }, (_, i) => {
    if (i < Math.floor(rating)) return 'full'
    if (i < rating) return 'half'
    return 'empty'
  })
}

// Debounce
export const debounce = (fn, delay) => {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

// Get error message
export const getErrorMessage = (error) => {
  return error?.response?.data?.message || error?.message || 'Something went wrong'
}

// Order status config
export const ORDER_STATUSES = {
  pending:          { label: 'Pending',          color: 'text-amber-600',  bg: 'bg-amber-50',  step: 0 },
  processing:       { label: 'Processing',       color: 'text-blue-600',   bg: 'bg-blue-50',   step: 1 },
  shipped:          { label: 'Shipped',           color: 'text-purple-600', bg: 'bg-purple-50', step: 2 },
  out_for_delivery: { label: 'Out for Delivery',  color: 'text-indigo-600', bg: 'bg-indigo-50', step: 3 },
  delivered:        { label: 'Delivered',         color: 'text-green-600',  bg: 'bg-green-50',  step: 4 },
  cancelled:        { label: 'Cancelled',         color: 'text-red-600',    bg: 'bg-red-50',    step: -1 },
  refunded:         { label: 'Refunded',          color: 'text-stone-600',  bg: 'bg-stone-50',  step: -1 },
}

export const CATEGORIES = [
  { value: 'tops',       label: 'Tops',       emoji: '👕' },
  { value: 'bottoms',    label: 'Bottoms',    emoji: '👖' },
  { value: 'outerwear',  label: 'Outerwear',  emoji: '🧥' },
  { value: 'dresses',    label: 'Dresses',    emoji: '👗' },
  { value: 'accessories',label: 'Accessories',emoji: '👜' },
  { value: 'footwear',   label: 'Footwear',   emoji: '👟' },
  { value: 'activewear', label: 'Activewear', emoji: '🏃' },
]

export const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']