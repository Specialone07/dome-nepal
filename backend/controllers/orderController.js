const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const crypto = require('crypto');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const { sendOrderNotifications } = require('../services/notificationService');

const { getShipping, findDistrict } = require('../utils/nepalShipping');
const STATUSES = ['pending', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'refunded'];
const STATUS_TRANSITIONS = {
  pending: ['processing', 'cancelled'], processing: ['shipped', 'cancelled'],
  shipped: ['out_for_delivery', 'delivered'], out_for_delivery: ['delivered'],
  delivered: ['refunded'], cancelled: [], refunded: []
};
const fail = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });

const normalizeItems = (input) => {
  if (!Array.isArray(input) || !input.length) throw fail('No order items');
  const grouped = new Map();
  for (const raw of input) {
    const item = {
      product: String(raw.product || ''), size: String(raw.size || '').trim(),
      color: String(raw.color || '').trim(), quantity: Number(raw.quantity)
    };
    if (!mongoose.isValidObjectId(item.product) || !item.size || !item.color || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20) {
      throw fail('Invalid product variant or quantity');
    }
    const key = `${item.product}:${item.size.toLowerCase()}:${item.color.toLowerCase()}`;
    const old = grouped.get(key);
    grouped.set(key, old ? { ...old, quantity: old.quantity + item.quantity } : item);
  }
  return [...grouped.values()];
};

const NEPAL_PHONE = /^(?:\+?977[-\s]?)?(?:9[678]\d{8}|0?1\d{7}|0\d{2}[-\s]?\d{6})$/;

const validateAddress = (address) => {
  const required = ['name', 'email', 'phone', 'street', 'city', 'district'];
  if (!address || required.some(field => !String(address[field] || '').trim())) throw fail('Incomplete shipping details');
  if (!/^\S+@\S+\.\S+$/.test(address.email)) throw fail('Enter a valid email address');
  if (!NEPAL_PHONE.test(String(address.phone).trim())) throw fail('Enter a valid Nepal phone number');
  const district = findDistrict(address.district);
  if (!district) throw fail('Select a valid Nepal district');
  const clean = Object.fromEntries(Object.entries(address).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value]));
  return { ...clean, district: district.name, state: district.province, country: 'Nepal' };
};

const findCoupon = async (code, subtotal, session) => {
  if (!code) return null;
  const now = new Date();
  const coupon = await Coupon.findOne({ code: String(code).trim().toUpperCase(), isActive: true }).session(session || null);
  if (!coupon || (coupon.startsAt && coupon.startsAt > now) || (coupon.expiresAt && coupon.expiresAt < now)) throw fail('Coupon is invalid or expired');
  if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) throw fail('Coupon usage limit reached');
  if (subtotal < coupon.minimumOrder) throw fail(`Minimum order for this coupon is Rs. ${coupon.minimumOrder}`);
  return coupon;
};

const buildPricing = async (input, couponCode, session, districtName) => {
  const requested = normalizeItems(input);
  const ids = [...new Set(requested.map(item => item.product))];
  const products = await Product.find({ _id: { $in: ids }, isActive: true }).session(session || null);
  if (products.length !== ids.length) throw fail('One or more products are unavailable');
  const items = requested.map(item => {
    const product = products.find(entry => entry._id.toString() === item.product);
    const variant = product.variants.find(entry => entry.size.toLowerCase() === item.size.toLowerCase() && entry.color.toLowerCase() === item.color.toLowerCase());
    if (!variant) throw fail(`Variant not found for ${product.name}`);
    if (variant.stock < item.quantity) throw fail(`Only ${variant.stock} ${product.name} item(s) remain in ${variant.color} / ${variant.size}`, 409);
    return { product: product._id, name: product.name, image: product.images?.[0]?.url || '', price: product.price, size: variant.size, color: variant.color, quantity: item.quantity };
  });
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const coupon = await findCoupon(couponCode, subtotal, session);
  const discount = coupon ? coupon.calculateDiscount(subtotal) : 0;
  const shipping = districtName ? getShipping(districtName, subtotal) : null;
  if (districtName && !shipping) throw fail('Select a valid Nepal district');
  const shippingPrice = shipping?.fee ?? 0;
  return { items, subtotal, shippingPrice, shipping, taxPrice: 0, discount, totalPrice: subtotal + shippingPrice - discount, coupon };
};

const quoteOrder = asyncHandler(async (req, res) => {
  const p = await buildPricing(req.body.items, req.body.couponCode, null, req.body.district);
  res.json({ success: true, data: { subtotal: p.subtotal, shippingPrice: p.shippingPrice, shipping: p.shipping, shippingPending: !p.shipping, taxPrice: p.taxPrice, discount: p.discount, totalPrice: p.totalPrice, couponCode: p.coupon?.code || '' } });
});

const createOrder = asyncHandler(async (req, res) => {
  const shippingAddress = validateAddress(req.body.shippingAddress);
  const paymentMethod = String(req.body.paymentMethod || 'cash_on_delivery');
  if (!['cash_on_delivery', 'fonepay_qr'].includes(paymentMethod)) throw fail('This payment method is not available');
  let paymentResult;
  if (paymentMethod === 'fonepay_qr') {
    const reference = String(req.body.paymentReference || '').trim();
    if (!/^[A-Za-z0-9-]{6,40}$/.test(reference)) throw fail('Enter the transaction ID shown on your FonePay payment receipt');
    if (await Order.exists({ 'paymentResult.id': reference, paymentMethod: 'fonepay_qr' })) throw fail('This transaction ID has already been used for another order', 409);
    paymentResult = { id: reference, status: 'awaiting_verification', updateTime: new Date().toISOString(), payerName: String(req.body.payerName || '').trim().slice(0, 80) };
  }
  const guestId = req.user ? null : String(req.headers['x-guest-id'] || crypto.randomUUID());
  const session = await mongoose.startSession();
  let order;
  try {
    await session.withTransaction(async () => {
      const p = await buildPricing(req.body.items, req.body.couponCode, session, shippingAddress.district);
      for (const item of p.items) {
        const result = await Product.updateOne(
          { _id: item.product },
          { $inc: { 'variants.$[variant].stock': -item.quantity, totalSold: item.quantity } },
          { session, arrayFilters: [{ 'variant.size': item.size, 'variant.color': item.color, 'variant.stock': { $gte: item.quantity } }] }
        );
        if (!result.modifiedCount) throw fail(`Stock changed for ${item.name}. Please review your bag.`, 409);
      }
      [order] = await Order.create([{
        user: req.user?._id || null, guestId, isGuest: !req.user, items: p.items, shippingAddress, paymentMethod,
        paymentResult, subtotal: p.subtotal, shippingPrice: p.shippingPrice, shippingZone: p.shipping.zone, deliveryEta: p.shipping.eta, taxPrice: p.taxPrice, discount: p.discount,
        couponCode: p.coupon?.code || '', totalPrice: p.totalPrice, status: 'pending',
        trackingEvents: [{ status: 'pending', message: paymentMethod === 'fonepay_qr' ? 'Order placed — payment awaiting verification' : 'Order placed successfully', location: 'Online' }]
      }], { session });
      if (p.coupon) { p.coupon.usedCount += 1; await p.coupon.save({ session }); }
    });
  } finally { await session.endSession(); }
  res.status(201).json({ success: true, message: 'Order placed successfully', data: { order }, ...(guestId ? { guestId } : {}) });
  setImmediate(() => sendOrderNotifications(order).catch(error => console.error('Notification failed:', error.message)));
});

const getMyOrders = asyncHandler(async (req, res) => {
  const guestId = req.headers['x-guest-id'];
  if (!req.user && !guestId) return res.json({ success: true, data: { orders: [] } });
  const orders = await Order.find(req.user ? { user: req.user._id } : { guestId }).sort({ createdAt: -1 });
  res.json({ success: true, data: { orders } });
});

const getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).select('+guestId').populate('user', 'name email');
  if (!order) throw fail('Order not found', 404);
  const admin = ['admin', 'superadmin'].includes(req.user?.role);
  const owner = req.user && order.user?._id?.toString() === req.user._id.toString();
  const guest = !req.user && req.headers['x-guest-id'] && order.guestId === req.headers['x-guest-id'];
  if (!admin && !owner && !guest) throw fail('Not authorized', 403);
  order.guestId = undefined;
  res.json({ success: true, data: { order } });
});

const cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).select('+guestId');
  if (!order) throw fail('Order not found', 404);
  const owner = req.user && order.user?.toString() === req.user._id.toString();
  const guest = !req.user && req.headers['x-guest-id'] && order.guestId === req.headers['x-guest-id'];
  if (!owner && !guest) throw fail('Not authorized', 403);
  if (!['pending', 'processing'].includes(order.status)) throw fail('Order can no longer be cancelled');
  if (order.paymentMethod === 'fonepay_qr' && order.isPaid) throw fail('This order is already paid. Please contact us to cancel it so we can refund you.');
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      order.status = 'cancelled';
      order.trackingEvents.push({ status: 'cancelled', message: String(req.body.reason || 'Cancelled by customer').slice(0, 200), actor: req.user?.name || 'Guest customer' });
      await order.save({ session });
      for (const item of order.items) {
        await Product.updateOne({ _id: item.product }, { $inc: { 'variants.$[variant].stock': item.quantity, totalSold: -item.quantity } }, { session, arrayFilters: [{ 'variant.size': item.size, 'variant.color': item.color }] });
      }
    });
  } finally { await session.endSession(); }
  order.guestId = undefined;
  res.json({ success: true, data: { order } });
});

const getAllOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, search } = req.query;
  const query = status ? { status } : {};
  if (search) {
    const value = String(search).trim();
    query.$or = ['orderNumber', 'shippingAddress.name', 'shippingAddress.email', 'shippingAddress.phone'].map(field => ({ [field]: { $regex: value, $options: 'i' } }));
  }
  const skip = (Number(page) - 1) * Number(limit);
  const [orders, total] = await Promise.all([
    Order.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).populate('user', 'name email'),
    Order.countDocuments(query)
  ]);
  res.json({ success: true, data: { orders, total, pages: Math.ceil(total / Number(limit)) } });
});

const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, message, location, trackingNumber, notes } = req.body;
  if (!STATUSES.includes(status)) throw fail('Invalid order status');
  const order = await Order.findById(req.params.id);
  if (!order) throw fail('Order not found', 404);
  const previousStatus = order.status;
  if (status !== previousStatus && !STATUS_TRANSITIONS[previousStatus]?.includes(status)) {
    throw fail(`Order cannot move from ${previousStatus} to ${status}`);
  }
  if (order.paymentMethod === 'fonepay_qr' && ['processing', 'shipped', 'out_for_delivery', 'delivered'].includes(status) && !order.isPaid) {
    throw fail('Verify the FonePay payment before fulfilling this order');
  }
  order.status = status;
  if (status !== previousStatus || message || location) {
    order.trackingEvents.push({ status, message: String(message || `Order ${status}`).slice(0, 200), location: String(location || '').slice(0, 120), actor: req.user?.name || 'Admin' });
  }
  if (trackingNumber !== undefined) order.trackingNumber = String(trackingNumber).trim();
  if (notes !== undefined) order.notes = String(notes).slice(0, 1000);
  if (status === 'delivered') {
    order.isDelivered = true; order.deliveredAt ||= new Date();
    if (order.paymentMethod === 'cash_on_delivery') { order.isPaid = true; order.paidAt ||= new Date(); }
  }
  if (status === 'cancelled' && previousStatus !== 'cancelled') {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        await order.save({ session });
        for (const item of order.items) {
          await Product.updateOne({ _id: item.product }, { $inc: { 'variants.$[variant].stock': item.quantity, totalSold: -item.quantity } }, { session, arrayFilters: [{ 'variant.size': item.size, 'variant.color': item.color }] });
        }
      });
    } finally { await session.endSession(); }
  } else {
    await order.save();
  }
  res.json({ success: true, data: { order } });
});

const verifyPayment = asyncHandler(async (req, res) => {
  const { action, note } = req.body;
  if (!['verify', 'reject'].includes(action)) throw fail('Invalid payment action');
  const order = await Order.findById(req.params.id);
  if (!order) throw fail('Order not found', 404);
  if (order.paymentMethod !== 'fonepay_qr') throw fail('Only online payments need verification');
  if (order.status === 'cancelled') throw fail('Order is cancelled');
  const result = order.paymentResult || {};
  result.note = String(note || '').slice(0, 200);
  result.verifiedBy = req.user?.name || 'Admin';
  result.verifiedAt = new Date();
  if (action === 'verify') {
    result.status = 'verified'; order.isPaid = true; order.paidAt = new Date();
  } else {
    result.status = 'rejected'; order.isPaid = false; order.paidAt = undefined;
  }
  order.paymentResult = result;
  order.trackingEvents.push({ status: order.status, message: action === 'verify' ? 'Payment verified' : `Payment could not be verified${result.note ? `: ${result.note}` : ''}`, actor: result.verifiedBy });
  await order.save();
  res.json({ success: true, data: { order } });
});

module.exports = { verifyPayment, createOrder, quoteOrder, getMyOrders, getOrder, cancelOrder, getAllOrders, updateOrderStatus };
