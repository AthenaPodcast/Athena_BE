const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/auth.middleware');
const adminOnly = require('../middlewares/adminOnly.middleware');
const {
  getMostLikedEpisodes,
  getMostSavedPodcasts,
  getTopListeners,
  getTopCategories,
  getAverageListeningTime,
  getMostReviewedEpisodes,
  getTopRatedEpisodes,
  getInactiveUsers,
  getNewUsers,
  getNewEpisodes,
  getInsightsSummary
} = require('../controllers/insights.controller');

router.use(verifyToken, adminOnly);

router.get('/most-liked-episodes', getMostLikedEpisodes);
router.get('/most-saved-podcasts', getMostSavedPodcasts);
router.get('/top-listeners', getTopListeners);
router.get('/top-categories', getTopCategories);
router.get('/avg-listening-time', getAverageListeningTime);
router.get('/most-reviewed-episodes', getMostReviewedEpisodes);
router.get('/top-rated-episodes', getTopRatedEpisodes);
router.get('/inactive-users', getInactiveUsers);
router.get('/new-users', getNewUsers);
router.get('/new-episodes', getNewEpisodes);
router.get('/summary', getInsightsSummary);


module.exports = router;
