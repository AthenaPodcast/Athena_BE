const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/auth.middleware');
const adminOnly = require('../middlewares/adminOnly.middleware');
const { requestChannelUpgrade, deleteChannelRequest } = require('../controllers/channelRequest.controller');

router.post('/channel-request', verifyToken, requestChannelUpgrade);
router.delete('/channel-request/:id', verifyToken, adminOnly, deleteChannelRequest);

module.exports = router;
