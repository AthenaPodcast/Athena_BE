const axios = require('axios');

const MATCHER_URL = process.env.MATCHER_URL || 'http://localhost:8000/match-audio';

async function matchAudio(filePath) {
  try {
    const formData = new FormData();
    const fs = require('fs');
    const path = require('path');

    const fileStream = fs.createReadStream(path.resolve(filePath));
    formData.append('audio', fileStream);

    const response = await axios.post(MATCHER_URL, formData, {
      headers: formData.getHeaders(),
    });

    return response.data;
  } catch (err) {
    console.error('Matcher Service Error:', err.message);
    throw new Error('Failed to match audio');
  }
}

module.exports = {
  matchAudio,
};
