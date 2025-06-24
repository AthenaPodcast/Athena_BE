const express = require('express');
const router = express.Router();
const { getCategoryDetail } = require('../controllers/category.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

router.get('/:id', verifyToken, getCategoryDetail);

module.exports = router;
