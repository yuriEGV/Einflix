import express from 'express';
import { iniciarPago, callbackExitoso, callbackError } from '../controllers/paymentController.js';
const router = express.Router();

router.post('/iniciar', iniciarPago);
router.get('/feedback', callbackFeedback);

export default router;







