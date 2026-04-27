const express = require('express')
const router  = express.Router()
const { protect, adminOnly } = require('../middleware/authMiddleware')
const {
  register,
  login,
  adminLogin,
  refreshToken,
  logout,
  getMe,
} = require('../controllers/authController')

router.post('/register',     register)
router.post('/login',        login)
router.post('/admin-login',  adminLogin)
router.post('/refresh',      refreshToken)

// ✅ logout and /me are protected — req.user is always set
router.post('/logout', protect, logout)
router.get('/me',      protect, adminOnly, getMe)

module.exports = router