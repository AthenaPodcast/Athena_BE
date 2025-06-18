const express = require('express');
const router = express.Router();
const { getUserRecommendations } = require('../controllers/user.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { getExternalChannels} = require('../controllers/externalChannel.controller');
const { getAllRegularChannels} = require('../controllers/channel.controller');

router.get('/recommendations', verifyToken, getUserRecommendations);
router.get('/external-channels', verifyToken, getExternalChannels);
router.get('/regular-channels', verifyToken, getAllRegularChannels);

module.exports = router;
