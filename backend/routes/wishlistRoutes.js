const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)
    .populate('wishlist', 'name slug images price comparePrice ratingsAverage ratingsCount');
  res.json({ success: true, data: { wishlist: user.wishlist } });
}));

router.post('/toggle/:productId', asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const idx = user.wishlist.indexOf(req.params.productId);
  let action;
  if (idx > -1) { user.wishlist.splice(idx, 1); action = 'removed'; }
  else { user.wishlist.push(req.params.productId); action = 'added'; }
  await user.save({ validateBeforeSave: false });
  res.json({ success: true, data: { action, wishlist: user.wishlist } });
}));

module.exports = router;