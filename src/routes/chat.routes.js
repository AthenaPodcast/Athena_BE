const express = require('express');
const router = express.Router();
const { chatWithEpisode } = require('../controllers/chat.controller');
const { verifyToken } = require('../middlewares/auth.middleware'); 

router.post('/episodes/:episodeId/chat', verifyToken, chatWithEpisode);

module.exports = router;
