const axios = require('axios');
const pool = require('../../db');
const path = require('path');
const fs = require('fs');
const tmp = require('tmp');
const FormData = require('form-data');

const MATCHER_URL = process.env.MATCHER_MATCH_URL || 'http://127.0.0.1:8000/match-audio';

exports.matchAudio = async (req, res) => {
  try {
    const audioFile = req.file;
    if (!audioFile) return res.status(400).json({ error: 'Audio file is required' });

    // save to temp file
    const tmpFile = tmp.fileSync({ postfix: path.extname(audioFile.originalname) });
    fs.writeFileSync(tmpFile.name, audioFile.buffer);

    // prepare form data
    const formData = new FormData();
    formData.append('audio', fs.createReadStream(tmpFile.name));

    const matcherRes = await axios.post(MATCHER_URL, formData, {
      headers: formData.getHeaders()
    });

    tmpFile.removeCallback();

    const results = matcherRes.data.results;
    if (!results || results.length === 0) return res.status(404).json({ error: 'No match found' });

    const bestMatch = results[0];
    const songName = bestMatch.song_name;

    // extract episode ID from songName (if it contains Cloudinary path like 'episods/<public_id>')
    const episodeId = parseInt(songName?.split('/')[1], 10);
    if (isNaN(episodeId)) {
      return res.status(404).json({ error: 'Invalid episode ID in match result' });
    }

    const dbRes = await pool.query(
      `SELECT 
        e.id, 
        e.name, 
        e.picture_url,
        p.name AS podcast_name,
        cp.created_by_admin AS is_external
      FROM episodes e
      JOIN podcasts p ON p.id = e.podcast_id
      JOIN channelprofile cp ON cp.id = p.channel_id
      WHERE e.id = $1`,
      [episodeId]
    );


    if (dbRes.rows.length === 0) {
      return res.status(404).json({ error: 'Matched episode not found in DB' });
    }

    return res.status(200).json({ matched: dbRes.rows[0] });



  } catch (err) {
    console.error('matchAudio error:', err);
    return res.status(500).json({ error: 'Internal server error' });
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
