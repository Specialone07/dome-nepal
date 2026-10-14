const asyncHandler = require('express-async-handler')
const bcrypt = require('bcryptjs')
const User = require('../models/User')
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  setAccessTokenCookie,
  setRefreshTokenCookie,
  clearAuthCookies,
} = require('../utils/jwt')

// Dummy hash for timing attack protection on login
const DUMMY_HASH = '$2a$12$dummyhashfortimingprotectionXXXXXXXXXXXXXXXXXXXXXXXX'

// =======================================
// ❌ REGISTER (DISABLED)
// =======================================
const issueSession = async (user, res) => {
  const accessToken = generateAccessToken(user._id, user.role)
  const refreshToken = generateRefreshToken(user._id)
  user.addRefreshToken(refreshToken)
  user.lastLogin = new Date()
  await user.save({ validateBeforeSave: false })
  setAccessTokenCookie(res, accessToken)
  setRefreshTokenCookie(res, refreshToken)
}

const register = asyncHandler(async (req, res) => {
  const name = String(req.body.name || '').trim()
  const email = String(req.body.email || '').trim().toLowerCase()
  const password = String(req.body.password || '')
  if (name.length < 2 || !/^\S+@\S+\.\S+$/.test(email) || password.length < 8) {
    res.status(400)
    throw new Error('Enter a valid name, email, and password of at least 8 characters')
  }
  if (await User.exists({ email })) {
    res.status(409)
    throw new Error('An account with this email already exists')
  }
  const user = await User.create({ name, email, password, role: 'user' })
  await issueSession(user, res)
  res.status(201).json({ success: true, data: { user: user.toJSON() } })
})

// =======================================
// ❌ USER LOGIN (DISABLED)
// =======================================
const login = asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase()
  const password = String(req.body.password || '')
  if (!email || !password) {
    res.status(400)
    throw new Error('Email and password are required')
  }
  const user = await User.findOne({ email }).select('+password +refreshTokens')
  const passwordMatch = user
    ? await user.comparePassword(password)
    : await bcrypt.compare(password, DUMMY_HASH).catch(() => false)
  if (!user || !passwordMatch) {
    res.status(401)
    throw new Error('Invalid email or password')
  }
  if (!user.isActive) {
    res.status(403)
    throw new Error('Account deactivated')
  }
  await issueSession(user, res)
  res.json({ success: true, data: { user: user.toJSON() } })
})

// =======================================
// 🔐 ADMIN LOGIN
// =======================================
const adminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body

  // Basic input validation
  if (!email || !password) {
    res.status(400)
    throw new Error('Email and password are required')
  }

  // ✅ Validate password length BEFORE hashing
  if (password.length < 6) {
    res.status(400)
    throw new Error('Invalid credentials')
  }

  const user = await User.findOne({ email }).select('+password +refreshTokens')

  // ✅ Timing attack protection — always run bcrypt even if user not found
  const passwordMatch = user
    ? await user.comparePassword(password)
    : await bcrypt.compare(password, DUMMY_HASH)

  if (!user || !passwordMatch) {
    res.status(401)
    throw new Error('Invalid credentials')
  }

  if (!user.isActive) {
    res.status(403)
    throw new Error('Account deactivated')
  }

  if (!['admin', 'superadmin'].includes(user.role)) {
    res.status(403)
    throw new Error('Admin access only')
  }

  // Generate tokens
  const accessToken  = generateAccessToken(user._id, user.role)
  const refreshToken = generateRefreshToken(user._id)

  // ✅ Cap sessions & save refresh token
  user.addRefreshToken(refreshToken)
  user.lastLogin = new Date()
  await user.save({ validateBeforeSave: false })

  // ✅ Both tokens in httpOnly cookies — nothing sensitive in response body
  setAccessTokenCookie(res, accessToken)
  setRefreshTokenCookie(res, refreshToken)

  res.json({
    success: true,
    data: { user: user.toJSON() },
  })
})

// =======================================
// 🔄 REFRESH TOKEN
// =======================================
const refreshToken = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken

  if (!token) {
    res.status(401)
    throw new Error('No refresh token')
  }

  // ✅ Wrapped in try/catch — handles expired/malformed tokens
  let decoded
  try {
    decoded = verifyRefreshToken(token)
  } catch {
    res.status(401)
    throw new Error('Invalid or expired refresh token')
  }

  const user = await User.findById(decoded.id).select('+refreshTokens')

  if (!user || !user.refreshTokens.includes(token)) {
    // Possible token reuse attack — clear all sessions
    if (user) {
      user.refreshTokens = []
      await user.save({ validateBeforeSave: false })
    }
    clearAuthCookies(res)
    res.status(401)
    throw new Error('Refresh token reuse detected. Please log in again.')
  }

  // ✅ Rotate tokens
  const newAccessToken  = generateAccessToken(user._id, user.role)
  const newRefreshToken = generateRefreshToken(user._id)

  user.refreshTokens = user.refreshTokens.filter((t) => t !== token)
  user.addRefreshToken(newRefreshToken)
  await user.save({ validateBeforeSave: false })

  setAccessTokenCookie(res, newAccessToken)
  setRefreshTokenCookie(res, newRefreshToken)

  res.json({ success: true })
})

// =======================================
// 🚪 LOGOUT — requires protect middleware
// =======================================
const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken

  // ✅ req.user is guaranteed by protect middleware
  if (token) {
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { refreshTokens: token },
    })
  }

  clearAuthCookies(res)

  res.json({ success: true, message: 'Logged out successfully' })
})

// =======================================
// 👤 GET ADMIN PROFILE
// =======================================
const getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-refreshTokens -password')

  if (!user) {
    res.status(404)
    throw new Error('User not found')
  }

  res.json({ success: true, data: { user } })
})

module.exports = { register, login, adminLogin, refreshToken, logout, getMe }
