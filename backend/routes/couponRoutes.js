const express = require('express');
const asyncHandler = require('express-async-handler');
const Coupon = require('../models/Coupon');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(protect, adminOnly);

const couponPayload = body => {
  const payload = {};
  for (const field of ['code', 'type', 'value', 'minimumOrder', 'maximumDiscount', 'usageLimit', 'startsAt', 'expiresAt', 'isActive']) {
    if (body[field] !== undefined) payload[field] = body[field];
  }
  if (payload.code) payload.code = String(payload.code).trim().toUpperCase();
  if (payload.type === 'percent' && Number(payload.value) > 100) throw Object.assign(new Error('Percentage discount cannot exceed 100%'), { statusCode: 400 });
  if (payload.startsAt && payload.expiresAt && new Date(payload.expiresAt) <= new Date(payload.startsAt)) throw Object.assign(new Error('Expiry must be after the start date'), { statusCode: 400 });
  return payload;
};

router.get('/', asyncHandler(async (_req, res) => {
  const coupons = await Coupon.find().sort({ createdAt: -1 });
  res.json({ success: true, data: { coupons } });
}));

router.post('/', asyncHandler(async (req, res) => {
  const coupon = await Coupon.create(couponPayload(req.body));
  res.status(201).json({ success: true, data: { coupon } });
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const coupon = await Coupon.findByIdAndUpdate(req.params.id, couponPayload(req.body), { new: true, runValidators: true });
  if (!coupon) { res.status(404); throw new Error('Coupon not found'); }
  res.json({ success: true, data: { coupon } });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const coupon = await Coupon.findByIdAndDelete(req.params.id);
  if (!coupon) { res.status(404); throw new Error('Coupon not found'); }
  res.json({ success: true, message: 'Coupon deleted' });
}));

module.exports = router;
