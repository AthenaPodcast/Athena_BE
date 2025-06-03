const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/auth.middleware');
const adminOnly = require('../middlewares/adminOnly.middleware');

const ExternalPodcast = require('../controllers/externalPodcast.controller');

router.use(verifyToken, adminOnly);

router.get('/podcasts/:id', ExternalPodcast.getPodcastById);
router.delete('/podcasts/:id', ExternalPodcast.deletePodcastById);

module.exports = router;
