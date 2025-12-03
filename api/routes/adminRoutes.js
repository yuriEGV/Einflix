import express from 'express';
import * as adminController from '../controllers/adminController.js';
const router = express.Router();

router.post('/upload', adminController.uploadVideo, adminController.handleVideoUpload);

export default router;