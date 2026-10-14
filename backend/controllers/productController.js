
const asyncHandler = require('express-async-handler');
const Product = require('../models/Product');
const { cloudinary } = require('../config/cloudinary');

const normalizeVariants = (input = []) => {
  const flat = [];
  for (const variant of Array.isArray(input) ? input : []) {
    if (Array.isArray(variant.sizes)) {
      for (const entry of variant.sizes) {
        if (!entry?.size) continue;
        flat.push({
          size: String(entry.size).trim(),
          color: String(variant.color || 'Default').trim(),
          colorHex: variant.colorHex || '#000000',
          stock: Math.max(0, Number(entry.stock) || 0),
          sku: entry.sku || `SKU-${entry.size}-${variant.color || 'DEFAULT'}-${Date.now()}-${flat.length}`
        });
      }
      continue;
    }
    if (!variant?.size || !variant?.color) continue;
    flat.push({
      size: String(variant.size).trim(),
      color: String(variant.color).trim(),
      colorHex: variant.colorHex || '#000000',
      stock: Math.max(0, Number(variant.stock) || 0),
      sku: variant.sku || `SKU-${variant.size}-${variant.color}-${Date.now()}-${flat.length}`
    });
  }
  const keys = new Set();
  return flat.filter(variant => {
    const key = `${variant.size.toLowerCase()}::${variant.color.toLowerCase()}`;
    if (keys.has(key)) return false;
    keys.add(key);
    return true;
  });
};
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
  if (isNew === 'true') filter.newArrival = true;

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
      .limit(Number(limit)),

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
    ;

  res.json({ success: true, data: { products } });
});


/* =========================================================
   NEW ARRIVALS
========================================================= */
const getNewArrivals = asyncHandler(async (req, res) => {
  const products = await Product.find({
    newArrival: true,
    isActive: true
  })
    .sort({ createdAt: -1 })
    .limit(8)
    ;

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
    ;

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
  }).limit(6);

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
    ;

  res.json({ success: true, data: { products } });
});


/* =========================================================
   CREATE PRODUCT (FIXED - IMPORTANT)
========================================================= */
const createProduct = asyncHandler(async (req, res) => {
  try {
    const data = { ...req.body };

    console.log("BODY:", data);
    console.log("FILES:", req.files);

    // =========================
    // 1. REQUIRED FIELD CHECK
    // =========================
    if (!data.name || !data.description || !data.category) {
      return res.status(400).json({
        success: false,
        message: "Name, description, and category are required"
      });
    }

    if (!data.price || isNaN(Number(data.price))) {
      return res.status(400).json({
        success: false,
        message: "Invalid or missing price"
      });
    }

    // =========================
    // 2. TYPE CONVERSION
    // =========================
    data.price = Number(data.price);
    data.comparePrice = data.comparePrice ? Number(data.comparePrice) : 0;

    data.isFeatured = data.isFeatured === 'true';
    data.newArrival = data.isNew === 'true';
    data.isBestSeller = data.isBestSeller === 'true';

    // =========================
    // 3. VARIANTS PARSE (NEW STRUCTURE)
    // =========================
    let variants = [];

    if (data.variants) {
      try {
        variants =
          typeof data.variants === 'string'
            ? JSON.parse(data.variants)
            : data.variants;

        if (!Array.isArray(variants)) variants = [];
      } catch (err) {
        console.log("Variant parse error:", err.message);
        variants = [];
      }
    }

    // =========================
    // 4. VALIDATE VARIANTS
    // =========================
    variants = normalizeVariants(variants);

    // =========================
    // 5. DEFAULT VARIANT
    // =========================
    if (variants.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one valid product variant is required' });
    }

    data.variants = variants;

    // =========================
    // 6. IMAGE HANDLING
    // =========================
    // Handle images from pre-upload (JSON string) or direct file upload
    if (data.images) {
      try {
        const parsedImages = typeof data.images === 'string' 
          ? JSON.parse(data.images) 
          : data.images;
        
        if (Array.isArray(parsedImages) && parsedImages.length > 0) {
          // Images were pre-uploaded and sent as JSON
          data.images = parsedImages;
        } else if (req.files && req.files.length > 0) {
          // Original flow: images uploaded as files
          data.images = req.files.map(file => ({
            url: file.path || file.secure_url || '',
            publicId: file.filename || file.public_id || '',
            alt: data.name || ''
          }));
        } else {
          data.images = [];
        }
      } catch (err) {
        console.log('Image parse error:', err.message);
        // Fall back to file upload if available
        if (req.files && req.files.length > 0) {
          data.images = req.files.map(file => ({
            url: file.path || file.secure_url || '',
            publicId: file.filename || file.public_id || '',
            alt: data.name || ''
          }));
        } else {
          data.images = [];
        }
      }
    } else if (req.files && req.files.length > 0) {
      // Original flow: images uploaded as files
      data.images = req.files.map(file => ({
        url: file.path || file.secure_url || '',
        publicId: file.filename || file.public_id || '',
        alt: data.name || ''
      }));
    } else {
      data.images = [];
    }

    // =========================
    // 7. SIZE CHART HANDLING
    // =========================
    if (data.sizeChart) {
      try {
        const sizeChart = typeof data.sizeChart === 'string' 
          ? JSON.parse(data.sizeChart) 
          : data.sizeChart;

        // Validate size chart structure
        if (sizeChart.enabled) {
          if (!sizeChart.unit || !['in', 'cm'].includes(sizeChart.unit)) {
            sizeChart.unit = 'in';
          }
          if (!sizeChart.preset || !['custom', 'tops', 'bottoms', 'dresses', 'footwear'].includes(sizeChart.preset)) {
            sizeChart.preset = 'custom';
          }
          
          // Validate measurements
          if (Array.isArray(sizeChart.measurements)) {
            if (sizeChart.measurements.length > 10) {
              return res.status(400).json({
                success: false,
                message: 'Maximum 10 measurement columns allowed'
              });
            }
            // Ensure each measurement has key and label
            sizeChart.measurements = sizeChart.measurements.map(m => ({
              key: (m.key || m.label || '').toLowerCase().replace(/\s+/g, '_').trim(),
              label: (m.label || m.key || '').trim()
            })).filter(m => m.label);
          }

          // Validate rows
          if (Array.isArray(sizeChart.rows)) {
            if (sizeChart.rows.length > 20) {
              return res.status(400).json({
                success: false,
                message: 'Maximum 20 size rows allowed'
              });
            }
            // Ensure unique sizes
            const sizes = sizeChart.rows.map(r => r.size?.trim()).filter(Boolean);
            const uniqueSizes = new Set(sizes);
            if (uniqueSizes.size !== sizes.length) {
              return res.status(400).json({
                success: false,
                message: 'Duplicate sizes found in size chart'
              });
            }
            sizeChart.rows = sizeChart.rows
              .filter(r => r.size?.trim())
              .map(r => ({
                size: r.size.trim(),
                values: r.values || {}
              }));
          }
        }
        
        data.sizeChart = sizeChart;
      } catch (err) {
        console.log('Size chart parse error:', err.message);
        data.sizeChart = { enabled: false };
      }
    } else {
      data.sizeChart = { enabled: false };
    }

    // =========================
    // 8. CREATE PRODUCT
    // =========================
    const product = await Product.create(data);

    return res.status(201).json({
      success: true,
      data: { product }
    });

  } catch (error) {
    console.error("🔥 PRODUCT CREATE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
});
/* =========================================================
   UPDATE PRODUCT
========================================================= */




const updateProduct = asyncHandler(async (req, res) => {
  try {
    const data = { ...req.body };

    console.log("UPDATE BODY:", data);
    console.log("FILES:", req.files);

    // =========================
    // 1. TYPE CONVERSION
    // =========================
    if (data.price) data.price = Number(data.price);

    data.isFeatured = data.isFeatured === 'true';
    data.newArrival = data.isNew === 'true';
    data.isBestSeller = data.isBestSeller === 'true';

    // =========================
    // 2. VARIANTS PARSE
    // =========================
    let variants = [];

    if (data.variants) {
      try {
        variants =
          typeof data.variants === 'string'
            ? JSON.parse(data.variants)
            : data.variants;

        if (!Array.isArray(variants)) variants = [];
      } catch (err) {
        console.log("Variant parse error:", err.message);
        variants = [];
      }
    }

    // =========================
    // 3. VALIDATE VARIANTS
    // =========================
    variants = normalizeVariants(variants);

    data.variants = variants;

    // =========================
    // 4. FIND PRODUCT
    // =========================
    const existingProduct = await Product.findById(req.params.id);

    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // =========================
    // 5. IMAGE UPDATE
    // =========================
    let updatedImages = existingProduct.images || [];

    // Handle images from pre-upload (JSON string) or direct file upload
    if (data.images) {
      try {
        const parsedImages = typeof data.images === 'string' 
          ? JSON.parse(data.images) 
          : data.images;
        
        if (Array.isArray(parsedImages) && parsedImages.length > 0) {
          // Images were pre-uploaded and sent as JSON
          // Only delete old images if new images are being sent
          if (parsedImages.length > 0) {
            for (const img of existingProduct.images) {
              if (img?.publicId && cloudinary?.uploader?.destroy) {
                try {
                  await cloudinary.uploader.destroy(img.publicId);
                } catch (err) {
                  console.log("Cloudinary delete failed:", err.message);
                }
              }
            }
          }
          updatedImages = parsedImages;
        } else if (req.files && req.files.length > 0) {
          // Original flow: images uploaded as files
          for (const img of existingProduct.images) {
            if (img?.publicId && cloudinary?.uploader?.destroy) {
              try {
                await cloudinary.uploader.destroy(img.publicId);
              } catch (err) {
                console.log("Cloudinary delete failed:", err.message);
              }
            }
          }
          updatedImages = req.files.map(file => ({
            url: file.path,
            publicId: file.filename,
            alt: data.name || existingProduct.name
          }));
        }
      } catch (err) {
        console.log('Image parse error:', err.message);
        // Fall back to file upload if available
        if (req.files && req.files.length > 0) {
          for (const img of existingProduct.images) {
            if (img?.publicId && cloudinary?.uploader?.destroy) {
              try {
                await cloudinary.uploader.destroy(img.publicId);
              } catch (err) {
                console.log("Cloudinary delete failed:", err.message);
              }
            }
          }
          updatedImages = req.files.map(file => ({
            url: file.path,
            publicId: file.filename,
            alt: data.name || existingProduct.name
          }));
        }
      }
    } else if (req.files && req.files.length > 0) {
      // Original flow: images uploaded as files
      for (const img of existingProduct.images) {
        if (img?.publicId && cloudinary?.uploader?.destroy) {
          try {
            await cloudinary.uploader.destroy(img.publicId);
          } catch (err) {
            console.log("Cloudinary delete failed:", err.message);
          }
        }
      }
      updatedImages = req.files.map(file => ({
        url: file.path,
        publicId: file.filename,
        alt: data.name || existingProduct.name
      }));
    }

    data.images = updatedImages;

    // =========================
    // 6. SIZE CHART HANDLING
    // =========================
    if (data.sizeChart) {
      try {
        const sizeChart = typeof data.sizeChart === 'string' 
          ? JSON.parse(data.sizeChart) 
          : data.sizeChart;

        // Validate size chart structure
        if (sizeChart.enabled) {
          if (!sizeChart.unit || !['in', 'cm'].includes(sizeChart.unit)) {
            sizeChart.unit = 'in';
          }
          if (!sizeChart.preset || !['custom', 'tops', 'bottoms', 'dresses', 'footwear'].includes(sizeChart.preset)) {
            sizeChart.preset = 'custom';
          }
          
          // Validate measurements
          if (Array.isArray(sizeChart.measurements)) {
            if (sizeChart.measurements.length > 10) {
              return res.status(400).json({
                success: false,
                message: 'Maximum 10 measurement columns allowed'
              });
            }
            // Ensure each measurement has key and label
            sizeChart.measurements = sizeChart.measurements.map(m => ({
              key: (m.key || m.label || '').toLowerCase().replace(/\s+/g, '_').trim(),
              label: (m.label || m.key || '').trim()
            })).filter(m => m.label);
          }

          // Validate rows
          if (Array.isArray(sizeChart.rows)) {
            if (sizeChart.rows.length > 20) {
              return res.status(400).json({
                success: false,
                message: 'Maximum 20 size rows allowed'
              });
            }
            // Ensure unique sizes
            const sizes = sizeChart.rows.map(r => r.size?.trim()).filter(Boolean);
            const uniqueSizes = new Set(sizes);
            if (uniqueSizes.size !== sizes.length) {
              return res.status(400).json({
                success: false,
                message: 'Duplicate sizes found in size chart'
              });
            }
            sizeChart.rows = sizeChart.rows
              .filter(r => r.size?.trim())
              .map(r => ({
                size: r.size.trim(),
                values: r.values || {}
              }));
          }
        }
        
        data.sizeChart = sizeChart;
      } catch (err) {
        console.log('Size chart parse error:', err.message);
        // Keep existing size chart if parse fails
        delete data.sizeChart;
      }
    } else if (data.sizeChart === '' || data.sizeChart === null) {
      // Explicitly disable if empty/null is sent
      data.sizeChart = { enabled: false };
    }

    // =========================
    // 7. UPDATE PRODUCT
    // =========================
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      data,
      {
        new: true,
        runValidators: true
      }
    );

    return res.json({
      success: true,
      data: { product }
    });

  } catch (error) {
    console.error("🔥 PRODUCT UPDATE ERROR:", error);

    return res.status(500).json({
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
