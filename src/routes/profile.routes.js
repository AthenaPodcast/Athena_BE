const express = require('express');
const router = express.Router();
const { completeProfile } = require('../controllers/profile.controller');
const requireAuth = require('../middlewares/auth.middleware');

router.post('/complete', requireAuth, completeProfile);

module.exports = router;
