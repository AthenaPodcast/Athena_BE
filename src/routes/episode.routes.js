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
    generateScript,
    fullUploadEpisode 
  } = require('../controllers/episode.controller');

const { verifyToken } = require('../middlewares/auth.middleware');
const { requireChannel, validatePodcastOwnership } = require('../middlewares/channel.middleware');
const { submitReview, getEpisodeReviews, deleteReview } = require('../controllers/review.controller');

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

// post a review on episode 
router.post('/:episodeId/reviews', verifyToken, submitReview);

// get all reviews for the episode
router.get('/:episodeId/reviews', getEpisodeReviews);

// delete a review - owner
router.delete('/reviews/:reviewId', verifyToken, deleteReview);

// POST /api/episodes/full-upload
router.post(
  '/full-upload',
  verifyToken,                   
  requireChannel,                
  upload.single('audio'),        
  fullUploadEpisode              
);

module.exports = router;