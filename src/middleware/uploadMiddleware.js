const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');
const { s3, bucket } = require('../config/s3');

// Stub returned when S3 is not configured — prevents startup crash on Vercel
function notConfigured(field) {
  const handler = (req, res) => res.status(503).json({ message: 'File upload not available — S3 not configured.' });
  return { single: () => handler, array: () => handler, fields: () => handler };
}

function makeUpload(prefix) {
  if (!bucket) return notConfigured();
  return multer({
    storage: multerS3({
      s3,
      bucket,
      acl: 'private',
      contentType: multerS3.AUTO_CONTENT_TYPE,
      metadata: (req, file, cb) => {
        cb(null, { fieldName: file.fieldname });
      },
      key: (req, file, cb) => {
        const safeName = file.originalname.replace(/\s+/g, '_');
        const key = `${prefix || 'uploads'}/${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeName}`;
        cb(null, key);
      }
    }),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
      cb(null, allowed.includes(file.mimetype));
    }
  });
}

function memoryUpload(options = {}) {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: options.maxSize || 20 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const allowed = options.mimetypes || ['application/pdf'];
      cb(null, allowed.includes(file.mimetype));
    }
  });
}

function makePublicUpload(prefix) {
  if (!bucket) return notConfigured();
  return multer({
    storage: multerS3({
      s3,
      bucket,
      contentType: multerS3.AUTO_CONTENT_TYPE,
      metadata: (req, file, cb) => {
        cb(null, { fieldName: file.fieldname });
      },
      key: (req, file, cb) => {
        const safeName = file.originalname.replace(/\s+/g, '_');
        const key = `${prefix || 'uploads'}/${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeName}`;
        cb(null, key);
      }
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      cb(null, allowed.includes(file.mimetype));
    }
  });
}

module.exports = { makeUpload, memoryUpload, makePublicUpload };
