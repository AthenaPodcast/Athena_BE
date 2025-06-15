const express = require('express');
const router = express.Router();
const multer = require('multer');
const imageUpload = require('../config/imageMulter');

const uploadBoth = multer({
  storage: multer.memoryStorage(), 
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/jpg',
      'audio/mpeg', 'audio/mp3', 'audio/wav'
    ];
    if (allowedTypes.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Unsupported file type'), false);
  }
}).fields([
  { name: 'image', maxCount: 1 },
  { name: 'audio', maxCount: 1 }
]);

const {
  createPodcast,
  getMyPodcasts,
  getPodcastById,
  updatePodcast,
  deletePodcast,
  getEpisodesByPodcast,
  getEpisodeById,
  updateEpisode,
  deleteEpisode,
  getChannelProfile,
  updateChannelProfile,
  fullUploadEpisode
} = require('../controllers/channel.controller');

const { verifyToken } = require('../middlewares/auth.middleware');
const { requireChannel, validatePodcastOwnership } = require('../middlewares/channel.middleware');

// Podcasts
router.post('/podcasts', verifyToken, requireChannel, imageUpload.single('image'), createPodcast);
router.get('/podcasts', verifyToken, requireChannel, getMyPodcasts);
router.get('/podcasts/:id', verifyToken, requireChannel, getPodcastById);
router.put('/podcasts/:id', verifyToken, requireChannel, imageUpload.single('image'), updatePodcast);
router.delete('/podcasts/:id', verifyToken, requireChannel, deletePodcast);

// Episodes
router.get('/podcasts/:podcastId/episodes', verifyToken, requireChannel, getEpisodesByPodcast);
router.post('/podcasts/:id/episodes/full-upload', verifyToken, requireChannel, validatePodcastOwnership, uploadBoth, fullUploadEpisode);
router.get('/episodes/:id', verifyToken, requireChannel, getEpisodeById);
router.put('/episodes/:id', verifyToken, requireChannel, updateEpisode);
router.delete('/episodes/:id', verifyToken, requireChannel, deleteEpisode);

// Channel Profile
router.get('/profile', verifyToken, requireChannel, getChannelProfile);
router.put('/profile', verifyToken, requireChannel, updateChannelProfile);

module.exports = router;