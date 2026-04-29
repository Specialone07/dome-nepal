const jwt = require('jsonwebtoken')

const ACCESS_TOKEN_SECRET  = process.env.ACCESS_TOKEN_SECRET
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET

const isProd = process.env.NODE_ENV === 'production'

// ── Generate Tokens ──────────────────────────────────────────────
const generateAccessToken = (id, role) =>
  jwt.sign({ id, role }, ACCESS_TOKEN_SECRET, { expiresIn: '15m' })

const generateRefreshToken = (id) =>
  jwt.sign({ id }, REFRESH_TOKEN_SECRET, { expiresIn: '7d' })

// ── Verify Tokens ────────────────────────────────────────────────
const verifyAccessToken  = (token) => jwt.verify(token, ACCESS_TOKEN_SECRET)
const verifyRefreshToken = (token) => jwt.verify(token, REFRESH_TOKEN_SECRET)

// ── Cookie Options ───────────────────────────────────────────────
const accessCookieOptions = {
  httpOnly: true,
  secure: isProd,         // ✅ HTTPS only in production
  sameSite: isProd ? 'None' : 'Lax', // ✅ 'None' required for cross-origin in prod
  maxAge: 15 * 60 * 1000             // 15 minutes
}

const refreshCookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? 'None' : 'Lax',
  maxAge: 7 * 24 * 60 * 60 * 1000   // 7 days
}

// ── Set Cookies ──────────────────────────────────────────────────
const setAccessTokenCookie = (res, token) =>
  res.cookie('accessToken', token, accessCookieOptions)

const setRefreshTokenCookie = (res, token) =>
  res.cookie('refreshToken', token, refreshCookieOptions)

// ── Clear Cookies ────────────────────────────────────────────────
const clearAuthCookies = (res) => {
  res.clearCookie('accessToken',  { ...accessCookieOptions,  maxAge: 0 })
  res.clearCookie('refreshToken', { ...refreshCookieOptions, maxAge: 0 })
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