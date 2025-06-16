const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/auth.middleware');
const adminOnly = require('../middlewares/adminOnly.middleware');
const upload = require('../config/imageMulter'); 
const { requestChannelUpgrade, deleteChannelRequest, checkChannelRequestStatus } = require('../controllers/channelRequest.controller');

router.post('/channel-request', verifyToken, upload.single('channelImage'), requestChannelUpgrade);
router.delete('/channel-request/:id', verifyToken, adminOnly, deleteChannelRequest);
router.get('/channel-request/status', verifyToken, checkChannelRequestStatus);

module.exports = router;
