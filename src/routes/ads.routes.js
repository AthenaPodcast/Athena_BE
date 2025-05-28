const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/auth.middleware');
const adminOnly = require('../middlewares/adminOnly.middleware');
const { 
    createAdCampaign,
    getAdForEpisode,
    logAdPlay
 } = require('../controllers/ads.controller');
const multer = require('multer')

const storage = multer.memoryStorage();
const upload = multer({ storage });

// public
// get best matching campaign
router.get('/for-episode/:episodeId', verifyToken, getAdForEpisode);
router.post('/play-log', verifyToken, logAdPlay);

//admin
router.use(verifyToken, adminOnly);
// upload ad audio + metadata
router.post('/campaign', upload.single('audio'), createAdCampaign);

module.exports = router;



