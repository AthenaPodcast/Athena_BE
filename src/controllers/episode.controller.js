const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');
const { createEpisode } = require('../models/episode.model');
const { getEpisodesByPodcastId } = require('../models/episode.model');

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
  try {
    const {
      podcast_id,
      name,
      description,
      picture_url,
      audio_url,
      duration,
      script,
      release_date
    } = req.body;

    // Basic validation
    if (!podcast_id || !name || !audio_url || !duration) {
      return res.status(400).json({ message: 'Missing required episode fields' });
    }

    // Insert into DB
    const episode = await createEpisode({
      podcast_id,
      name,
      description,
      picture_url,
      audio_url,
      duration,
      script,
      release_date
    });

    res.status(201).json({
      message: 'Episode created successfully',
      episode
    });
  } catch (error) {
    console.error('Create Episode Error:', error);
    res.status(500).json({ message: 'Failed to create episode' });
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

