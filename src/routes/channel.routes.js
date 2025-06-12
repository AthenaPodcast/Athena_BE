const express = require('express');
const router = express.Router();
const multer = require('multer');

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
  fullUploadEpisodeChannel
} = require('../controllers/channel.controller');

const { verifyToken } = require('../middlewares/auth.middleware');
const { requireChannel } = require('../middlewares/channel.middleware');

const upload = multer({ storage: multer.memoryStorage() });

// Podcasts
router.post('/podcasts', verifyToken, requireChannel, createPodcast);
router.get('/podcasts', verifyToken, requireChannel, getMyPodcasts);
router.get('/podcasts/:id', verifyToken, requireChannel, getPodcastById);
router.put('/podcasts/:id', verifyToken, requireChannel, updatePodcast);
router.delete('/podcasts/:id', verifyToken, requireChannel, deletePodcast);

// Episodes
router.get('/podcasts/:podcastId/episodes', verifyToken, requireChannel, getEpisodesByPodcast);
router.post('/podcasts/:podcastId/episodes/full-upload', verifyToken, requireChannel, upload.single('audio'), fullUploadEpisodeChannel);
router.get('/episodes/:id', verifyToken, requireChannel, getEpisodeById);
router.put('/episodes/:id', verifyToken, requireChannel, updateEpisode);
router.delete('/episodes/:id', verifyToken, requireChannel, deleteEpisode);

// Channel Profile
router.get('/profile', verifyToken, requireChannel, getChannelProfile);
router.put('/profile', verifyToken, requireChannel, updateChannelProfile);

module.exports = router;