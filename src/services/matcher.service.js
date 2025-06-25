const axios = require('axios');
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");
require('dotenv').config(); 

const MATCHER_URL = process.env.MATCHER_MATCH_URL || 'http://127.0.0.1:8000/match-audio';
const FINGERPRINT_URL = process.env.MATCHER_FINGERPRINT_URL || "http://127.0.0.1:8000/fingerprint";


async function matchAudio(filePath) {
  try {
    const formData = new FormData();
    const fileStream = fs.createReadStream(path.resolve(filePath));
    formData.append('file', fileStream);

    const response = await axios.post(MATCHER_URL, formData, {
      headers: formData.getHeaders(),
    });

    return response.data;
  } catch (err) {
    console.error('Matcher Service Error:', err.message);
    throw new Error('Failed to match audio');
  }
}

async function fingerprintAudio(filePath) {
  try {
    const formData = new FormData();
    const fileStream = fs.createReadStream(path.resolve(filePath));
    formData.append("audio", fileStream);

    const response = await axios.post(FINGERPRINT_URL, formData, {
      headers: formData.getHeaders(),
    });

    return response.data;
  } catch (err) {
    console.error("Fingerprint Service Error:", err.message);
    throw new Error("Failed to fingerprint audio");
  }
}

module.exports = {
  matchAudio,
  fingerprintAudio
};
