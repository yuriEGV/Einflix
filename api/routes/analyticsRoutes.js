const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');

// Route to save analytics events
router.post('/events', analyticsController.saveEvent);

// Route to get analytics data for admin dashboard
router.get('/dashboard', analyticsController.getAnalytics);

module.exports = router;