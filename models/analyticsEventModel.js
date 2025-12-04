import mongoose from 'mongoose';

const analyticsEventSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  mediaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Media', required: true },
  eventType: { type: String, enum: ['start', 'pause', 'stop'], required: true },
  percentageWatched: { type: Number, enum: [25, 50, 75, 100], required: false },
  sessionTime: { type: Number, required: false }, // Time in seconds
  timestamp: { type: Date, default: Date.now }
});

export default mongoose.model('AnalyticsEvent', analyticsEventSchema);


