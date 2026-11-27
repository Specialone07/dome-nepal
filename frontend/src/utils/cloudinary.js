// Delivers Cloudinary photos resized and colour-corrected, straight from the CDN.
// Chain: resize/crop -> auto colour & contrast fix + light sharpen -> best format & quality.
// Non-Cloudinary URLs (e.g. demo photos) are returned untouched.
export function enhance(url, { w, h, gravity = 'auto', improve = 50, sharpen = 60 } = {}) {
  if (!url || !url.includes('res.cloudinary.com') || !url.includes('/image/upload/')) return url
  const crop = [w && h ? 'c_fill' : w ? 'c_limit' : '', gravity && w && h ? `g_${gravity}` : '', w ? `w_${w}` : '', h ? `h_${h}` : '']
    .filter(Boolean).join(',')
  const fix = [improve ? `e_improve:${improve}` : '', sharpen ? `e_sharpen:${sharpen}` : ''].filter(Boolean).join(',')
  const chain = [crop, fix, 'f_auto,q_auto'].filter(Boolean).join('/')
  // keep any existing version segment (v123...) after the transformation chain
  return url.replace('/image/upload/', `/image/upload/${chain}/`)
}
