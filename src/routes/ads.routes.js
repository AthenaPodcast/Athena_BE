const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/auth.middleware');
const adminOnly = require('../middlewares/adminOnly.middleware');
const { 
    createAdCampaign,
    getAdForEpisode,
    logAdPlay,
    getAdAnalytics,
    updateAdStatus,
    getAdCampaignById,
    deleteAdCampaign,
    updateAdCampaign,
    getAllAdCampaigns,
    getAdCampaignSummary,
    exportAdInsightsToCSV,
    renewAdCampaign
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
router.post('/:id/renew', renewAdCampaign);

router.get('/analytics', getAdAnalytics);
router.get('/summary', getAdCampaignSummary);
router.get('/campaigns', getAllAdCampaigns);
router.get('/:id', getAdCampaignById);
router.get('/analytics/export', exportAdInsightsToCSV);

router.patch('/:id/status', updateAdStatus);
router.put('/campaign/:id', upload.none(), updateAdCampaign);

router.delete('/campaign/:id', deleteAdCampaign);


module.exports = router;



