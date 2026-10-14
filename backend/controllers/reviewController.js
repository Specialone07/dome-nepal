const asyncHandler = require('express-async-handler');
const Review = require('../models/Review');
const Order = require('../models/Order');

// @desc  Get reviews for a product
// @route GET /api/reviews/product/:productId
const getProductReviews = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, sort = '-createdAt' } = req.query;
  const skip = (Number(page) - 1) * Number(limit);
  const [reviews, total] = await Promise.all([
    Review.find({ product: req.params.productId, isApproved: true })
      .sort(sort).skip(skip).limit(Number(limit))
      .populate('user', 'name avatar'),
    Review.countDocuments({ product: req.params.productId, isApproved: true })
  ]);

  const ratingDist = await Review.aggregate([
    { $match: { product: require('mongoose').Types.ObjectId.createFromHexString(req.params.productId), isApproved: true } },
    { $group: { _id: '$rating', count: { $sum: 1 } } }
  ]);

  res.json({ success: true, data: { reviews, total, ratingDist, pages: Math.ceil(total / Number(limit)) } });
});

// @desc  Create review
// @route POST /api/reviews
const createReview = asyncHandler(async (req, res) => {
  const { product, rating, title, body } = req.body;

  // Check if already reviewed
  const existing = await Review.findOne({ product, user: req.user._id });
  if (existing) { res.status(400); throw new Error('You have already reviewed this product'); }

  // Check verified purchase
  const purchase = await Order.findOne({
    user: req.user._id,
    'items.product': product,
    status: 'delivered'
  });

  const review = await Review.create({
    product, user: req.user._id, rating, title, body,
    isVerifiedPurchase: !!purchase
  });

  await review.populate('user', 'name avatar');
  res.status(201).json({ success: true, data: { review } });
});

// @desc  Mark review helpful
// @route PATCH /api/reviews/:id/helpful
const markHelpful = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) { res.status(404); throw new Error('Review not found'); }
  const idx = review.helpful.findIndex(id => id.toString() === req.user._id.toString());
  if (idx > -1) review.helpful.splice(idx, 1);
  else review.helpful.push(req.user._id);
  await review.save();
  res.json({ success: true, data: { helpfulCount: review.helpful.length } });
});

// @desc  Delete review
// @route DELETE /api/reviews/:id
const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) { res.status(404); throw new Error('Review not found'); }
  if (review.user.toString() !== req.user._id.toString() && !['admin', 'superadmin'].includes(req.user.role)) {
    res.status(403); throw new Error('Not authorized');
  }
  await review.deleteOne();
  res.json({ success: true, message: 'Review deleted' });
});

module.exports = { getProductReviews, createReview, markHelpful, deleteReview };
