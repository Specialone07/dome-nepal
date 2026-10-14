const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Order = require('../models/Order');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.use(protect);

// Update profile
router.put('/profile', asyncHandler(async (req, res) => {
  const { name, phone, avatar } = req.body;
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { name, phone, avatar },
    { new: true, runValidators: true }
  );
  res.json({ success: true, data: { user } });
}));

// Change password
router.put('/change-password', asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
    res.status(400); throw new Error('New password must be at least 8 characters');
  }
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(currentPassword))) {
    res.status(400); throw new Error('Current password is incorrect');
  }
  user.password = newPassword;
  await user.save();
  res.json({ success: true, message: 'Password updated' });
}));

// Add address
router.post('/addresses', asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (req.body.isDefault || user.addresses.length === 0) {
    user.addresses.forEach(address => { address.isDefault = false; });
    req.body.isDefault = true;
  }
  user.addresses.push(req.body);
  await user.save({ validateBeforeSave: false });
  res.json({ success: true, data: { addresses: user.addresses } });
}));

// Update address
router.put('/addresses/:addressId', asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const addr = user.addresses.id(req.params.addressId);
  if (!addr) { res.status(404); throw new Error('Address not found'); }
  Object.assign(addr, req.body);
  await user.save({ validateBeforeSave: false });
  res.json({ success: true, data: { addresses: user.addresses } });
}));

// Delete address
router.delete('/addresses/:addressId', asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  user.addresses.pull({ _id: req.params.addressId });
  await user.save({ validateBeforeSave: false });
  res.json({ success: true, data: { addresses: user.addresses } });
}));

// Admin: get all users
router.get('/', adminOnly, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search = '', role = '', status = '' } = req.query;
  const skip = (Number(page) - 1) * Number(limit);
  const query = {};
  if (search.trim()) query.$or = ['name', 'email', 'phone'].map(field => ({ [field]: { $regex: search.trim(), $options: 'i' } }));
  if (role && ['user', 'admin', 'superadmin'].includes(role)) query.role = role;
  if (status === 'active') query.isActive = true;
  if (status === 'disabled') query.isActive = false;
  const [users, total] = await Promise.all([
    User.find(query).select('-password -refreshTokens').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
    User.countDocuments(query)
  ]);
  const userIds = users.map(user => user._id);
  const orderStats = await Order.aggregate([
    { $match: { user: { $in: userIds }, status: { $nin: ['cancelled', 'refunded'] } } },
    { $group: { _id: '$user', orderCount: { $sum: 1 }, totalSpent: { $sum: '$totalPrice' } } }
  ]);
  const statsByUser = new Map(orderStats.map(stat => [stat._id.toString(), stat]));
  const enrichedUsers = users.map(user => ({ ...user, orderCount: statsByUser.get(user._id.toString())?.orderCount || 0, totalSpent: statsByUser.get(user._id.toString())?.totalSpent || 0 }));
  res.json({ success: true, data: { users: enrichedUsers, total } });
}));

router.patch('/:id', adminOnly, asyncHandler(async (req, res) => {
  const target = await User.findById(req.params.id);
  if (!target) { res.status(404); throw new Error('User not found'); }
  if (target.role === 'superadmin' && req.user.role !== 'superadmin') { res.status(403); throw new Error('Only a superadmin can modify this account'); }
  if (req.body.role === 'admin' && req.user.role !== 'superadmin') { res.status(403); throw new Error('Only a superadmin can grant admin access'); }
  const updates = {};
  if (typeof req.body.isActive === 'boolean') updates.isActive = req.body.isActive;
  if (req.body.role && ['user', 'admin'].includes(req.body.role)) updates.role = req.body.role;
  const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
  res.json({ success: true, data: { user } });
}));

module.exports = router;
