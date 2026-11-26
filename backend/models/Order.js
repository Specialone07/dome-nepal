const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name: { type: String, required: true },
  image: { type: String, required: true },
  price: { type: Number, required: true },
  size: { type: String, required: true },
  color: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 }
});

const trackingEventSchema = new mongoose.Schema({
  status: { type: String, required: true },
  message: { type: String, required: true },
  location: { type: String, default: '' },
  actor: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now }
});

const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  guestId: { type: String, index: true, select: false },
  isGuest: { type: Boolean, default: true },
  items: [orderItemSchema],
  shippingAddress: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    street: { type: String, required: true },
    city: { type: String, required: true },
    district: { type: String, required: true },
    state: { type: String, required: true },
    landmark: { type: String, default: '' },
    zip: { type: String, required: false },
    country: { type: String, required: true },
    phone: { type: String, required: true }
  },
  paymentMethod: { type: String, enum: ['card', 'cash_on_delivery', 'esewa', 'khalti', 'fonepay_qr'], required: true },
  paymentResult: {
    id: String,
    status: String, // awaiting_verification | verified | rejected
    updateTime: String,
    email: String,
    payerName: String,
    verifiedAt: Date,
    verifiedBy: String,
    note: String
  },
  subtotal: { type: Number, required: true },
  shippingPrice: { type: Number, required: true, default: 0 },
  shippingZone: { type: Number, default: 0 },
  deliveryEta: { type: String, default: '' },
  taxPrice: { type: Number, required: true, default: 0 },
  totalPrice: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  couponCode: { type: String, default: '' },
  status: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'refunded'],
    default: 'pending'
  },
  trackingNumber: { type: String, default: '' },
  trackingEvents: [trackingEventSchema],
  isPaid: { type: Boolean, default: false },
  paidAt: { type: Date },
  isDelivered: { type: Boolean, default: false },
  deliveredAt: { type: Date },
  notes: { type: String, default: '' }
}, { timestamps: true });

orderSchema.pre('save', async function () {
  if (!this.orderNumber) {
    this.orderNumber =
      'DN-' +
      Date.now().toString(36).toUpperCase() +
      '-' +
      uuidv4().slice(0, 6).toUpperCase();
  }
});
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ orderNumber: 1, 'shippingAddress.email': 1 });

module.exports = mongoose.model('Order', orderSchema);
