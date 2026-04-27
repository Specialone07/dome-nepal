const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const User = require('../models/User');
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
  const { page = 1, limit = 20 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);
  const [users, total] = await Promise.all([
    User.find().sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    User.countDocuments()
  ]);
  res.json({ success: true, data: { users, total } });
}));

module.exports = router;