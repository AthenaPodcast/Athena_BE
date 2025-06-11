const axios = require('axios');
const pool = require('../../db');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');

exports.matchAudio = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No audio file provided' });
    }

    // Prepare the audio file to forward to the Python matcher microservice
    const formData = new FormData();
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(__dirname, '../../', req.file.path);
    formData.append('audio', fs.createReadStream(filePath));

    const matcherResponse = await axios.post(
      'http://localhost:8000/match-audio', // Python matcher endpoint
      formData,
      {
        headers: formData.getHeaders(),
      }
    );

    // Delete the uploaded temp file
    fs.unlinkSync(filePath);

    const matchResult = matcherResponse.data;

    if (!matchResult || !matchResult.song_name) {
      return res.status(404).json({ success: false, error: 'No match found' });
    }

    const publicId = matchResult.song_name;

    // Look up the episode from the Athena database using the audio_url
    const result = await pool.query(
      `SELECT * FROM episodes WHERE audio_url ILIKE $1`,
      [`%${publicId}%`]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Match found, but episode not in Athena DB' });
    }

    return res.json({
      success: true,
      matchedEpisode: result.rows[0],
    });

  } catch (err) {
    console.error('Matching error:', err.message);
    return res.status(500).json({ success: false, error: 'Internal error during match' });
  }
};

exports.fingerprintEpisode = async (req, res) => {
  try {
    const episodeId = req.params.episodeId;

    const { rows } = await pool.query('SELECT * FROM episodes WHERE id = $1', [episodeId]);
    if (rows.length === 0) return res.status(404).json({ message: 'Episode not found' });

    const episode = rows[0];
    const audioUrl = episode.audio_url;

    const response = await axios.post('http://localhost:8000/fingerprint', { url: audioUrl });

    res.json({ success: true, response: response.data });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Error fingerprinting episode' });
  }
};
