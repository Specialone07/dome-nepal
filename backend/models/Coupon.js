const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  type: { type: String, enum: ['percent', 'fixed'], default: 'percent' },
  value: { type: Number, required: true, min: 0 },
  minimumOrder: { type: Number, default: 0, min: 0 },
  maximumDiscount: { type: Number, default: 0, min: 0 },
  usageLimit: { type: Number, default: 0, min: 0 },
  usedCount: { type: Number, default: 0, min: 0 },
  startsAt: Date,
  expiresAt: Date,
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

couponSchema.index({ isActive: 1, startsAt: 1, expiresAt: 1 });

couponSchema.methods.calculateDiscount = function (subtotal) {
  const raw = this.type === 'percent' ? subtotal * (this.value / 100) : this.value;
  const capped = this.maximumDiscount > 0 ? Math.min(raw, this.maximumDiscount) : raw;
  return Math.max(0, Math.min(Math.round(capped), subtotal));
};

module.exports = mongoose.model('Coupon', couponSchema);
