const pool = require('../../db');
const { streamUpload } = require('../utils/cloudinaryUpload');
const { transcribeAudioFromUrl } = require('../utils/transcribe');
const ffmpeg = require('fluent-ffmpeg');
const { getPodcastEpisodes, getEpisode, updateEpisodeById, deleteEpisodeById, getPodcastsByChannel, getPodcast, insertPodcast, updatePodcastById, deletePodcastById, getChannelProfileByAccountId, updateChannelProfileByAccountId } = require('../models/channel.model');
const { createEpisode } = require('../models/episode.model');
const fs = require('fs');

exports.createPodcast = async (req, res) => {
  const accountId = req.user.accountId;
  const { name, description, picture_url, category_ids } = req.body;

  try {
    const result = await insertPodcast(accountId, name, description, picture_url, category_ids);
    res.status(201).json(result);
  } catch (err) {
    console.error('Create podcast error:', err);
    res.status(500).json({ message: 'Failed to create podcast' });
  }
};

exports.getMyPodcasts = async (req, res) => {
  try {
    const podcasts = await getPodcastsByChannel(req.user.accountId);
    res.json(podcasts);
  } catch (err) {
    console.error('Get podcasts error:', err);
    res.status(500).json({ message: 'Failed to fetch podcasts' });
  }
};

exports.getPodcastById = async (req, res) => {
  try {
    const podcast = await getPodcast(req.params.id, req.user.accountId);
    if (!podcast) return res.status(403).json({ message: 'Not found or unauthorized' });
    res.json(podcast);
  } catch (err) {
    console.error('Get podcast error:', err);
    res.status(500).json({ message: 'Failed to fetch podcast' });
  }
};

exports.updatePodcast = async (req, res) => {
  try {
    const updated = await updatePodcastById(req.params.id, req.user.accountId, req.body);
    if (!updated) return res.status(403).json({ message: 'Not found or unauthorized' });
    res.json({ message: 'Updated successfully' });
  } catch (err) {
    console.error('Update podcast error:', err);
    res.status(500).json({ message: 'Failed to update podcast' });
  }
};

exports.deletePodcast = async (req, res) => {
  try {
    const deleted = await deletePodcastById(req.params.id, req.user.accountId);
    if (!deleted) return res.status(403).json({ message: 'Not found or unauthorized' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    console.error('Delete podcast error:', err);
    res.status(500).json({ message: 'Failed to delete podcast' });
  }
};

exports.getEpisodesByPodcast = async (req, res) => {
  try {
    const episodes = await getPodcastEpisodes(req.params.podcastId, req.user.accountId);
    res.json(episodes);
  } catch (err) {
    console.error('Fetch episodes error:', err);
    res.status(500).json({ message: 'Failed to fetch episodes' });
  }
};

// exports.fullUploadEpisodeChannel = async (req, res) => {
//   try {
//     let { name, description, release_date, picture_url, speakers } = req.body;
//     const audioFile = req.file;
//     const podcast_id = req.params.podcastId;

//     if (!audioFile) return res.status(400).json({ error: 'Audio file is required' });

//     if (typeof speakers === 'string') {
//       speakers = speakers.split(',').map(s => s.trim());
//     }
//     if (!Array.isArray(speakers)) speakers = [];

//     const audioResult = await streamUpload(audioFile.buffer, 'episods');
//     const audioUrl = audioResult.secure_url;

//     const duration = await new Promise((resolve, reject) => {
//       ffmpeg.ffprobe(audioUrl, (err, metadata) => {
//         if (err) return reject(err);
//         resolve(Math.floor(metadata.format.duration));
//       });
//     });

//     const { script, transcriptjson } = await transcribeAudioFromUrl(audioUrl);


//     const episode = await createEpisode({
//       podcast_id,
//       name,
//       description,
//       picture_url,
//       audio_url: audioUrl,
//       duration,
//       script,
//       transcript_json: transcriptjson,
//       release_date
//     });

//     res.status(201).json({ message: 'Episode uploaded', episode });
//   } catch (err) {
//     console.error('Upload episode error:', err);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// };

exports.fullUploadEpisodeChannel = async (req, res) => {
  try {
    let { name, description, release_date, picture_url, speakers, language } = req.body;
    const audioFile = req.file;
    const podcast_id = req.params.podcastId;

    if (!audioFile) return res.status(400).json({ error: 'Audio file is required' });

    // Normalize speakers input
    if (typeof speakers === 'string') {
      speakers = speakers.split(',').map(s => s.trim()).filter(s => s);
    }
    if (!Array.isArray(speakers)) speakers = [];

    // Upload to Cloudinary
    const audioResult = await streamUpload(audioFile.buffer, 'episods');
    const audioUrl = audioResult.secure_url;

    // Extract duration
    const duration = await new Promise((resolve, reject) => {
      ffmpeg.ffprobe(audioUrl, (err, metadata) => {
        if (err) return reject(err);
        resolve(Math.floor(metadata.format.duration));
      });
    });

    // Transcribe
    const { script, transcriptJson } = await transcribeAudioFromUrl(audioUrl);

    // Insert episode
    const episode = await createEpisode({
      podcast_id,
      name,
      description,
      picture_url,
      audio_url: audioUrl,
      duration,
      script,
      transcript_json: transcriptJson,
      release_date,
      language,
    });

    // Save speakers
    for (let speakerName of speakers) {
      const speakerRes = await pool.query(
        `INSERT INTO speakers (name)
         VALUES ($1)
         ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [speakerName]
      );

      const speakerId = speakerRes.rows[0].id;

      await pool.query(
        `INSERT INTO episode_speakers (episode_id, speaker_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [episode.id, speakerId]
      );
    }

    // Return response
    res.status(201).json({
      message: 'Episode uploaded and transcribed successfully',
      episode,
    });

  } catch (err) {
    console.error('Upload episode error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

exports.getEpisodeById = async (req, res) => {
  try {
    const episode = await getEpisode(req.params.id, req.user.accountId);
    if (!episode) return res.status(403).json({ message: 'Not found or unauthorized' });
    res.json(episode);
  } catch (err) {
    console.error('Get episode error:', err);
    res.status(500).json({ message: 'Failed to fetch episode' });
  }
};

exports.updateEpisode = async (req, res) => {
  try {
    const result = await updateEpisodeById(req.params.id, req.user.accountId, req.body);
    if (!result) return res.status(403).json({ message: 'Not found or unauthorized' });
    res.json({ message: 'Episode updated' });
  } catch (err) {
    console.error('Update episode error:', err);
    res.status(500).json({ message: 'Failed to update episode' });
  }
};

exports.deleteEpisode = async (req, res) => {
  try {
    const result = await deleteEpisodeById(req.params.id, req.user.accountId);
    if (!result) return res.status(403).json({ message: 'Not found or unauthorized' });
    res.json({ message: 'Episode deleted' });
  } catch (err) {
    console.error('Delete episode error:', err);
    res.status(500).json({ message: 'Failed to delete episode' });
  }
};

exports.getChannelProfile = async (req, res) => {
  try {
    const profile = await getChannelProfileByAccountId(req.user.accountId);
    res.json(profile);
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
};

exports.updateChannelProfile = async (req, res) => {
  try {
    await updateChannelProfileByAccountId(req.user.accountId, req.body);
    res.json({ message: 'Profile updated' });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ message: 'Failed to update profile' });
  }
};
