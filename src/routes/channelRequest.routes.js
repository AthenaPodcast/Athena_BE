const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/auth.middleware');
const { requestChannelUpgrade } = require('../controllers/channelRequest.controller');

router.post('/channel-request', verifyToken, requestChannelUpgrade);

module.exports = router;
