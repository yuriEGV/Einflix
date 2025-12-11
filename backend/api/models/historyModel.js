// models/historyModel.js
const mongoose = require('mongoose');

const WatchSchema = new mongoose.Schema({
user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
profileIndex: Number,
media: { type: mongoose.Schema.Types.ObjectId, ref: 'Media' },
position: Number, // seconds
watchedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('WatchHistory', WatchSchema);