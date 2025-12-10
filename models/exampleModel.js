import mongoose from 'mongoose';

const exampleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Example', exampleSchema);



