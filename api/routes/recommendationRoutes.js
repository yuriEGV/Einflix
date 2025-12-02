const express = require('express');
const router = express.Router();
const recommendationController = require('../controllers/recommendationController');
const authMiddleware = require('../middlewares/authMiddleware');

// Recommendation routes
router.get('/', authMiddleware, recommendationController.getRecommendations);

module.exports = router;