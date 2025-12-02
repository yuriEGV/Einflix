const Media = require('../models/mediaModel');

// Get all media
exports.getAllMedia = async (req, res) => {
  try {
    const media = await Media.find();
    res.status(200).json(media);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching media' });
  }
};

// Get media by ID
exports.getMediaById = async (req, res) => {
  try {
    const media = await Media.findById(req.params.id);
    if (!media) return res.status(404).json({ error: 'Media not found' });
    res.status(200).json(media);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching media' });
  }
};

// Create new media
exports.createMedia = async (req, res) => {
  try {
    const newMedia = new Media(req.body);
    await newMedia.save();
    res.status(201).json(newMedia);
  } catch (error) {
    res.status(500).json({ error: 'Error creating media' });
  }
};