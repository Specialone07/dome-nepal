const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const MAX_SESSIONS = 5 // max concurrent refresh tokens per user

const addressSchema = new mongoose.Schema({
  label:     { type: String, default: 'Home' },
  street:    { type: String, required: true },
  city:      { type: String, required: true },
  state:     { type: String, required: true },
  zip:       { type: String, default: '' },
  phone:     { type: String, default: '' },
  country:   { type: String, required: true, default: 'Nepal' },
  isDefault: { type: Boolean, default: false },
})

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      // ✅ minlength validated in controller BEFORE hashing
      select: false,
    },
    avatar:    { type: String, default: '' },
    role: {
      type: String,
      enum: ['user', 'admin', 'superadmin'],
      default: 'user',
    },
    addresses:     [addressSchema],
    phone:         { type: String, default: '' },
    isVerified:    { type: Boolean, default: false },
    isActive:      { type: Boolean, default: true },
    refreshTokens: [{ type: String, select: false }],
    wishlist:      [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    lastLogin:     { type: Date },
  },
  { timestamps: true }
)

// ─── Hash password before save ───────────────────────────────────
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return
  this.password = await bcrypt.hash(this.password, 12)
})

// ─── Compare password ────────────────────────────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password)
}

// ─── Strip sensitive fields for JSON responses ───────────────────
userSchema.methods.toJSON = function () {
  const obj = this.toObject()
  delete obj.password
  delete obj.refreshTokens
  return obj
}

// ─── Cap refresh tokens to MAX_SESSIONS ─────────────────────────
userSchema.methods.addRefreshToken = function (token) {
  if (this.refreshTokens.length >= MAX_SESSIONS) {
    this.refreshTokens = this.refreshTokens.slice(-MAX_SESSIONS + 1)
  }
  this.refreshTokens.push(token)
}

module.exports = mongoose.model('User', userSchema)
