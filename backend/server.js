const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// ── IMPORT AUTH MIDDLEWARE ─────────────────────────────
const { protect, adminOnly } = require('./middleware/authMiddleware');

// ── Route imports ──────────────────────────────────────
let authRoutes, productRoutes, orderRoutes, userRoutes,
    reviewRoutes, wishlistRoutes, uploadRoutes, adminRoutes;

try {
  authRoutes     = require('./routes/authRoutes');
  productRoutes  = require('./routes/productRoutes');
  orderRoutes    = require('./routes/orderRoutes');
  userRoutes     = require('./routes/userRoutes');
  reviewRoutes   = require('./routes/reviewRoutes');
  wishlistRoutes = require('./routes/wishlistRoutes');
  uploadRoutes   = require('./routes/uploadRoutes');
  adminRoutes    = require('./routes/adminRoutes');
} catch (err) {
  console.error('❌ Failed to load route:', err.message, err.stack);
  process.exit(1);
}

const { errorHandler, notFound } = require('./middleware/errorMiddleware');

const app = express();

// ── SECURITY ───────────────────────────────────────────
app.use(helmet());

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-guest-id']
}));

// ── RATE LIMIT SETUP ───────────────────────────────────

// 🌍 General limiter (loose)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 1000 : 200,
});

// 🔐 Strict limiter ONLY for admin login
const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 100 : 5,
  message: 'Too many login attempts. Try again later.'
});

// Apply general limiter to all API routes
app.use('/api', generalLimiter);

// ── BODY PARSERS ───────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// =====================================================
// ✅ PUBLIC ROUTES
// =====================================================

// Apply login limiter ONLY to this endpoint
app.use('/api/auth/admin-login', adminLoginLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);

// =====================================================
// ✅ MIXED ROUTES (GUEST + USER)
// =====================================================
app.use('/api/orders', orderRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/wishlist', wishlistRoutes);

// =====================================================
// ✅ USER ROUTES (LOGIN REQUIRED)
// =====================================================
app.use('/api/users', protect, userRoutes);

// =====================================================
// 🔥 ADMIN ROUTES (STRICT)
// =====================================================
app.use('/api/admin', protect, adminOnly, adminRoutes);

// =====================================================
// 📤 UPLOAD ROUTES
// =====================================================
app.use('/api/upload', protect, adminOnly, uploadRoutes);

// =====================================================
// ❤️ HEALTH CHECK
// =====================================================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV
  });
});

// =====================================================
// ❌ ERROR HANDLING
// =====================================================
app.use(notFound);
app.use(errorHandler);

// =====================================================
// 🗄️ DATABASE + SERVER
// =====================================================
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 10000,
  family: 4,
})
.then(() => {
  console.log('✅ MongoDB Connected');
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
})
.catch(err => {
  console.error('❌ DB Connection Error:', err.message);
  process.exit(1);
});

module.exports = app;