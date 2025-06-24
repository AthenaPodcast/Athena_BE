const express = require('express');
const router = express.Router();
const { getHomeData } = require('../controllers/home.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

router.get('/', verifyToken, getHomeData);

module.exports = router;
