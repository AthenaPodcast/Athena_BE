const pool = require('../../db');
const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');
const { 
  createEpisode,
  getEpisodesByPodcastId,
  getEpisodeDetails,
  toggleEpisodeLike, 
  getEpisodeLike,
  getLikedEpisodes,
  countLikedEpisodes,
  updateEpisodeScript 
 } = require('../models/episode.model');
 
const { transcribeAudioFromUrl } = require('../utils/transcribe');

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

exports.likeEpisode = async (req, res) => {
  const accountId = req.user.accountId;
  const episodeId = parseInt(req.params.id, 10);

  if (isNaN(episodeId)) {
    return res.status(400).json({ message: 'Invalid episode ID' });
  }

  try {
    const liked = await toggleEpisodeLike(accountId, episodeId);
    res.status(200).json({
      message: liked ? 'Episode liked' : 'Episode unliked',
      liked
    });
  } catch (err) {
    console.error('Error toggling like:', err);
    res.status(500).json({ message: 'Failed to toggle like status' });
  }
};

exports.getEpisodeLikeStatus = async (req, res) => {
  const { episodeId } = req.params;
  const accountId = req.user.accountId;

  try {
    const result = await getEpisodeLike(accountId, episodeId);
    res.status(200).json({ liked: result?.liked || false });
  } catch (err) {
    console.error('Like status fetch error:', err);
    res.status(500).json({ message: 'Failed to retrieve like status' });
  }
};

exports.getLikedEpisodes = async (req, res) => {
  const accountId = req.user.accountId;

  try {
    const episodes = await getLikedEpisodes(accountId);
    const count = await countLikedEpisodes(accountId);

    res.status(200).json({
      count,
      episodes
    });
  } catch (err) {
    console.error('Liked episodes fetch error:', err);
    res.status(500).json({ message: 'Failed to fetch liked episodes' });
  }
};

exports.generateScript = async (req, res) => {
  const { episodeId } = req.params;

  try {
    const result = await pool.query(`SELECT audio_url FROM episodes WHERE id = $1`, [episodeId]);
    const episode = result.rows[0];

    if (!episode || !episode.audio_url) {
      return res.status(404).json({ message: 'Episode not found or missing audio_url' });
    }

    const transcript = await transcribeAudioFromUrl(episode.audio_url);
    const updatedEpisode = await updateEpisodeScript(episodeId, transcript);

    res.status(200).json({ message: 'Script generated', script: updatedEpisode.script });
  } catch (err) {
    console.error('Transcription error:', err);
    res.status(500).json({ message: 'Failed to generate script' });
  }
};

// full upload episode (audio, metadata, script with time)
exports.fullUploadEpisode = async (req, res) => {
  try {
    const { podcast_id, name, description, release_date, picture_url } = req.body;
    const audioFile = req.file;

    if (req.user.type !== 'channel') {
      return res.status(403).json({ error: 'Only channel accounts can upload episodes' });
    }

    if (!audioFile) return res.status(400).json({ error: 'Audio file is required' });

    // upload audio to cloudinary
    const streamUpload = (fileBuffer) => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            resource_type: 'video',
            folder: 'episods',
          },
          (error, result) => {
            if (result) resolve(result);
            else reject(error);
          }
        );
        
        stream.end(fileBuffer);
      });
    };
    
    const uploadResult = await streamUpload(audioFile.buffer);


    const audioUrl = uploadResult.secure_url;

    // extract duration of audio with FFmpeg
    const duration = await new Promise((resolve, reject) => {
      ffmpeg.ffprobe(audioUrl, (err, metadata) => {
        if (err) return reject(err);
        resolve(Math.floor(metadata.format.duration));
      });
    });

    // transcribe audio
    const { script, transcriptJson } = await transcribeAudioFromUrl(audioUrl);
    
    console.log("transcriptJson PREVIEW:", transcriptJson.slice(0, 3));
    console.log("total:", transcriptJson.length);
    console.log("is array?", Array.isArray(transcriptJson));


    console.log('Saving episode with:', {
      scriptLength: script.length,
      wordCount: transcriptJson.length,
      firstWord: transcriptJson[0],
    });
    
    // save episode to DB
    console.log("Final transcriptJson count:", transcriptJson.length);

    // const result = await pool.query(
    //   `INSERT INTO episodes (podcast_id, name, description, audio_url, release_date, duration, script, transcript_json, picture_url)
    //   VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    //   RETURNING id`,
    //   [podcast_id, name, description, audioUrl, release_date, duration, script, JSON.stringify(transcriptJson), picture_url]
    // );
    console.log("transcriptJson preview before insert:", transcriptJson.slice(0, 2));
    console.log("type:", typeof transcriptJson);
    console.log("isArray:", Array.isArray(transcriptJson));
    
    const episode = await createEpisode({
      podcast_id,
      name,
      description,
      picture_url,
      audio_url: audioUrl,
      duration,
      script,
      transcript_json: transcriptJson,
      release_date
    });

    // clean up 
    if (audioFile.path && fs.existsSync(audioFile.path)) {
      fs.unlinkSync(audioFile.path);
    }

    res.status(201).json({
      message: 'Episode uploaded and transcribed successfully',
      episode_id: episode.id,
      audio_url: episode.audio_url,
      duration: episode.duration,
      script: episode.script,
      transcript_json: episode.transcript_json,
    });
  } catch (err) {
    console.error('fullUploadEpisode error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
