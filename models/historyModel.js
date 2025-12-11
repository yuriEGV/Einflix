import mongoose from 'mongoose';

const historySchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    mediaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Media', required: true },
    watchedAt: { type: Date, default: Date.now },
    progress: { type: Number, default: 0 } // Porcentaje o tiempo visto
});

const History = mongoose.model('History', historySchema);
export default History;







