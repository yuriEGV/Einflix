const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// Route for uploading videos
router.post('/upload', adminController.uploadVideo, adminController.handleVideoUpload);

module.exports = router;