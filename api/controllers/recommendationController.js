const Media = require('../models/mediaModel');
const User = require('../models/userModel');

// Get recommendations for a user
exports.getRecommendations = async (req, res) => {
  try {
    const userId = req.user.id; // Assuming user ID is available in the request

    // Example logic: Recommend random media for now
    const recommendations = await Media.aggregate([{ $sample: { size: 5 } }]);

    res.status(200).json(recommendations);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching recommendations' });
  }
};