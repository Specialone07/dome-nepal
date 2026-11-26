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
const WEB_FORMATS = ['jpg', 'jpeg', 'png', 'webp'];
const ANY_PHOTO_FORMATS = [...WEB_FORMATS, 'gif', 'avif', 'heic', 'heif', 'bmp', 'tif', 'tiff'];

const storage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => {
    const ext = (file.originalname.split('.').pop() || '').toLowerCase();
    return {
      folder: 'dome-nepal',
      allowed_formats: ANY_PHOTO_FORMATS,
      // phone/camera formats (HEIC, TIFF, ...) are stored as JPG so every browser can show them
      ...(WEB_FORMATS.includes(ext) ? {} : { format: 'jpg' }),
      transformation: [{ quality: 'auto', fetch_format: 'auto' }],
    };
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    // Windows often sends HEIC with no/odd mimetype, so fall back to the extension
    const ext = (file.originalname.split('.').pop() || '').toLowerCase();
    if (file.mimetype.startsWith('image/') || ANY_PHOTO_FORMATS.includes(ext)) cb(null, true);
    else cb(new Error('Only image files allowed'), false);
  },
});

module.exports = { cloudinary, upload };