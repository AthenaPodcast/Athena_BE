const express = require('express');
const router = express.Router();
const {
    completeProfile,
    uploadProfilePicture,
    saveUserInterests, 
    isProfileComplete,
    getUserProfile,
    editUserProfile,
    getProfileSummaryLiked,
    getAllLikedEpisodes,
    getAllSavedPodcasts
  } = require('../controllers/profile.controller');
const { verifyToken } = require('../middlewares/auth.middleware'); 
const upload = require('../config/imageMulter');
const { deleteUserInterests } = require('../models/userProfile.model');

router.post('/complete', verifyToken, completeProfile);
router.post(
    '/upload-picture',
    verifyToken,
    upload.single('profileImage'),
    uploadProfilePicture
);
router.post('/interests', verifyToken, saveUserInterests);
router.delete('/interests', verifyToken, async (req, res) => {
    const accountId = req.user.accountId;
  
    try {
      await deleteUserInterests(accountId);
      res.status(200).json({ message: 'All interests removed successfully' });
    } catch (err) {
      console.error('Error clearing interests:', err);
      res.status(500).json({ message: 'Failed to clear interests' });
    }
  });
  
router.get('/is-complete', verifyToken, isProfileComplete);

router.get('/', verifyToken, getUserProfile);
router.put('/edit', verifyToken, upload.single('profileImage'), editUserProfile);

router.get('/summary', verifyToken, getProfileSummaryLiked);
router.get('/liked', verifyToken, getAllLikedEpisodes);
router.get('/saved', verifyToken, getAllSavedPodcasts);

module.exports = router;
