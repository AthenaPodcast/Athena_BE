const youtubedl = require('youtube-dl-exec');
const ExternalEpisodeModel = require('../models/externalEpisode.model');
const { uploadAudioFromYoutube } = require('../utils/cloudinaryUpload');
const pool = require('../../db');

exports.createExternalEpisode = async (req, res) => {
  try {
    const podcastId = req.params.podcastId;
    const {
      name,
      description,
      language,
      release_date,
      picture_url,
      audio_url, 
      speakers,
    } = req.body;

    let youtube_url = req.body.youtube_url;
    let finalName = name;
    let finalDescription = description;
    let finalAudioUrl = audio_url;
    let finalDuration = null;

    // extract metadata if youtube_url is provided
    if (youtube_url) {
      try {
        const info = await youtubedl(youtube_url, {
          dumpSingleJson: true,
          noWarnings: true,
          preferFreeFormats: true,
          addHeader: [
            'referer:youtube.com',
            'user-agent:googlebot'
          ]
        });

        finalName = finalName || info.title;
        finalDescription = finalDescription || info.description;
        finalDuration = parseInt(info.duration);

        // extract and upload audio
        finalAudioUrl = await uploadAudioFromYoutube(youtube_url);
      } catch (err) {
        console.error('YouTube metadata extraction failed:', err);
        return res.status(400).json({ error: 'Invalid or unsupported YouTube link' });
      }
    }

    const { rows } = await pool.query(
      `INSERT INTO episodes (
        podcast_id, name, description, picture_url,
        audio_url, youtube_url, duration, language, release_date, created_at, updated_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
      RETURNING *`,
      [
        podcastId,
        finalName,
        finalDescription,
        picture_url,
        finalAudioUrl,
        youtube_url,
        finalDuration,
        language,
        release_date,
      ]
    );

    const episode = rows[0];

    // speakers if provided
    if (Array.isArray(speakers)) {
      for (const speakerName of speakers) {
        const { rows: sRows } = await pool.query(
          `INSERT INTO speakers (name)
           VALUES ($1)
           ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
           RETURNING id`,
          [speakerName]
        );

        const speakerId = sRows[0].id;

        await pool.query(
          `INSERT INTO episode_speakers (episode_id, speaker_id)
           VALUES ($1, $2)`,
          [episode.id, speakerId]
        );
      }
    }

    res.status(201).json({ message: 'Episode created successfully', episode });
  } catch (err) {
    console.error('Error creating YouTube episode:', err);
    res.status(500).json({ error: 'Failed to create episode' });
  }
};

exports.getEpisodesByPodcast = async (req, res) => {
  try {
    const podcastId = req.params.podcastId;
    const episodes = await ExternalEpisodeModel.getByPodcastId(podcastId);
    res.status(200).json({ episodes });
  } catch (err) {
    console.error('Error fetching episodes:', err);
    res.status(500).json({ error: 'Failed to fetch episodes' });
  }
};

exports.getExternalEpisodeById = async (req, res) => {
  try {
    const id = req.params.id;
    const episode = await ExternalEpisodeModel.getById(id);

    if (!episode) {
      return res.status(404).json({ error: 'Episode not found' });
    }

    res.status(200).json({ episode });
  } catch (err) {
    console.error('Error fetching episode:', err);
    res.status(500).json({ error: 'Failed to fetch episode' });
  }
};

exports.deleteExternalEpisode = async (req, res) => {
  try {
    const id = req.params.id;
    const deleted = await ExternalEpisodeModel.deleteById(id);

    if (!deleted) {
      return res.status(404).json({ error: 'Episode not found' });
    }

    res.status(200).json({ message: 'Episode deleted successfully' });
  } catch (err) {
    console.error('Error deleting episode:', err);
    res.status(500).json({ error: 'Failed to delete episode' });
  }
};
