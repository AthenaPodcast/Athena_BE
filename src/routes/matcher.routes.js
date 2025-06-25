const express = require('express');
const multer = require('multer');
const router = express.Router();
const matcherController = require('../controllers/matcher.controller');
const upload = multer();
const { verifyToken } = require('../middlewares/auth.middleware');

router.post('/match-audio', verifyToken, upload.single('audio'), matcherController.matchAudio);
router.post('/fingerprint/:episodeId', matcherController.fingerprintEpisode);

module.exports = router;
