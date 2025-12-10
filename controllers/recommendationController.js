import Media from '../models/mediaModel.js';
import User from '../models/userModel.js';

// Get recommendations for a user
export async function getRecommendations(req, res) {
  try {
    const userId = req.user.id; // Assuming user ID is available in the request

    // Example logic: Recommend random media for now
    const recommendations = await Media.aggregate([{ $sample: { size: 5 } }]);

    res.status(200).json(recommendations);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching recommendations' });
  }
}



