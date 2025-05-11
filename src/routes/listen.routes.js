const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/auth.middleware');
const { getProgress, saveProgress } = require('../controllers/listen.controller');

router.post('/episodes/:id/progress', verifyToken, saveProgress);
router.get('/episodes/:id/progress', verifyToken, getProgress)

module.exports = router;