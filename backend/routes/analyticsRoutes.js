import express from 'express';
import { saveEvent, getAnalytics } from '../controllers/analyticsController.js';
const router = express.Router();

router.post('/events', saveEvent);
router.get('/dashboard', getAnalytics);

export default router;





