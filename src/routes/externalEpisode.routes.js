const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/auth.middleware');
const adminOnly = require('../middlewares/adminOnly.middleware');

const {
  createExternalEpisode,
  getEpisodesByPodcast,
  getExternalEpisodeById,
  deleteExternalEpisode,
} = require('../controllers/externalEpisode.controller');

router.use(verifyToken, adminOnly);

router.post('/podcasts/:podcastId/episodes', createExternalEpisode);

router.get('/podcasts/:podcastId/episodes', getEpisodesByPodcast);
router.get('/episodes/:id', getExternalEpisodeById);

router.delete('/episodes/:id', deleteExternalEpisode);

module.exports = router;
