const express = require('express');
const router = express.Router();
const { searchHandler, getSearchSuggestions} = require('../controllers/search.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

router.get('/', verifyToken, searchHandler);
router.get('/suggestions', verifyToken, getSearchSuggestions);

module.exports = router;
