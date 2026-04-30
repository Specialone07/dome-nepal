const asyncHandler = require('express-async-handler');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { sendOrderNotifications } = require('../services/notificationService');
const crypto = require('crypto');

/* =========================================================
   CREATE ORDER
========================================================= */
const createOrder = asyncHandler(async (req, res) => {
  try {
    const { items, shippingAddress, couponCode } = req.body;

    // ================= VALIDATION =================
    if (!items || items.length === 0) {
      res.status(400);
      throw new Error('No order items');
    }

    if (
      !shippingAddress ||
      !shippingAddress.name ||
      !shippingAddress.email ||
      !shippingAddress.phone ||
      !shippingAddress.street ||
      !shippingAddress.city
    ) {
      res.status(400);
      throw new Error('Incomplete shipping details');
    }

    // ================= FETCH PRODUCTS =================
    const productIds = items.map(item => item.product);
    const products = await Product.find({ _id: { $in: productIds } });

    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const product = products.find(p => p._id.toString() === item.product);

      if (!product) {
        res.status(404);
        throw new Error(`Product not found: ${item.product}`);
      }

      const variant = product.variants.find(
        v => v.size === item.size && v.color === item.color
      );

      if (!variant) {
        res.status(400);
        throw new Error(`Variant not found for ${product.name}`);
      }

      if (variant.stock < item.quantity) {
        res.status(400);
        throw new Error(`Insufficient stock for ${product.name}`);
      }

      const price = variant.price || product.price;
      subtotal += price * item.quantity;

      orderItems.push({
        product: product._id,
        name: product.name,
        image: product.images?.[0]?.url || '',
        price,
        size: item.size,
        color: item.color,
        quantity: item.quantity,
      });
    }

    // ================= PRICING =================
    const shippingPrice = subtotal >= 5000 ? 0 : 200;
    // const taxPrice = Math.round(subtotal * 0.13);

    let discount = 0;
    if (couponCode === 'DOME10') {
      // discount = Math.round(subtotal * 0.1);
    }

    const totalPrice = subtotal + shippingPrice + taxPrice - discount;

    // ================= GUEST LOGIC =================
    let guestId = null;

    if (!req.user) {
      guestId = req.headers['x-guest-id'];

      if (!guestId) {
        guestId = crypto.randomUUID();
      }
    }

    // ================= CREATE ORDER =================
   const order = await Order.create({
  user: req.user?._id || null,
  guestId,
  isGuest: !req.user,
  items: orderItems,
  shippingAddress,
  paymentMethod: 'cash_on_delivery',
  subtotal,
  shippingPrice,
  // ❌ remove taxPrice
  discount,
  couponCode,
  totalPrice,
  status: 'pending',
  trackingEvents: [
    {
      status: 'pending',
      message: 'Order placed successfully',
      location: 'Online',
    },
  ],
});

    // ================= UPDATE STOCK =================
    for (const item of items) {
      await Product.updateOne(
        {
          _id: item.product,
          'variants.size': item.size,
          'variants.color': item.color,
        },
        {
          $inc: {
            'variants.$.stock': -item.quantity,
            totalSold: item.quantity,
          },
        }
      );
    }

    // ================= NOTIFICATIONS =================
    try {
      await sendOrderNotifications(order);
    } catch (err) {
      console.error('Notification failed:', err.message);
    }

    // ================= RESPONSE =================
    const response = {
      success: true,
      message: 'Order placed successfully',
      data: { order },
    };

    if (guestId) response.guestId = guestId;

    res.status(201).json(response);

  } catch (error) {
    throw error;
  }
});

/* =========================================================
   GET MY ORDERS
========================================================= */
const getMyOrders = asyncHandler(async (req, res) => {
  const query = req.user
    ? { user: req.user._id }
    : { guestId: req.headers['x-guest-id'] };

  if (!req.user && !req.headers['x-guest-id']) {
    return res.json({ success: true, data: { orders: [] } });
  }

  const orders = await Order.find(query).sort({ createdAt: -1 });

  res.json({
    success: true,
    data: { orders },
  });
});

/* =========================================================
   GET SINGLE ORDER
========================================================= */
const getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('user', 'name email');

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  if (req.user) {
    const ownerId = order.user?._id?.toString();
    if (ownerId !== req.user._id.toString() && req.user.role !== 'admin') {
      res.status(403);
      throw new Error('Not authorized');
    }
  } else {
    const guestId = req.headers['x-guest-id'];
    if (!guestId || order.guestId !== guestId) {
      res.status(403);
      throw new Error('Not authorized');
    }
  }

  res.json({
    success: true,
    data: { order },
  });
});

/* =========================================================
   CANCEL ORDER
========================================================= */
const cancelOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  if (req.user) {
    if (order.user?.toString() !== req.user._id.toString()) {
      res.status(403);
      throw new Error('Not authorized');
    }
  } else {
    const guestId = req.headers['x-guest-id'];
    if (!guestId || order.guestId !== guestId) {
      res.status(403);
      throw new Error('Not authorized');
    }
  }

  if (!['pending', 'processing'].includes(order.status)) {
    res.status(400);
    throw new Error('Order cannot be cancelled');
  }

  order.status = 'cancelled';
  order.trackingEvents.push({
    status: 'cancelled',
    message: 'Cancelled by user',
  });

  await order.save();

  for (const item of order.items) {
    await Product.updateOne(
      {
        _id: item.product,
        'variants.size': item.size,
        'variants.color': item.color,
      },
      {
        $inc: {
          'variants.$.stock': item.quantity,
          totalSold: -item.quantity,
        },
      }
    );
  }

  res.json({
    success: true,
    data: { order },
  });
});

/* =========================================================
   ADMIN - ALL ORDERS
========================================================= */
const getAllOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;

  const query = status ? { status } : {};

  const skip = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('user', 'name email'),

    Order.countDocuments(query)
  ]);

  res.json({
    success: true,
    data: {
      orders,
      total
    }
  });
});
/* =========================================================
   ADMIN - UPDATE STATUS
========================================================= */
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, message, location, trackingNumber } = req.body;

  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  order.status = status;
  order.trackingEvents.push({
    status,
    message: message || `Order ${status}`,
    location: location || '',
  });

  if (trackingNumber) order.trackingNumber = trackingNumber;

  if (status === 'delivered') {
    order.isDelivered = true;
    order.deliveredAt = new Date();
  }

  if (status === 'delivered' && order.paymentMethod === 'cash_on_delivery') {
    order.isPaid = true;
    order.paidAt = new Date();
  }

  await order.save();

  res.json({
    success: true,
    data: { order },
  });
});

module.exports = {
  createOrder,
  getMyOrders,
  getOrder,
  cancelOrder,
  getAllOrders,
  updateOrderStatus,
};