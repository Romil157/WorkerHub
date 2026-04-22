const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { AppError } = require('../middleware/errorHandler');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Use memory storage — we upload buffers directly
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new AppError('Invalid file type. Only JPG, PNG, WEBP, PDF allowed.', 400), false);
  },
});

/**
 * Upload a file buffer to Cloudinary
 * @param {Buffer} buffer - file buffer
 * @param {string} folder - cloudinary folder name
 * @param {object} options - extra cloudinary options
 */
const uploadFile = (buffer, folder = 'workerhub', options = {}) => {
  return new Promise((resolve, reject) => {
    if (!process.env.CLOUDINARY_API_KEY || process.env.CLOUDINARY_API_KEY === 'your_api_key') {
      // Dev mode: return mock URL
      resolve({ secure_url: `https://via.placeholder.com/400x300?text=${folder}` });
      return;
    }

    const stream = cloudinary.uploader.upload_stream(
      { folder: `workerhub/${folder}`, resource_type: 'auto', ...options },
      (error, result) => {
        if (error) reject(new AppError(`Cloudinary upload failed: ${error.message}`, 500));
        else resolve(result);
      }
    );
    stream.end(buffer);
  });
};

const deleteFile = async (publicId) => {
  if (!process.env.CLOUDINARY_API_KEY || process.env.CLOUDINARY_API_KEY === 'your_api_key') return;
  await cloudinary.uploader.destroy(publicId);
};

module.exports = { upload, uploadFile, deleteFile };
