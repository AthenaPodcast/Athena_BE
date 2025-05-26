const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/auth.middleware');
const adminOnly = require('../middlewares/adminOnly.middleware');
const {
  getMostLikedEpisodes,
  getMostSavedPodcasts,
  getTopListeners,
  getTopCategories,
  getAverageListeningTime
} = require('../controllers/insights.controller');

router.use(verifyToken, adminOnly);

router.get('/most-liked-episodes', getMostLikedEpisodes);
router.get('/most-saved-podcasts', getMostSavedPodcasts);
router.get('/top-listeners', getTopListeners);
router.get('/top-categories', getTopCategories);
router.get('/avg-listening-time', getAverageListeningTime);

module.exports = router;
