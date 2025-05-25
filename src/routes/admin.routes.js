const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/auth.middleware');
const adminOnly = require('../middlewares/adminOnly.middleware');
const {
  getChannelRequests,
  approveRequest,
  rejectRequest,
  getAllChannelRequests,
  getAllUsers,
  getAllChannels,
  getAllPodcasts,
  getAllEpisodes,
  getUserDetails,
  getChannelDetails,
  getPodcastDetails,
  getEpisodeDetails,
  deleteUser,
  deleteChannel
} = require('../controllers/admin.controller');

router.use(verifyToken, adminOnly);

router.get('/channel-requests', getChannelRequests);
router.get('/all-channel-requests', getAllChannelRequests);
router.get('/users', getAllUsers);
router.get('/channels', getAllChannels);
router.get('/podcasts', getAllPodcasts);
router.get('/episodes', getAllEpisodes);
router.get('/user/:id', getUserDetails);
router.get('/channel/:id', getChannelDetails);
router.get('/podcast/:id', getPodcastDetails);
router.get('/episode/:id', getEpisodeDetails);

router.delete('/user/:id', deleteUser);
router.delete('/channel/:id', deleteChannel);

router.post('/channel-requests/:id/approve', approveRequest);
router.post('/channel-requests/:id/reject', rejectRequest);

module.exports = router;
