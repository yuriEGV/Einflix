import multer from 'multer';
import path from 'path';

// Configure storage for video uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'api/uploads/'); // Directory for storing uploaded videos
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const fileTypes = /mp4/; // Only allow MP4 files
    const extName = fileTypes.test(path.extname(file.originalname).toLowerCase());
    if (extName) {
      return cb(null, true);
    }
    cb(new Error('Only MP4 files are allowed'));
  }
});

// Middleware for handling video uploads
export const uploadVideo = upload.single('video');

// Controller for handling video upload response
export const handleVideoUpload = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No video file uploaded' });
  }
  res.status(200).json({ message: 'Video uploaded successfully', file: req.file });
};