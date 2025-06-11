const express = require('express');
const router = express.Router();
const matcherController = require('../controllers/matcher.controller');
const upload = require('../config/audioMulter');

router.post('/match-audio', upload.single('audio'), matcherController.matchAudio);
router.post('/fingerprint/:episodeId', matcherController.fingerprintEpisode);

module.exports = router;
