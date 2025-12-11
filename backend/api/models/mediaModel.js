// models/mediaModel.js
const mongoose = require('mongoose');

const MediaSchema = new mongoose.Schema({
title: { type: String, required: true },
description: String,
type: { type: String, enum: ['movie','episode','short','clip'], default: 'movie' },
genres: [String],
tags: [String],
duration: Number, // segundos
thumbnails: {
poster: String,
banner: String
},
qualities: [{ quality: String, url: String }], // ex: { quality: '720p', url: 'https://...' }
hls: String, // url del .m3u8
posterUrl: String,
visible: { type: Boolean, default: true },
views: { type: Number, default: 0 },
publishDate: Date,
createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Media', MediaSchema);