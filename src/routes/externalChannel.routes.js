const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/auth.middleware');
const adminOnly = require('../middlewares/adminOnly.middleware');
const upload = require('../config/imageMulter');

const {
  createExternalChannel,
  getAllExternalChannels,
  getExternalChannelById,
  deleteExternalChannel,
  getPodcastsByChannelId,
  createPodcastUnderChannel,
} = require('../controllers/externalChannel.controller');

router.use(verifyToken, adminOnly);

router.post('/external-channels', upload.single('channelImage'), createExternalChannel);
router.get('/external-channels', getAllExternalChannels);
router.get('/external-channels/:id', getExternalChannelById);
router.delete('/external-channels/:id', deleteExternalChannel);

router.get('/external-channels/:channelId/podcasts', getPodcastsByChannelId);
router.post('/external-channels/:channelId/podcasts', upload.single('podcastImage'), createPodcastUnderChannel);

module.exports = router;
