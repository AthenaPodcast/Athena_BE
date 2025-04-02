const express = require('express');
const router = express.Router();
const { signup, login, verifyEmail } = require('../controllers/auth.controller');

// Routes
router.post('/signup', signup);
router.post('/login', login);
router.get('/verify-email', verifyEmail); // ?token=123abc

module.exports = router;

