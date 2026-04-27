const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const { cloudinary, upload } = require('../config/cloudinary');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// POST /api/upload  (supports multiple images)
router.post(
  '/',
  protect,
  adminOnly,
  upload.array('images', 10),
  asyncHandler(async (req, res) => {
    if (!req.files || req.files.length === 0) {
      res.status(400);
      throw new Error('No files uploaded');
    }

    const images = req.files.map((file) => ({
      url:      file.path,        // Cloudinary URL
      publicId: file.filename,    // Cloudinary public_id
    }));

    res.json({ success: true, data: { images } });
  })
);

// DELETE /api/upload/:publicId
router.delete(
  '/:publicId',
  protect,
  adminOnly,
  asyncHandler(async (req, res) => {
    const publicId = decodeURIComponent(req.params.publicId);
    await cloudinary.uploader.destroy(publicId);
    res.json({ success: true, message: 'Image deleted' });
  })
);

module.exports = router;