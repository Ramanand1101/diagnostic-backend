const multer = require('multer');
const multerS3 = require('multer-s3');
const path = require('path');
const { s3, bucket } = require('../config/s3');

function makeUpload(prefix) {
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

module.exports = { makeUpload };
