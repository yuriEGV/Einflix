const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

// Helmet for securing HTTP headers
const applyHelmet = helmet();

// CORS configuration
const applyCors = cors({
  origin: '*', // Update this to restrict origins in production
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
});

// Rate limiting
const applyRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later.'
});

module.exports = { applyHelmet, applyCors, applyRateLimit };