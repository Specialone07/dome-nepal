const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

console.log('☁️ Cloudinary loaded:', {
  cloud: process.env.CLOUDINARY_CLOUD_NAME ? 'OK' : 'MISSING',
  key: process.env.CLOUDINARY_API_KEY ? 'OK' : 'MISSING',
  secret: process.env.CLOUDINARY_API_SECRET ? 'OK' : 'MISSING',
});

// =====================
// MULTER STORAGE (AUTO CLOUDINARY UPLOAD)
// =====================
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'dome-nepal',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ quality: 'auto', fetch_format: 'auto' }],
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files allowed'), false);
  },
});

module.exports = { cloudinary, upload };