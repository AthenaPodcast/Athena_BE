const express = require('express');
const router = express.Router();
const { signup, login, verifyEmail } = require('../controllers/auth.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { forgotPassword, resetPassword, resetPasswordWithCode } = require('../controllers/auth.controller');

// Routes
router.post('/signup', signup);
router.post('/login', login);
router.get('/verify-email', verifyEmail); // ?token=123abc

// test rourte for logged users only 
router.get('/dashboard', verifyToken, (req, res) => {
    res.json({
      message: 'Welcome to your dashboard!',
      user: req.user,
    });
  });

router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/reset-password-with-code', resetPasswordWithCode);

module.exports = router;

