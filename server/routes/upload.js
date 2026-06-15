const express = require('express');
const router = express.Router();
const multer = require('multer');
const { verifyToken } = require('../middleware/auth');
const s3Service = require('../services/s3Service');
const { uploadChunk, finalizeUpload, uploadPreRecordedVideo } = require('../controllers/uploadController');

// Multer in-memory storage for raw chunks (usually 60-second intervals)
const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB chunk size limit
});

// Multer disk or S3 upload for pre-recorded meetings
const directUpload = multer({
  storage: s3Service.getMulterStorage(),
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB file size limit
});

router.post('/chunk', verifyToken, memoryUpload.single('chunk'), uploadChunk);
router.post('/finalize', verifyToken, finalizeUpload);
router.post('/video', verifyToken, directUpload.single('video'), uploadPreRecordedVideo);

module.exports = router;
