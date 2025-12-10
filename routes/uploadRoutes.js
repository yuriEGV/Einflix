import express from 'express';
import { uploadMedia, handleUpload } from '../controllers/uploadController.js';
const router = express.Router();

router.post('/', uploadMedia, handleUpload);

export default router;



