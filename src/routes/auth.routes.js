const express = require('express');
const router = express.Router();
const { signup, login, verifyEmail } = require('../controllers/auth.controller');
const requireAuth = require('../middlewares/auth.middleware');

// Routes
router.post('/signup', signup);
router.post('/login', login);
router.get('/verify-email', verifyEmail); // ?token=123abc

// test rourte for logged users only 
router.get('/dashboard', requireAuth, (req, res) => {
    res.json({
      message: 'Welcome to your dashboard!',
      user: req.user,
    });
  });

module.exports = router;

