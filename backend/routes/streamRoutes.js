import express from 'express';
import { streamMedia } from '../controllers/streamController.js';
const router = express.Router();

router.get('/:filename', streamMedia);

export default router;







