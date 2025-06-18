const express = require('express');
const router = express.Router();
const { getUserRecommendations } = require('../controllers/user.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { getExternalChannels} = require('../controllers/externalChannel.controller');
const { 
    getAllRegularChannels,
    getChannelById,
    getPodcastsByChannelId,
    getPublicPodcastById,
    getPublicPodcastEpisodes,
    toggleSavePodcast   
} = require('../controllers/channel.controller');
const { getPublicEpisodeById, likeEpisode } = require('../controllers/episode.controller');

router.get('/recommendations', verifyToken, getUserRecommendations);
router.get('/external-channels', verifyToken, getExternalChannels);
router.get('/regular-channels', verifyToken, getAllRegularChannels);
router.get('/channels/:id', verifyToken, getChannelById);
router.get('/channels/:id/podcasts', verifyToken, getPodcastsByChannelId);
router.get('/podcasts/:id', verifyToken, getPublicPodcastById);
router.get('/podcasts/:id/episodes', verifyToken, getPublicPodcastEpisodes);
router.post('/podcasts/:id/toggle-save', verifyToken, toggleSavePodcast);
router.get('/episodes/:id', verifyToken, getPublicEpisodeById);
router.post('/episodes/:id/toggle-like', verifyToken, likeEpisode);

module.exports = router;
