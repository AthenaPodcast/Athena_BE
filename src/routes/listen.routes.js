const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/auth.middleware');
const { saveProgress } = require('../controllers/listen.controller');

router.post('/episodes/:id/progress', verifyToken, saveProgress);

module.exports = router;