const pool = require('../../db');
const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');
const { createEpisode } = require('../models/episode.model');
const { getEpisodesByPodcastId } = require('../models/episode.model');
const { getEpisodeDetails } = require('../models/episode.model');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const ffprobeInstaller = require('@ffprobe-installer/ffprobe');
const axios = require('axios');
const tmp = require('tmp');
const fs = require('fs');

ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);

exports.uploadAudioToCloudinary = async (req, res) => {
  try {
    const file = req.file;

    if (!file) return res.status(400).json({ message: 'No audio file provided' });

    const streamUpload = (fileBuffer) => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            resource_type: 'video', // audio is under "video" type in Cloudinary
            folder: 'episods', // optional folder name
          },
          (error, result) => {
            if (result) resolve(result);
            else reject(error);
          }
        );
        streamifier.createReadStream(fileBuffer).pipe(stream);
      });
    };

    const result = await streamUpload(file.buffer);

    res.status(200).json({
      message: 'Audio uploaded successfully',
      audioUrl: result.secure_url,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Error uploading audio' });
  }
};

exports.createEpisode = async (req, res) => {
  console.log('Incoming create episode request body:', req.body);
  console.log('From user:', req.user);

  const { podcast_id, name, description, picture_url, audio_url, release_date } = req.body;

  // Basic input check
  if (!podcast_id || !name || !release_date || !audio_url) {
    return res.status(400).json({ message: 'Missing required fields including audio_url' });
  }

  // Validate date
  const isValidDate = !isNaN(Date.parse(release_date));
  if (!isValidDate) {
    return res.status(400).json({ message: 'Invalid release date format. Use YYYY-MM-DD.' });
  }
  
  try {
    // download audio from cloudinary
    const response = await axios.get(audio_url, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data, 'binary');

    // extract duration using a temp file
    const getAudioDuration = (buffer) => {
      return new Promise((resolve, reject) => {
        tmp.file({ postfix: '.mp3' }, (err, path, fd, cleanupCallback) => {
          if (err) return reject(err);

          fs.writeFileSync(path, buffer); // write buffer to temp file

          ffmpeg.ffprobe(path, (err, metadata) => {
            cleanupCallback(); // remove temp file
            if (err) return reject(err);
            if (!metadata || !metadata.format || !metadata.format.duration) {
              return reject('Duration not found in metadata');
            }

            const durationInSeconds = Math.round(metadata.format.duration);
            resolve(durationInSeconds);
          });
        });
      });
    };

    const duration = await getAudioDuration(buffer);
    console.log('Duration (seconds):', duration);

    if (!duration || isNaN(duration)) {
      console.warn('Extracted invalid duration:', duration);
      return res.status(400).json({ message: 'Unable to extract valid audio duration.' });
    }
    
    // save to DB
    const insertQuery = `
      INSERT INTO episodes (podcast_id, name, description, picture_url, audio_url, duration, release_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;

    const values = [
      podcast_id, 
      name, 
      description, 
      picture_url, 
      audio_url, 
      duration, 
      release_date
    ];
    
    const result = await pool.query(insertQuery, values);

    return res.status(201).json({
      message: 'Episode created successfully',
      episode: result.rows[0],
    });

  } catch (error) {
    console.error('Error creating episode:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

exports.getEpisodes = async (req, res) => {
  const { podcast_id } = req.query;

  if (!podcast_id) {
    return res.status(400).json({ message: 'Missing podcast_id in query' });
  }

  try {
    const episodes = await getEpisodesByPodcastId(podcast_id);
    res.status(200).json(episodes);
  } catch (err) {
    console.error('Error fetching episodes:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getEpisodeDetails = async (req, res) => {
  const { id } = req.params;
  try {
    const episode = await getEpisodeDetails(id);

    if (!episode) {
      return res.status(404).json({ message: 'Episode not found' });
    }

    return res.status(200).json(episode);
  } catch (err) {
    console.error('Error fetching episode details:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};
