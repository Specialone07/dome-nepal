const express = require('express');
const router = express.Router();
const {
  createOrder, quoteOrder, getMyOrders, getOrder,
  updateOrderStatus, cancelOrder, getAllOrders, verifyPayment
} = require('../controllers/orderController');
const { protect, adminOnly, optionalAuth } = require('../middleware/authMiddleware');

// Guest + authenticated users
router.post('/', optionalAuth, createOrder);
router.post('/quote', optionalAuth, quoteOrder);
router.get('/my-orders', optionalAuth, getMyOrders);
router.get('/:id', optionalAuth, getOrder);
router.patch('/:id/cancel', optionalAuth, cancelOrder);

// Admin only
router.patch('/:id/status', protect, adminOnly, updateOrderStatus);
router.patch('/:id/payment', protect, adminOnly, verifyPayment);
router.get('/', protect, adminOnly, getAllOrders);

module.exports = router;
