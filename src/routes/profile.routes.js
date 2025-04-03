const express = require('express');
const router = express.Router();
const {
    completeProfile,
    uploadProfilePicture
  } = require('../controllers/profile.controller');
const requireAuth = require('../middlewares/auth.middleware');
const upload = require('../config/multer');

router.post('/complete', requireAuth, completeProfile);

router.post(
    '/upload-picture',
    requireAuth,
    upload.single('profileImage'),
    uploadProfilePicture
  );

module.exports = router;
