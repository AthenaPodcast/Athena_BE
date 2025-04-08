const express = require('express');
const router = express.Router();
const multer = require('multer');
const { uploadAudioToCloudinary } = require('../controllers/audio.controller');

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post('/upload', upload.single('audio'), uploadAudioToCloudinary);

module.exports = router;
