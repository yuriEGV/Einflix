import express from 'express';
import { getAllMedia, getMediaById, createMedia } from '../controllers/mediaController.js';
const router = express.Router();

router.get('/', getAllMedia);
router.get('/:id', getMediaById);
router.post('/', createMedia);

export default router;