const express = require('express');
const router = express.Router();
const { getUserRecommendations } = require('../controllers/user.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

router.get('/recommendations', verifyToken, getUserRecommendations);

module.exports = router;
