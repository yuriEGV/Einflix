const AnalyticsEvent = require('../models/analyticsEventModel');

// Save analytics event
exports.saveEvent = async (req, res) => {
  try {
    const { userId, mediaId, eventType, percentageWatched, sessionTime } = req.body;
    const newEvent = new AnalyticsEvent({ userId, mediaId, eventType, percentageWatched, sessionTime });
    await newEvent.save();
    res.status(201).json({ message: 'Event saved successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error saving event' });
  }
};

// Get analytics data for admin dashboard
exports.getAnalytics = async (req, res) => {
  try {
    const topMedia = await AnalyticsEvent.aggregate([
      { $group: { _id: '$mediaId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    const dau = await AnalyticsEvent.aggregate([
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }, users: { $addToSet: '$userId' } } },
      { $project: { date: '$_id', dau: { $size: '$users' } } },
      { $sort: { date: -1 } },
      { $limit: 7 }
    ]);

    const avgSessionTime = await AnalyticsEvent.aggregate([
      { $group: { _id: null, avgTime: { $avg: '$sessionTime' } } }
    ]);

    res.status(200).json({
      topMedia,
      dau,
      avgSessionTime: avgSessionTime[0]?.avgTime || 0
    });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching analytics' });
  }
};