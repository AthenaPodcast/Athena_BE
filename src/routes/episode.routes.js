const express = require('express');
const router = express.Router();
const multer = require('multer');
const { uploadAudioToCloudinary, createEpisode } = require('../controllers/episode.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

const storage = multer.memoryStorage();
const upload = multer({ storage });

// Upload audio file to Cloudinary
router.post('/upload', upload.single('audio'), uploadAudioToCloudinary);

// Save episode metadata to DB
router.post('/create', createEpisode);

module.exports = router;
