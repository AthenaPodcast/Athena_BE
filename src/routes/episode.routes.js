const express = require('express');
const router = express.Router();
const multer = require('multer');
const { uploadAudioToCloudinary, createEpisode } = require('../controllers/episode.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { requireChannel, validatePodcastOwnership } = require('../middlewares/channel.middleware');

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Upload audio to Cloudinary (protected)
router.post(
    '/upload',
    verifyToken,
    requireChannel,
    upload.single('audio'),
    uploadAudioToCloudinary
);
  
// Create episode in DB (protected)
router.post(
    '/create',
    verifyToken,
    requireChannel,
    validatePodcastOwnership,
    createEpisode
);
  
module.exports = router;