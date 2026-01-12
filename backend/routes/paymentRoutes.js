import express from 'express';
import { iniciarPago, callbackFeedback } from '../controllers/paymentController.js';
const router = express.Router();

router.post('/iniciar', iniciarPago);
router.get('/feedback', callbackFeedback);

export default router;







