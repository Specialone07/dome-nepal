const nodemailer = require('nodemailer')
const twilio = require('twilio')

// ================= EMAIL SETUP =================
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
})

// ================= WHATSAPP SETUP =================
let twilioClient = null

if (process.env.TWILIO_SID && process.env.TWILIO_AUTH) {
  twilioClient = twilio(
    process.env.TWILIO_SID,
    process.env.TWILIO_AUTH
  )
}

// ================= SEND EMAIL =================
const sendEmail = async (order) => {
  const itemsHtml = order.items.map(item => `
    <div style="margin-bottom:10px;">
      <strong>${item.name}</strong><br/>
      Variant: ${item.size} · ${item.color}<br/>
      Rs. ${item.price} × ${item.quantity}
    </div>
  `).join('')

  const html = `
  <div style="font-family: Arial, sans-serif; background:#f5f5f5; padding:20px;">
    <div style="max-width:600px; margin:auto; background:white; border-radius:6px; overflow:hidden;">
      
      <!-- Header -->
      <div style="background:#0a7f2e; color:white; padding:12px 20px; display:flex; justify-content:space-between;">
        <strong>Dome</strong>
        <span>${new Date().toDateString()}</span>
      </div>

      <div style="padding:20px; color:#333;">
        <p>Hello, ${order.shippingAddress.name}</p>

        <p>
          This email is to confirm that we have received your order 
          <strong>#${order.orderNumber}</strong> and is being processed.
        </p>

        <!-- Order Info -->
        <div style="border:1px solid #ddd; padding:15px; border-radius:6px; margin:20px 0;">
          <p><strong>Status:</strong> <span style="color:green;">Received</span></p>
          <p><strong>Order:</strong> #${order.orderNumber}</p>
          <p><strong>Name:</strong> ${order.shippingAddress.name}</p>
          <p><strong>Phone:</strong> ${order.shippingAddress.phone}</p>
          <p><strong>Address:</strong> ${order.shippingAddress.street}</p>
          <p><strong>City:</strong> ${order.shippingAddress.city}, ${order.shippingAddress.district}</p>
          <p><strong>Payment:</strong> ${order.paymentMethod === 'fonepay_qr' ? `FonePay QR — Rs. ${order.totalPrice} (we will verify your transaction shortly)` : `Cash on delivery — please keep Rs. ${order.totalPrice} ready`}</p>
        </div>

        <h3>Ordered Products</h3>
        ${itemsHtml}

        <!-- Pricing -->
        <div style="border:1px solid #ddd; padding:15px; border-radius:6px; margin-top:20px;">
          <p>Sub-total: Rs. ${order.subtotal}</p>
          <p>Delivery: Rs. ${order.shippingPrice}</p>
          <p><strong>Total: <span style="color:green;">Rs. ${order.totalPrice}</span></strong></p>
        </div>

        <p style="margin-top:20px;">
          We are working our best to fulfill your order.
        </p>

        <p>
          Track your order:<br/>
          <a href="${(process.env.FRONTEND_URL || 'http://localhost:5173').split(',')[0].trim()}/orders/${order._id}">
            Click here to track
          </a>
        </p>

        <p>
          Customer Support: ${order.shippingAddress.phone}
        </p>

        <p>Thank you for choosing us ❤️</p>

        <p>Best regards,<br/>Dome</p>
      </div>
    </div>
  </div>
  `

  await transporter.sendMail({
    from: `"Dome Store" <${process.env.EMAIL_USER}>`,
    to: order.shippingAddress.email,
    subject: `Order Confirmation - #${order.orderNumber}`,
    html
  })
}

// ================= SEND WHATSAPP =================
const sendWhatsApp = async (order) => {
  if (!twilioClient) {
    console.log('⚠️ WhatsApp not configured')
    return
  }

  try {
    const phone = order.shippingAddress.phone.replace(/^0/, '977')

    await twilioClient.messages.create({
      from: 'whatsapp:+14155238886',
      to: `whatsapp:+${phone}`,
      body: `🛍️ Order Confirmed!

Order: ${order.orderNumber}
Total: Rs. ${order.totalPrice}

Thank you ${order.shippingAddress.name} ❤️`
    })
  } catch (err) {
    console.error('❌ WhatsApp failed:', err.message)
  }
}

// ================= MAIN FUNCTION =================
const sendOrderNotifications = async (order) => {
  try {
    await Promise.allSettled([
      sendEmail(order),
      sendWhatsApp(order)
    ])

    console.log('✅ Notifications processed')
  } catch (err) {
    console.error('❌ Notification error:', err.message)
  }
}

module.exports = {
  sendOrderNotifications
}