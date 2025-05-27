const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/auth.middleware');
const adminOnly = require('../middlewares/adminOnly.middleware');
const { createAdCampaign } = require('../controllers/ads.controller');
const multer = require('multer')

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.use(verifyToken, adminOnly);

// upload ad audio + metadata
router.post('/campaign', upload.single('audio'), createAdCampaign);

module.exports = router;
