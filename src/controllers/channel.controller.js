const pool = require('../../db');
const { transcribeAudioFromUrl } = require('../utils/transcribe');
const { streamUpload } = require('../utils/cloudinaryUpload');
const { createEpisode } = require('../models/episode.model');
const { sendNotification } = require('../utils/notification');
const axios = require('axios');
const tmp = require('tmp');
const path = require('path');
const FormData = require('form-data');

const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const ffprobeInstaller = require('@ffprobe-installer/ffprobe');
const fs = require('fs');

ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);

const { 
  getPodcastEpisodes, 
  getEpisode, 
  updateEpisodeById, 
  deleteEpisodeById, 
  getPodcastsByChannel, 
  getPodcast, 
  insertPodcast, 
  updatePodcastById, 
  deletePodcastById, 
  getChannelProfileByAccountId, 
  updateChannelProfileByAccountId,
  getChannelsByCategories,
  getChannelInfoById,
  getPaginatedPodcastsUnderChannel,
  getPublicPodcast,
  getPublicPodcastEpisodesPaginated   
} = require('../models/channel.model');


exports.createPodcast = async (req, res) => {
  const accountId = req.user.accountId;
  let { name, description, category_ids } = req.body;

  if (typeof category_ids === 'string') {
    try {
      category_ids = JSON.parse(category_ids);
    } catch {
      category_ids = [];
    }
  }
  const picture_url = req.file?.filename || null;

  try {
    const result = await insertPodcast(accountId, name, description, picture_url, category_ids);
    res.status(201).json(result);
  } catch (err) {
    console.error('Create podcast error:', err);
    res.status(500).json({ message: 'Failed to create podcast' });
  }
};

exports.getAllRegularChannels = async (req, res) => {
  const categoryQuery = req.query.categories;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 6;

  try {
    let data;

    if (categoryQuery) {
      const categoryIds = categoryQuery
        .split(',')
        .map(id => parseInt(id.trim()))
        .filter(id => !isNaN(id));

      if (categoryIds.length > 0) {
        data = await getChannelsByCategories(false, categoryIds, page, limit);
      }
    }

    if (!data) {
      const result = await pool.query(
        `SELECT * FROM channelprofile WHERE created_by_admin = false LIMIT $1 OFFSET $2`,
        [limit, (page - 1) * limit]
      );
      const count = await pool.query(
        `SELECT COUNT(*) FROM channelprofile WHERE created_by_admin = false`
      );
      data = {
        channels: result.rows,
        total_count: parseInt(count.rows[0].count),
        total_pages: Math.ceil(count.rows[0].count / limit)
      };
    }

    res.status(200).json({
      page,
      limit,
      total_pages: data.total_pages,
      total_count: data.total_count,
      channels: data.channels
    });
  } catch (err) {
    console.error('Error fetching regular channels:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getChannelById = async (req, res) => {
  const channelId = parseInt(req.params.id);
  if (isNaN(channelId)) {
    return res.status(400).json({ message: 'Invalid channel ID' });
  }

  try {
    const channel = await getChannelInfoById(channelId);
    if (!channel) {
      return res.status(404).json({ message: 'Channel not found' });
    }

    res.status(200).json(channel);
  } catch (err) {
    console.error('Error fetching channel by ID:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getPodcastsByChannelId = async (req, res) => {
  const channelId = parseInt(req.params.id);
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 6;

  if (isNaN(channelId)) {
    return res.status(400).json({ message: 'Invalid channel ID' });
  }

  try {
    const result = await getPaginatedPodcastsUnderChannel(channelId, page, limit);
    res.status(200).json(result);
  } catch (err) {
    console.error('Error fetching paginated podcasts:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getPublicPodcastById = async (req, res) => {
  try {
    const podcast = await getPublicPodcast(req.params.id, req.user.accountId);
    if (!podcast) return res.status(403).json({ message: 'Not found or unauthorized' });
    res.json(podcast);
  } catch (err) {
    console.error('Get podcast error:', err);
    res.status(500).json({ message: 'Failed to fetch podcast' });
  }
};

exports.getPublicPodcastEpisodes = async (req, res) => {
  const podcastId = parseInt(req.params.id);
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 6;

  if (isNaN(podcastId)) {
    return res.status(400).json({ message: 'Invalid podcast ID' });
  }

  try {
    const result = await getPublicPodcastEpisodesPaginated(podcastId, page, limit);
    res.status(200).json(result);
  } catch (err) {
    console.error('Error fetching podcast episodes:', err);
    res.status(500).json({ message: 'Server error fetching episodes' });
  }
};

exports.toggleSavePodcast = async (req, res) => {
  const podcastId = parseInt(req.params.id);
  const accountId = req.user.accountId;

  try {
    const check = await pool.query(
      `SELECT saved FROM podcast_saves WHERE account_id = $1 AND podcast_id = $2`,
      [accountId, podcastId]
    );

    if (check.rows.length > 0) {
      const newStatus = !check.rows[0].saved;
      await pool.query(
        `UPDATE podcast_saves SET saved = $1 WHERE account_id = $2 AND podcast_id = $3`,
        [newStatus, accountId, podcastId]
      );
      return res.json({ is_saved: newStatus });
    }

    await pool.query(
      `INSERT INTO podcast_saves (account_id, podcast_id, saved) VALUES ($1, $2, true)`,
      [accountId, podcastId]
    );
    res.json({ is_saved: true });

  } catch (err) {
    console.error('Toggle save failed:', err);
    res.status(500).json({ message: 'Failed to toggle podcast save' });
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
    const podcastId = parseInt(req.params.id);
    const accountId = req.user.accountId;

    let { name, description, category_ids } = req.body;

    if (typeof category_ids === 'string') {
      try {
        category_ids = JSON.parse(category_ids);
      } catch {
        category_ids = [];
      }
    }
    const picture_url = req.file?.filename || null;

    const updated = await updatePodcastById(podcastId, accountId, {
      name,
      description,
      picture_url,
      category_ids
    });

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

exports.fullUploadEpisode = async (req, res) => {
  try {
    let { name, description, release_date, speakers, language } = req.body;
    const { id: podcast_id } = req.params;

    const imageFile = req.files?.image?.[0];
    const audioFile = req.files?.audio?.[0];

    let picture_url = null;
    if (imageFile) {
      const ext = path.extname(imageFile.originalname);
      const filename = `profile_${Date.now()}${ext}`;
      const filePath = path.join('uploads', filename);
      fs.writeFileSync(filePath, imageFile.buffer);
      picture_url = filename;
    }

    if (!audioFile || !audioFile.buffer) {
      return res.status(400).json({ error: 'Audio file is required' });
    }

    // const audioUrl = (await streamUpload(audioFile.buffer, 'episods')).secure_url;

    if (req.user.type !== 'channel') {
      return res.status(403).json({ error: 'Only channel accounts can upload episodes' });
    }

    if (!audioFile) {
      return res.status(400).json({ error: 'Audio file is required' });
    }

    const audioTempUpload = await streamUpload(audioFile.buffer, 'episods/temp'); 
    const audioUrl = audioTempUpload.secure_url;

    const tmpFile = tmp.fileSync({ postfix: '.mp3' });
    const tempPath = tmpFile.name;

    const writer = fs.createWriteStream(tempPath);
    const response = await axios({ method: 'GET', url: audioUrl, responseType: 'stream' });
    response.data.pipe(writer);
    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
    
    
    if (typeof speakers === 'string') {
      speakers = speakers.split(',').map(name => name.trim()).filter(name => name.length > 0);
    }
    if (!Array.isArray(speakers)) {
      speakers = [];
    }

    // extract duration of audio with FFmpeg
    const duration = await new Promise((resolve, reject) => {
      ffmpeg.ffprobe(audioUrl, (err, metadata) => {
        if (err) return reject(err);
        resolve(Math.floor(metadata.format.duration));
      });
    });

    // transcribe audio
    const { script, transcript_json: transcriptJson, language: detectedLanguage } = await transcribeAudioFromUrl(audioUrl);
    
    if (!language) {
      language = detectedLanguage || 'unknown';
    }

    if (!description || description.trim() === '') {
      const shortDescription = script.split(' ').slice(0, 30).join(' ') + '...';
      description = shortDescription;
    }

    if (Array.isArray(transcriptJson)) {
      console.log("transcriptJson PREVIEW:", transcriptJson.slice(0, 3));
    } else {
      console.error(" transcriptJson is not an array:", transcriptJson);
    }
    
    if (!Array.isArray(transcriptJson)) {
      console.error("transcriptJson is not an array:", transcriptJson);
      return res.status(500).json({ error: "Transcript JSON is invalid" });
    }
    console.log("Final transcriptJson count:", transcriptJson.length);

    if (Array.isArray(transcriptJson)) {
      console.log("is array?", Array.isArray(transcriptJson));
    } else {
      console.error("transcriptJson is not an array:", transcriptJson);
    }

    console.log('Saving episode with:', {
      scriptLength: script.length,
      wordCount: transcriptJson.length,
      firstWord: transcriptJson[0],
    });
    
    // save episode to DB
    console.log("Final transcriptJson count:", transcriptJson.length);
    console.log("transcriptJson preview before insert:", transcriptJson.slice(0, 2));
    console.log("type:", typeof transcriptJson);
    console.log("isArray:", Array.isArray(transcriptJson));
    
    const episode = await createEpisode({
      podcast_id,
      name,
      description,
      picture_url,
      audio_url: '',
      duration,
      script,
      transcript_json: transcriptJson,
      release_date,
      language
    });
    
    
    const finalUpload = await streamUpload(audioFile.buffer, `episods/${episode.id}`);
    const finalAudioUrl = finalUpload.secure_url;

    await pool.query(`UPDATE episodes SET audio_url = $1 WHERE id = $2`, [finalAudioUrl, episode.id]);

    const formData = new FormData();
    formData.append('audio', fs.createReadStream(tempPath));

    await axios.post('http://127.0.0.1:8000/fingerprint', formData, {
      headers: formData.getHeaders(),
      params: { song_name: `episods/${episode.id}` },
    });

    // cleanup
    tmpFile.removeCallback();

    // fetch podcast name for message
    const podcastRes = await pool.query(`SELECT name FROM podcasts WHERE id = $1`, [podcast_id]);
    const podcastName = podcastRes.rows[0]?.name || 'a podcast';

    // fetch all users
    const userRes = await pool.query(`SELECT id FROM accounts WHERE account_type = 'regular'`);
    const users = userRes.rows;

    // send notification to each user
    for (const user of users) {
      await sendNotification(
        user.id,
        'New Episode Released',
        `A new episode "${name}" was released under podcast "${podcastName}".`,
        'episode'
      );
    }

    // add speakers
    for (let speakerName of speakers) {
      speakerName = speakerName.trim();

      const speakerRes = await pool.query(
        `SELECT id FROM speakers WHERE name = $1`,
        [speakerName]
      );

      let speakerId;
      if (speakerRes.rows.length > 0) {
        speakerId = speakerRes.rows[0].id;
      } else {
        const insertRes = await pool.query(
          `INSERT INTO speakers (name) VALUES ($1) RETURNING id`,
          [speakerName]
        );
        speakerId = insertRes.rows[0].id;
      }

      await pool.query(
        `INSERT INTO episode_speakers (episode_id, speaker_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [episode.id, speakerId]
      );
    }

    // clean up 
    if (audioFile.path && fs.existsSync(audioFile.path)) {
      fs.unlinkSync(audioFile.path);
    }

    res.status(201).json({
      message: 'Episode uploaded and transcribed successfully',
      episode_id: episode.id,
      picture_url,
      audio_url: finalAudioUrl,
      duration: episode.duration,
      script: episode.script,
      transcript_json: episode.transcript_json,
      language,
      description,
      speakers
    });
  } catch (err) {
    console.error('fullUploadEpisode error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
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
