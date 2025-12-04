import express from 'express';
import { iniciarPago, callbackExitoso, callbackError } from '../controllers/paymentController.js';
const router = express.Router();

router.post('/iniciar', iniciarPago);
router.post('/webpay/callback-exito', callbackExitoso);
router.post('/webpay/callback-error', callbackError);

export default router;


