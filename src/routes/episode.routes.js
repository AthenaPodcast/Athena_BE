const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
    uploadAudioToCloudinary,
    createEpisode,
    getEpisodes,
    getEpisodeDetails,
    likeEpisode,
    getEpisodeLikeStatus,
    getLikedEpisodes,
    generateScript 
  } = require('../controllers/episode.controller');

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
  
// Create episode in DB (protected) - for authenticated channel
router.post(
    '/create',
    verifyToken,
    requireChannel,
    validatePodcastOwnership,
    createEpisode
);

// Get episodes for a specific podcast
router.get('/', verifyToken, getEpisodes);

// like/unlike an episode (toggle)
router.post('/:id/like', verifyToken, likeEpisode);

// get like status for an episode
router.get('/:episodeId/like', verifyToken, getEpisodeLikeStatus);

// Get liked episodes with count
router.get('/liked', verifyToken, getLikedEpisodes);

// get episode details
router.get('/:id', getEpisodeDetails);

// generate script for the audio
router.post('/:episodeId/generate-script', verifyToken, requireChannel, generateScript);

module.exports = router;