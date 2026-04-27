const mongoose = require('mongoose');

const variantSchema = new mongoose.Schema({
  size: { type: String, required: true },
  color: { type: String, required: true },
  colorHex: { type: String, default: '#000000' },
  stock: { type: Number, required: true, min: 0, default: 0 },
  sku: { type: String, required: true } // ❌ removed unique
});

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 200 },
  slug: { type: String, unique: true, lowercase: true },
  description: { type: String, required: true, maxlength: 2000 },
  shortDescription: { type: String, maxlength: 300 },
  price: { type: Number, required: true, min: 0 },
  comparePrice: { type: Number, default: 0 },

  category: {
    type: String,
    required: true,
    enum: ['tops', 'bottoms', 'outerwear', 'dresses', 'accessories', 'footwear', 'activewear']
  },

  subcategory: { type: String, trim: true },
  gender: { type: String, enum: ['men', 'women', 'unisex', 'kids'], default: 'unisex' },

  images: [{
    url: { type: String, required: true },
    publicId: { type: String },
    alt: { type: String, default: '' }
  }],

  variants: {
    type: [variantSchema],
    default: []
  },

  tags: [{ type: String, lowercase: true }],
  material: { type: String, default: '' },
  careInstructions: [String],

  isFeatured: { type: Boolean, default: false },
  isNew: { type: Boolean, default: true },
  isBestSeller: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },

  ratingsAverage: { type: Number, default: 0, min: 0, max: 5, set: v => Math.round(v * 10) / 10 },
  ratingsCount: { type: Number, default: 0 },
  totalSold: { type: Number, default: 0 },

  metaTitle: { type: String, default: '' },
  metaDescription: { type: String, default: '' }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});


// ✅ SAFE VIRTUAL
productSchema.virtual('totalStock').get(function () {
  if (!this.variants || !this.variants.length) return 0;
  return this.variants.reduce((sum, v) => sum + (v.stock || 0), 0);
});


// slug generator
productSchema.pre('save', function () {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') + '-' + Date.now();
  }
});


// indexes
productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ category: 1, gender: 1 });
productSchema.index({ price: 1 });
productSchema.index({ ratingsAverage: -1 });
productSchema.index({ isFeatured: 1, isActive: 1 });

module.exports = mongoose.model('Product', productSchema);