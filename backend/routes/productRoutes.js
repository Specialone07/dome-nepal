const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const Product = require('../models/Product');

const {
  getProducts,
  getProduct,
  getFeaturedProducts,
  getNewArrivals,
  getBestSellers,
  getRelatedProducts,
  searchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories
} = require('../controllers/productController');

const { protect, adminOnly } = require('../middleware/authMiddleware');

// ✅ IMPORT MULTER CLOUDINARY UPLOAD
const { upload } = require('../config/cloudinary'); 
// 🔴 IMPORTANT: adjust path if your file is elsewhere

// ========================
// PUBLIC ROUTES
// ========================
router.get('/search', searchProducts);
router.get('/featured', getFeaturedProducts);
router.get('/new-arrivals', getNewArrivals);
router.get('/best-sellers', getBestSellers);
router.get('/categories', getCategories);
router.post('/bulk', protect, adminOnly, asyncHandler(async (req, res) => {
  const rows = Array.isArray(req.body.rows) ? req.body.rows.slice(0, 500) : [];
  if (!rows.length) { res.status(400); throw new Error('No product rows supplied'); }
  const groups = new Map();
  const skus = new Set();
  rows.forEach((row, index) => {
    const name = String(row.name || '').trim();
    const price = Number(row.price);
    const stock = Number(row.stock || 0);
    if (!name || !Number.isFinite(price) || price < 0 || !Number.isInteger(stock) || stock < 0) {
      res.status(400); throw new Error(`Invalid product data on row ${index + 1}`);
    }
    const key = name.toLowerCase();
    const product = groups.get(key) || {
      name, description: String(row.description || `Imported product: ${name}`), price,
      category: row.category || 'tops', gender: row.gender || 'unisex',
      images: row.image ? [{ url: String(row.image).trim(), alt: name }] : [], variants: []
    };
    if (groups.has(key) && product.price !== price) { res.status(400); throw new Error(`Conflicting price for ${name} on row ${index + 1}`); }
    const size = String(row.size || 'M').trim();
    const color = String(row.color || 'Black').trim();
    if (product.variants.some(variant => variant.size.toLowerCase() === size.toLowerCase() && variant.color.toLowerCase() === color.toLowerCase())) {
      res.status(400); throw new Error(`Duplicate ${size} / ${color} variant for ${name} on row ${index + 1}`);
    }
    const sku = String(row.sku || `BULK-${Date.now()}-${index}`).trim();
    if (skus.has(sku.toLowerCase())) { res.status(400); throw new Error(`Duplicate SKU ${sku} on row ${index + 1}`); }
    skus.add(sku.toLowerCase());
    product.variants.push({
      size, color,
      colorHex: row.colorHex || '#000000', stock,
      sku
    });
    groups.set(key, product);
  });
  const session = await mongoose.startSession();
  let products = [];
  try {
    await session.withTransaction(async () => {
      products = await Product.create([...groups.values()], { session });
    });
  } finally {
    await session.endSession();
  }
  res.status(201).json({ success: true, data: { products, count: products.length } });
}));
router.get('/admin/list', protect, adminOnly, asyncHandler(async (req, res) => {
  const { page = 1, limit = 15, search = '', stock = '' } = req.query;
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 15));
  const filter = {};
  if (search.trim()) filter.$or = [
    { name: { $regex: search.trim(), $options: 'i' } },
    { slug: { $regex: search.trim(), $options: 'i' } },
    { 'variants.sku': { $regex: search.trim(), $options: 'i' } }
  ];
  if (stock === 'out') filter.variants = { $not: { $elemMatch: { stock: { $gt: 0 } } } };
  if (stock === 'low') filter.$expr = { $and: [
    { $gt: [{ $sum: '$variants.stock' }, 0] },
    { $lte: [{ $sum: '$variants.stock' }, 10] }
  ] };
  const [products, total] = await Promise.all([
    Product.find(filter).sort({ createdAt: -1 }).skip((safePage - 1) * safeLimit).limit(safeLimit),
    Product.countDocuments(filter)
  ]);
  res.json({ success: true, data: { products, pagination: { page: safePage, limit: safeLimit, total, pages: Math.ceil(total / safeLimit) } } });
}));
router.patch('/admin/:id/active', protect, adminOnly, asyncHandler(async (req, res) => {
  if (typeof req.body.isActive !== 'boolean') { res.status(400); throw new Error('isActive must be a boolean'); }
  const product = await Product.findByIdAndUpdate(req.params.id, { isActive: req.body.isActive }, { new: true, runValidators: true });
  if (!product) { res.status(404); throw new Error('Product not found'); }
  res.json({ success: true, data: { product } });
}));
router.get('/', getProducts);
router.get('/:identifier', getProduct);
router.get('/:id/related', getRelatedProducts);

// ========================
// ADMIN PRODUCT ROUTES
// ========================

// 🔥 CREATE PRODUCT (FIXED IMAGE UPLOAD)
router.post(
  '/',
  protect,
  adminOnly,
  upload.array('images', 10),   // 👈 THIS IS THE FIX
  createProduct
);

// 🔥 UPDATE PRODUCT (FIXED IMAGE UPLOAD)
router.put(
  '/:id',
  protect,
  adminOnly,
  upload.array('images', 10),   // 👈 THIS IS THE FIX
  updateProduct
);

// DELETE PRODUCT
router.delete(
  '/:id',
  protect,
  adminOnly,
  deleteProduct
);

module.exports = router;
