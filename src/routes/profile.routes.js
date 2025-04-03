const express = require('express');
const router = express.Router();
const {
    completeProfile,
    uploadProfilePicture
  } = require('../controllers/profile.controller');
const requireAuth = require('../middlewares/auth.middleware');
const upload = require('../config/multer');
const { saveUserInterests } = require('../controllers/profile.controller');
const { deleteUserInterests } = require('../models/userProfile.model');

router.post('/complete', requireAuth, completeProfile);

router.post(
    '/upload-picture',
    requireAuth,
    upload.single('profileImage'),
    uploadProfilePicture
);

router.post('/interests', requireAuth, saveUserInterests);

router.delete('/interests', requireAuth, async (req, res) => {
    const accountId = req.user.accountId;
  
    try {
      await deleteUserInterests(accountId);
      res.status(200).json({ message: 'All interests removed successfully' });
    } catch (err) {
      console.error('Error clearing interests:', err);
      res.status(500).json({ message: 'Failed to clear interests' });
    }
  });
  

module.exports = router;
