// models/userModel.js
const mongoose = require('mongoose');

const ProfileSchema = new mongoose.Schema({
name: { type: String, required: true },
avatar: String,
isKid: { type: Boolean, default: false },
preferences: [String] // géneros preferidos
});

const UserSchema = new mongoose.Schema({
email: { type: String, required: true, unique: true },
passwordHash: { type: String, required: true },
name: String,
roles: { type: [String], default: ['user'] },
profiles: { type: [ProfileSchema], default: [] },
createdAt: { type: Date, default: Date.now },
lastLogin: Date,
stripeCustomerId: String // opcional para otros pagos
});

module.exports = mongoose.model('User', UserSchema);