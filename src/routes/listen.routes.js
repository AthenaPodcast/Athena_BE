const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/auth.middleware');
const { getRecentlyPlayed, getProgress, saveProgress } = require('../controllers/listen.controller');

router.post('/episodes/:id/progress', verifyToken, saveProgress);
router.get('/episodes/:id/progress', verifyToken, getProgress)
router.get('/recently-played', verifyToken, getRecentlyPlayed);

module.exports = router;