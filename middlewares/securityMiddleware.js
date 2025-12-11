import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

// Helmet for securing HTTP headers
export const applyHelmet = helmet();

// CORS configuration
export const applyCors = cors({
  origin: '*', // Update this to restrict origins in production
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
});

// Rate limiting
export const applyRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later.'
});







