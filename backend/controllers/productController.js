const asyncHandler = require('express-async-handler');
const Product = require('../models/Product');
const cloudinary = require('../config/cloudinary');

/* =========================================================
   GET ALL PRODUCTS
========================================================= */
const getProducts = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 12,
    category,
    gender,
    minPrice,
    maxPrice,
    sortBy = 'createdAt',
    order = 'desc',
    search,
    featured,
    isNew,
    sizes,
    colors
  } = req.query;

  const filter = { isActive: true };

  // ✅ SAFE ARRAY FILTERS
  if (category) {
    filter.category = {
      $in: category.split(',').filter(Boolean)
    };
  }

  if (gender) {
    filter.gender = {
      $in: gender.split(',').filter(Boolean)
    };
  }

  // Price filter
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }

  // Flags
  if (featured === 'true') filter.isFeatured = true;
  if (isNew === 'true') filter.isNew = true;

  // Search
  if (search) {
    filter.$text = { $search: search };
  }

  // Variants
  if (sizes) {
    filter['variants.size'] = {
      $in: sizes.split(',').filter(Boolean)
    };
  }

  if (colors) {
    filter['variants.color'] = {
      $in: colors.split(',').filter(Boolean)
    };
  }

  // Sorting
  const sortObj = {};
  sortObj[sortBy] = order === 'asc' ? 1 : -1;

  const skip = (Number(page) - 1) * Number(limit);

  const [products, total] = await Promise.all([
    Product.find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(Number(limit))
      .lean(),

    Product.countDocuments(filter)
  ]);

  return res.json({
    success: true,
    data: {
      products,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    }
  });
});



/* =========================================================
   GET SINGLE PRODUCT
========================================================= */
const getProduct = asyncHandler(async (req, res) => {
  const { identifier } = req.params;

  const query = /^[0-9a-fA-F]{24}$/.test(identifier)
    ? { _id: identifier }
    : { slug: identifier };

  const product = await Product.findOne({
    ...query,
    isActive: true
  });

  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  res.json({
    success: true,
    data: { product }
  });
});


/* =========================================================
   FEATURED PRODUCTS
========================================================= */
const getFeaturedProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({
    isFeatured: true,
    isActive: true
  })
    .sort({ createdAt: -1 })
    .limit(8)
    .lean();

  res.json({ success: true, data: { products } });
});


/* =========================================================
   NEW ARRIVALS
========================================================= */
const getNewArrivals = asyncHandler(async (req, res) => {
  const products = await Product.find({
    isNew: true,
    isActive: true
  })
    .sort({ createdAt: -1 })
    .limit(8)
    .lean();

  res.json({ success: true, data: { products } });
});


/* =========================================================
   BEST SELLERS
========================================================= */
const getBestSellers = asyncHandler(async (req, res) => {
  const products = await Product.find({
    isBestSeller: true,
    isActive: true
  })
    .sort({ totalSold: -1 })
    .limit(8)
    .lean();

  res.json({ success: true, data: { products } });
});


/* =========================================================
   RELATED PRODUCTS
========================================================= */
const getRelatedProducts = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  const related = await Product.find({
    category: product.category,
    gender: product.gender,
    _id: { $ne: product._id },
    isActive: true
  }).limit(6).lean();

  res.json({ success: true, data: { products: related } });
});


/* =========================================================
   SEARCH PRODUCTS
========================================================= */
const searchProducts = asyncHandler(async (req, res) => {
  const { q, limit = 6 } = req.query;

  if (!q || q.trim().length < 2) {
    return res.json({ success: true, data: { products: [] } });
  }

  const products = await Product.find(
    {
      $text: { $search: q },
      isActive: true
    },
    { score: { $meta: 'textScore' } }
  )
    .sort({ score: { $meta: 'textScore' } })
    .limit(Number(limit))
    .select('name slug images price category')
    .lean();

  res.json({ success: true, data: { products } });
});


/* =========================================================
   CREATE PRODUCT (FIXED - IMPORTANT)
========================================================= */
const createProduct = asyncHandler(async (req, res) => {
  try {
    const data = { ...req.body }

    console.log("BODY:", data)
    console.log("FILES:", req.files)

    // =========================
    // 1. REQUIRED FIELD CHECK
    // =========================
    if (!data.name || !data.description || !data.category) {
      return res.status(400).json({
        success: false,
        message: "Name, description, and category are required"
      })
    }

    if (!data.price || isNaN(Number(data.price))) {
      return res.status(400).json({
        success: false,
        message: "Invalid or missing price"
      })
    }

    // =========================
    // 2. SAFE TYPE CONVERSION
    // =========================
    data.price = Number(data.price)
    data.comparePrice = data.comparePrice ? Number(data.comparePrice) : 0

    data.isFeatured = data.isFeatured === 'true'
    data.isNew = data.isNew === 'true'

    // =========================
    // 3. SAFE VARIANTS PARSE
    // =========================
    if (typeof data.variants === 'string') {
      try {
        data.variants = JSON.parse(data.variants)
      } catch (err) {
        data.variants = []
      }
    }

    // =========================
    // 4. IMAGE HANDLING (CLOUDINARY SAFE)
    // =========================
    if (req.files && req.files.length > 0) {
      data.images = req.files.map(file => ({
        url: file.path || file.secure_url || '',
        publicId: file.filename || file.public_id || ''
      }))
    } else {
      data.images = []
    }

    // =========================
    // 5. DEFAULT VARIANT (SAFE)
    // =========================
    if (!Array.isArray(data.variants) || data.variants.length === 0) {
      data.variants = [
        {
          size: "M",
          color: "Black",
          stock: 10,
          sku: `SKU-${Date.now()}`
        }
      ]
    }

    // =========================
    // 6. CREATE PRODUCT
    // =========================
    const product = await Product.create(data)

    return res.status(201).json({
      success: true,
      data: { product }
    })

  } catch (error) {
    console.error("🔥 PRODUCT CREATE ERROR:", error)

    return res.status(500).json({
      success: false,
      message: error.message
    })
  }
})
/* =========================================================
   UPDATE PRODUCT
========================================================= */
const updateProduct = asyncHandler(async (req, res) => {
  try {
    const data = { ...req.body };

    console.log("UPDATE BODY:", data);
    console.log("FILES:", req.files);

    // ✅ Convert types
    if (data.price) data.price = Number(data.price);
    data.isFeatured = data.isFeatured === 'true';
    data.isNew = data.isNew !== 'false';
    data.isBestSeller = data.isBestSeller === 'true';

    // ✅ Parse variants if sent as string
    if (data.variants && typeof data.variants === 'string') {
      data.variants = JSON.parse(data.variants);
    }

    // 🔍 Find existing product
    const existingProduct = await Product.findById(req.params.id);
    if (!existingProduct) {
      res.status(404);
      throw new Error('Product not found');
    }

    // ✅ HANDLE IMAGE UPDATE
    let updatedImages = existingProduct.images || [];

    if (req.files && req.files.length > 0) {
      // 🔥 delete old images from cloudinary
      for (let img of existingProduct.images) {
        if (img.publicId) {
          await cloudinary.uploader.destroy(img.publicId);
        }
      }

      // 🔥 upload new images
      updatedImages = [];

      for (let file of req.files) {
        const result = await cloudinary.uploader.upload(file.path, {
          folder: 'products'
        });

        updatedImages.push({
          url: result.secure_url,
          publicId: result.public_id,
          alt: data.name || existingProduct.name
        });
      }
    }

    data.images = updatedImages;

    // ✅ Update product
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      data,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      data: { product }
    });

  } catch (error) {
    console.error("🔥 PRODUCT UPDATE ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});


/* =========================================================
   DELETE PRODUCT (SOFT DELETE)
========================================================= */
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );

  if (!product) {
    res.status(404);
    throw new Error('Product not found');
  }

  res.json({ success: true, message: 'Product deleted' });
});


/* =========================================================
   CATEGORIES STATS
========================================================= */
const getCategories = asyncHandler(async (req, res) => {
  const stats = await Product.aggregate([
    { $match: { isActive: true } },
    {
      $group: {
        _id: '$category',
        count: { $sum: 1 },
        avgPrice: { $avg: '$price' }
      }
    },
    { $sort: { count: -1 } }
  ]);

  res.json({
    success: true,
    data: { categories: stats }
  });
});


module.exports = {
  getProducts,
  getProduct,
  getFeaturedProducts,
  getNewArrivals,
  getBestSellers,
  getRelatedProducts,
  searchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories
};