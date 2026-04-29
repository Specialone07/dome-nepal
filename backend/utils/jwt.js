const jwt = require('jsonwebtoken')

const isProd = process.env.NODE_ENV === 'production'

const COOKIE_OPTIONS_BASE = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? 'None' : 'Lax', // ✅ 'None' required for cross-origin
}

// ─── Token Generators ───────────────────────────────────────────
const generateAccessToken = (userId, role) =>
  jwt.sign(
    { id: userId, role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: '15m' }
  )

const generateRefreshToken = (userId) =>
  jwt.sign(
    { id: userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  )

// ─── Token Verifiers ────────────────────────────────────────────
const verifyAccessToken = (token) =>
  jwt.verify(token, process.env.JWT_ACCESS_SECRET)

const verifyRefreshToken = (token) =>
  jwt.verify(token, process.env.JWT_REFRESH_SECRET)

// ─── Cookie Helpers ─────────────────────────────────────────────
const setAccessTokenCookie = (res, token) =>
  res.cookie('accessToken', token, {
    ...COOKIE_OPTIONS_BASE,
    maxAge: 15 * 60 * 1000,
  })

const setRefreshTokenCookie = (res, token) =>
  res.cookie('refreshToken', token, {
    ...COOKIE_OPTIONS_BASE,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  })

const clearAuthCookies = (res) => {
  res.clearCookie('accessToken',  { ...COOKIE_OPTIONS_BASE, maxAge: 0 })
  res.clearCookie('refreshToken', { ...COOKIE_OPTIONS_BASE, maxAge: 0 })
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  setAccessTokenCookie,
  setRefreshTokenCookie,
  clearAuthCookies,
}