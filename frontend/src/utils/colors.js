// Turns a colour NAME (what the shop owner types, e.g. "Maroon") into a real swatch colour.
// Stored hex values are often just the placeholder #000000, so the name wins unless the
// stored hex is a genuine colour.

const COLOR_MAP = {
  black: '#1a1a1a', white: '#f5f5f5', 'off white': '#f2efe6', offwhite: '#f2efe6', ivory: '#f4efe0',
  cream: '#efe4c4', beige: '#d4b896', sand: '#d9c7a3', khaki: '#c3b091', tan: '#c19a6b',
  brown: '#795548', chocolate: '#4e342e', coffee: '#6f4e37', camel: '#b98a52',
  maroon: '#7b1e2b', burgundy: '#6d1a2e', wine: '#722f37', red: '#c0392b', rust: '#b7410e',
  orange: '#e67e22', mustard: '#d4a017', yellow: '#f1c40f', gold: '#c9a84c',
  olive: '#6b7a3a', green: '#27ae60', forest: '#2d5a3d', mint: '#98d8b8', sage: '#a3b18a', teal: '#14808a',
  sky: '#87ceeb', blue: '#2980b9', royal: '#2a52be', navy: '#1b2a4a', denim: '#3b5b82',
  lavender: '#b9a6d9', purple: '#8e44ad', violet: '#7d3c98', pink: '#e75a9a', peach: '#f6b79a', coral: '#f08a6b',
  grey: '#7f8c8d', gray: '#7f8c8d', charcoal: '#36454f', silver: '#c0c0c0', steel: '#71797e',
}

const mix = (hex, target, t) => {
  const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16))
  const [a, b] = [p(hex), p(target)]
  return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('')
}

const isHex = v => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v)

export function resolveColor(name, storedHex) {
  const key = String(name || '').trim().toLowerCase()
  if (COLOR_MAP[key]) return COLOR_MAP[key]

  // "dark green", "light blue", "sky blue", "navy blue" ...
  const words = key.split(/[\s-]+/).filter(Boolean)
  const last = words[words.length - 1]
  const base = COLOR_MAP[last] || COLOR_MAP[words[0]]
  if (base && words.length > 1) {
    if (words.includes('dark') || words.includes('deep')) return mix(base, '#000000', 0.35)
    if (words.includes('light') || words.includes('pastel') || words.includes('baby')) return mix(base, '#ffffff', 0.45)
    return base
  }

  // a genuine stored colour (not the #000000 placeholder)
  if (isHex(storedHex) && storedHex.toLowerCase() !== '#000000') return storedHex

  // any CSS colour name ("crimson", "turquoise" ...)
  if (typeof document !== 'undefined' && key) {
    const probe = new Option().style
    probe.color = key
    if (probe.color) return key
  }
  return isHex(storedHex) ? storedHex : '#9a9a9a'
}

export function isDarkColor(hex) {
  if (!isHex(hex)) return false
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16))
  return (0.299 * r + 0.587 * g + 0.114 * b) < 90
}
