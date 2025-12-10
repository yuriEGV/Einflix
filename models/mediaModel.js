import mongoose from 'mongoose';

const mediaSchema = new mongoose.Schema({
  title: { type: String, required: true },
  type: { type: String, enum: ['video', 'music', 'comic'], required: true },
  description: String,
  url: { type: String, required: true },
  thumbnail: String,
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Media', mediaSchema);





