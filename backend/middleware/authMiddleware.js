const asyncHandler = require('express-async-handler')
const { verifyAccessToken } = require('../utils/jwt')
const User = require('../models/User')

// ─── Protect: verify accessToken from httpOnly cookie ───────────
const protect = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.accessToken

  if (!token) {
    res.status(401)
    throw new Error('Not authenticated')
  }

  let decoded
  try {
    decoded = verifyAccessToken(token)
  } catch {
    res.status(401)
    throw new Error('Session expired. Please log in again.')
  }

  const user = await User.findById(decoded.id).select('-password -refreshTokens')

  if (!user) {
    res.status(401)
    throw new Error('User no longer exists')
  }

  if (!user.isActive) {
    res.status(403)
    throw new Error('Account deactivated')
  }

  req.user = user
  next()
})

// ─── Admin guard: must be admin or superadmin ────────────────────
const adminOnly = (req, res, next) => {
  if (!['admin', 'superadmin'].includes(req.user?.role)) {
    res.status(403)
    throw new Error('Admin access only')
  }
  next()
}
// ─── Optional Auth: attaches req.user if token exists, never blocks ───
const optionalAuth = asyncHandler(async (req, res, next) => {
  const token = req.cookies?.accessToken
  if (!token) return next() // no token → continue as guest

  try {
    const decoded = verifyAccessToken(token)
    const user = await User.findById(decoded.id).select('-password -refreshTokens')
    if (user && user.isActive) req.user = user
    else if (req.cookies?.refreshToken) {
      res.status(401)
      throw new Error('Account is unavailable')
    }
  } catch {
    if (req.cookies?.refreshToken) {
      res.status(401)
      throw new Error('Session expired. Please refresh and try again.')
    }
  }

  next()
})

module.exports = { protect, optionalAuth, adminOnly }
