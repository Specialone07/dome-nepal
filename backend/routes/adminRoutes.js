const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.use(protect, adminOnly);

router.get('/stats', asyncHandler(async (req, res) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  const [
    totalOrders, monthOrders, lastMonthOrders,
    totalRevenue, monthRevenue,
    totalProducts, totalUsers, monthUsers,
    recentOrders, topProducts, ordersByStatus,
    pendingOrders, guestOrders, unpaidOrders, lowStockProducts, outOfStockProducts
  ] = await Promise.all([
    Order.countDocuments(),
    Order.countDocuments({ createdAt: { $gte: startOfMonth } }),
    Order.countDocuments({ createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } }),
    Order.aggregate([
      { $match: { isPaid: true } },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } }
    ]),
    Order.aggregate([
      { $match: { isPaid: true, createdAt: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } }
    ]),
    Product.countDocuments({ isActive: true }),
    User.countDocuments({ role: 'user' }),
    User.countDocuments({ role: 'user', createdAt: { $gte: startOfMonth } }),
    Order.find().sort({ createdAt: -1 }).limit(5).populate('user', 'name email'),
    Product.find({ isActive: true }).sort({ totalSold: -1 }).limit(5)
      .select('name images totalSold price'),
    Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Order.countDocuments({ status: { $in: ['pending', 'processing'] } }),
    Order.countDocuments({ isGuest: true }),
    Order.countDocuments({ isPaid: false, status: { $nin: ['cancelled', 'refunded'] } }),
    Product.countDocuments({ isActive: true, $expr: { $and: [{ $gt: [{ $sum: '$variants.stock' }, 0] }, { $lte: [{ $sum: '$variants.stock' }, 10] }] } }),
    Product.countDocuments({ isActive: true, variants: { $not: { $elemMatch: { stock: { $gt: 0 } } } } })
  ]);

  const revenueByDay = await Order.aggregate([
    {
      $match: {
        isPaid: true,
        createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        revenue: { $sum: '$totalPrice' },
        orders: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  res.json({
    success: true,
    data: {
      totalOrders, monthOrders, lastMonthOrders,
      totalRevenue: totalRevenue[0]?.total || 0,
      monthRevenue: monthRevenue[0]?.total || 0,
      totalProducts, totalUsers, monthUsers,
      recentOrders, topProducts, ordersByStatus, revenueByDay,
      pendingOrders, guestOrders, unpaidOrders, lowStockProducts, outOfStockProducts
    }
  });
}));

module.exports = router;
