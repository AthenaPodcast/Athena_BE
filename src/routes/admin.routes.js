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
  getAllEpisodes
} = require('../controllers/admin.controller');

router.use(verifyToken, adminOnly);

router.get('/channel-requests', getChannelRequests);
router.get('/all-channel-requests', getAllChannelRequests);
router.get('/users', getAllUsers);
router.get('/channels', getAllChannels);
router.get('/podcasts', getAllPodcasts);
router.get('/episodes', getAllEpisodes);

router.post('/channel-requests/:id/approve', approveRequest);
router.post('/channel-requests/:id/reject', rejectRequest);

module.exports = router;
