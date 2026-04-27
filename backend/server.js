const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

// ── CORE IMPORTS ─────────────────────────────
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// ── AUTH MIDDLEWARE ──────────────────────────
const { protect, adminOnly } = require('./middleware/authMiddleware');

// ── ROUTES ───────────────────────────────────
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const userRoutes = require('./routes/userRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const wishlistRoutes = require('./routes/wishlistRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const adminRoutes = require('./routes/adminRoutes');

const { errorHandler, notFound } = require('./middleware/errorMiddleware');

// ── APP INIT ─────────────────────────────────
const app = express();

// ── SECURITY ─────────────────────────────────
app.use(helmet());

app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://dome-nepal-umber.vercel.app/',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-guest-id']
}));

// ── RATE LIMITING ────────────────────────────
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 1000 : 200,
});

const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 100 : 5,
  message: 'Too many login attempts. Try again later.'
});

app.use('/api', generalLimiter);
app.use('/api/auth/admin-login', adminLoginLimiter);

// ── BODY PARSERS ─────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ── ROUTES ──────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);

app.use('/api/orders', orderRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/wishlist', wishlistRoutes);

app.use('/api/users', protect, userRoutes);
app.use('/api/admin', protect, adminOnly, adminRoutes);
app.use('/api/upload', protect, adminOnly, uploadRoutes);

// ── HEALTH CHECK ─────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV
  });
});

// ── ERROR HANDLING ───────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── DATABASE + SERVER START ──────────────────
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
.catch((err) => {
  console.error('❌ MongoDB Connection Error:', err.message);
  process.exit(1);
});

module.exports = app;