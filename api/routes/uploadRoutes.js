const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');

// Upload route
router.post('/', uploadController.uploadMedia, uploadController.handleUpload);

module.exports = router;