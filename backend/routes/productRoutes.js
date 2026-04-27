const express = require('express');
const router = express.Router();

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