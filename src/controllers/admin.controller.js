const pool = require('../../db');

const {
  getPendingRequests,
  updateRequestStatus,
  updateAccountToChannel,
  getAllRequestsGrouped 
} = require('../models/channelRequest.model');

const getChannelRequests = async (req, res) => {
  const requests = await getPendingRequests();
  res.json(requests);
};

const approveRequest = async (req, res) => {
  const { id } = req.params;
  const request = await updateRequestStatus(id, 'approved');
  if (request) {
    await updateAccountToChannel(request.account_id);

    await pool.query(
      `INSERT INTO channelprofile (account_id, channel_name, channel_description, channel_picture)
       VALUES ($1, $2, $3, $4)`,
      [request.account_id, request.channel_name, request.channel_description, request.channel_picture]
    );

    return res.json({ message: 'Channel approved and profile created' });
  }

  res.status(404).json({ message: 'Request not found' });
};

const rejectRequest = async (req, res) => {
  const { id } = req.params;
  const request = await updateRequestStatus(id, 'rejected');
  if (request) return res.json({ message: 'Request rejected' });
  res.status(404).json({ message: 'Request not found' });
};

const getAllChannelRequests = async (req, res) => {
  const result = await getAllRequestsGrouped();
  res.json(result);
};

const getAllUsers = async (req, res) => {
  const result = await pool.query(
    `SELECT 
       a.id,
       a.email,
       a.phone,
       CONCAT(u.first_name, ' ', u.last_name) AS full_name,
       u.gender,
       u.age
     FROM accounts a
     LEFT JOIN userprofile u ON a.id = u.account_id
     WHERE a.account_type = 'regular'
     ORDER BY a.created_at DESC`
  );
  res.json(result.rows);
};

const getAllChannels = async (req, res) => {
  const result = await pool.query(
    `SELECT 
       a.id,
       a.email,
       c.channel_name,
       c.channel_description,
       COUNT(p.id) AS podcast_count
     FROM accounts a
     JOIN channelprofile c ON a.id = c.account_id
     LEFT JOIN podcasts p ON p.channel_account_id = a.id
     WHERE a.account_type = 'channel'
     GROUP BY a.id, c.channel_name, c.channel_description
     ORDER BY a.created_at DESC`
  );
  res.json(result.rows);
};

const getAllPodcasts = async (req, res) => {
  const result = await pool.query(
    `SELECT 
       p.id,
       c.channel_name,
       p.name AS podcast_name,
       p.description,
       p.language,
       cat.name AS category_name,
       COUNT(e.id) AS episode_count
     FROM podcasts p
     JOIN accounts a ON p.channel_account_id = a.id
     JOIN channelprofile c ON c.account_id = a.id
     LEFT JOIN podcastcategory pc ON p.id = pc.podcast_id
     LEFT JOIN categories cat ON pc.category_id = cat.id
     LEFT JOIN episodes e ON e.podcast_id = p.id
     GROUP BY p.id, c.channel_name, cat.name
     ORDER BY c.channel_name, p.name`
  );

  const grouped = {};
  result.rows.forEach(row => {
    const channel = row.channel_name;
    if (!grouped[channel]) grouped[channel] = [];

    grouped[channel].push({
      podcast_name: row.podcast_name,
      description: row.description,
      language: row.language,
      category_name: row.category_name,
      episode_count: row.episode_count
    });
  });

  res.json(grouped);
};

const getAllEpisodes = async (req, res) => {
  const result = await pool.query(
    `SELECT 
       e.id,
       e.name AS episode_name,
       e.description,
       e.duration,
       p.name AS podcast_name,
       cp.channel_name
     FROM episodes e
     LEFT JOIN podcasts p ON e.podcast_id = p.id
     LEFT JOIN accounts a ON p.channel_account_id = a.id
     LEFT JOIN channelprofile cp ON cp.account_id = a.id
     ORDER BY cp.channel_name, p.name, e.name`
  );

  const grouped = {};
  result.rows.forEach(row => {
    const groupKey = `${row.channel_name} - ${row.podcast_name}`;
    if (!grouped[groupKey]) grouped[groupKey] = [];

    grouped[groupKey].push({
      episode_name: row.episode_name,
      description: row.description,
      duration: row.duration
    });
  });

  res.json(grouped);
};

const getUserDetails = async (req, res) => {
  const userId = req.params.id;

  try {
    // basic user's info
    const basicInfoResult = await pool.query(
      `SELECT a.email, a.phone, u.first_name, u.last_name, u.gender, u.age, u.profile_picture
       FROM accounts a
       JOIN userprofile u ON a.id = u.account_id
       WHERE a.id = $1`,
      [userId]
    );

    if (basicInfoResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const basicInfo = basicInfoResult.rows[0];
    const fullName = `${basicInfo.first_name} ${basicInfo.last_name}`;

    // saved podcasts
    const savedResult = await pool.query(
      `SELECT p.name FROM podcast_saves ps
       JOIN podcasts p ON ps.podcast_id = p.id
       WHERE ps.account_id = $1 AND ps.saved = true`,
      [userId]
    );
    const savedPodcasts = savedResult.rows.map(r => r.name);

    // liked episodes
    const likedResult = await pool.query(
      `SELECT e.name FROM episode_likes el
       JOIN episodes e ON el.episode_id = e.id
       WHERE el.account_id = $1 AND el.liked = true`,
      [userId]
    );
    const likedEpisodes = likedResult.rows.map(r => r.name);

    // reviews
    const reviewResult = await pool.query(
      `SELECT r.comment_text, r.rating, r.created_at, e.name AS episode_name
       FROM reviews r
       JOIN episodes e ON r.episode_id = e.id
       WHERE r.account_id = $1`,
      [userId]
    );

    // listening time + category percentage breakdown
    const playedResult = await pool.query(
      `SELECT r.progress, e.duration, pc.category_id, cat.name AS category_name
       FROM recentlyplayed r
       JOIN episodes e ON r.episode_id = e.id
       JOIN podcasts p ON e.podcast_id = p.id
       JOIN podcastcategory pc ON pc.podcast_id = p.id
       JOIN categories cat ON pc.category_id = cat.id
       WHERE r.account_id = $1`,
      [userId]
    );

    let totalSeconds = 0;
    const categoryDurations = {}; // { categoryName: seconds }

    playedResult.rows.forEach(row => {
      const time = Math.min(row.progress, row.duration || row.progress || 0);
      totalSeconds += time;

      // divide by category count later
      const key = row.category_name;
      if (!categoryDurations[key]) categoryDurations[key] = 0;
      categoryDurations[key] += time;
    });

    const totalMinutes = Math.floor(totalSeconds / 60);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const listening_time = `${hours}h ${minutes}m`;

    // category percentages
    const category_breakdown = {};
    Object.entries(categoryDurations).forEach(([cat, sec]) => {
      const percent = ((sec / totalSeconds) * 100).toFixed(1);
      category_breakdown[cat] = `${percent}%`;
    });

    // final response
    return res.json({
      basic_info: {
        email: basicInfo.email,
        phone: basicInfo.phone,
        name: fullName,
        gender: basicInfo.gender,
        age: basicInfo.age,
        profile_picture: basicInfo.profile_picture
      },
      saved_podcasts: {
        count: savedPodcasts.length,
        list: savedPodcasts
      },
      liked_episodes: {
        count: likedEpisodes.length,
        list: likedEpisodes
      },
      reviews: reviewResult.rows,
      listening_time,
      category_breakdown
    });

  } catch (err) {
    console.error('Error in getUserDetails:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getChannelDetails = async (req, res) => {
  const accountId = req.params.id;

  try {
    // basic channel info
    const channelRes = await pool.query(
      `SELECT c.channel_name, c.channel_description, c.channel_picture, a.created_at
       FROM channelprofile c
       JOIN accounts a ON a.id = c.account_id
       WHERE c.account_id = $1 AND a.account_type = 'channel'`,
      [accountId]
    );

    if (channelRes.rows.length === 0) {
      return res.status(404).json({ message: 'Channel not found or not a channel account' });
    }

    const channel = channelRes.rows[0];

    // podcasts + languages + episode count
    const podcastsRes = await pool.query(
      `SELECT p.id, p.name, p.language
       FROM podcasts p
       WHERE p.channel_account_id = $1`,
      [accountId]
    );

    const podcasts = podcastsRes.rows;
    const podcastNames = podcasts.map(p => p.name);
    const languages = [...new Set(podcasts.map(p => p.language))];
    const podcastIds = podcasts.map(p => p.id);

    // episode count
    let episodeCount = 0;
    if (podcastIds.length > 0) {
      const episodeRes = await pool.query(
        `SELECT COUNT(*) FROM episodes WHERE podcast_id = ANY($1)`,
        [podcastIds]
      );
      episodeCount = parseInt(episodeRes.rows[0].count);
    }

    // final response
    return res.json({
      channel_name: channel.channel_name,
      channel_picture: channel.channel_picture,
      description: channel.channel_description,
      podcast_count: podcasts.length,
      podcasts: podcastNames,
      episode_count: episodeCount,
      languages,
      joined_at: channel.created_at
    });

  } catch (err) {
    console.error('Error in getChannelDetails:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getPodcastDetails = async (req, res) => {
  const podcastId = req.params.id;

  try {
    // basic podcast info + channel name
    const podcastRes = await pool.query(
      `SELECT p.name AS podcast_name, p.description, p.language, p.picture_url,
              cp.channel_name
       FROM podcasts p
       JOIN accounts a ON p.channel_account_id = a.id
       JOIN channelprofile cp ON cp.account_id = a.id
       WHERE p.id = $1`,
      [podcastId]
    );

    if (podcastRes.rows.length === 0) {
      return res.status(404).json({ message: 'Podcast not found' });
    }

    const podcast = podcastRes.rows[0];

    // get categories
    const categoryRes = await pool.query(
      `SELECT c.name FROM podcastcategory pc
       JOIN categories c ON pc.category_id = c.id
       WHERE pc.podcast_id = $1`,
      [podcastId]
    );
    const categories = categoryRes.rows.map(r => r.name);

    // get episodes
    const episodeRes = await pool.query(
      `SELECT name FROM episodes
       WHERE podcast_id = $1
       ORDER BY created_at ASC`,
      [podcastId]
    );
    const episodes = episodeRes.rows.map(r => r.name);

    // get saved count
    const saveRes = await pool.query(
      `SELECT COUNT(*) FROM podcast_saves
       WHERE podcast_id = $1 AND saved = true`,
      [podcastId]
    );
    const saved_count = parseInt(saveRes.rows[0].count);

    // final response
    return res.json({
      podcast_name: podcast.podcast_name,
      channel_name: podcast.channel_name,
      description: podcast.description,
      language: podcast.language,
      picture_url: podcast.picture_url,
      categories,
      episode_count: episodes.length,
      episodes,
      saved_count
    });

  } catch (err) {
    console.error('Error in getPodcastDetails:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getEpisodeDetails = async (req, res) => {
  const episodeId = req.params.id;

  try {
    // basic episode info with podcast + channel name
    const episodeRes = await pool.query(
      `SELECT e.name AS episode_name, e.description, e.duration, e.picture_url,
              p.name AS podcast_name, cp.channel_name
       FROM episodes e
       LEFT JOIN podcasts p ON e.podcast_id = p.id
       LEFT JOIN accounts a ON p.channel_account_id = a.id
       LEFT JOIN channelprofile cp ON cp.account_id = a.id
       WHERE e.id = $1`,
      [episodeId]
    );

    if (episodeRes.rows.length === 0) {
      return res.status(404).json({ message: 'Episode not found' });
    }

    const episode = episodeRes.rows[0];

    // like count
    const likeRes = await pool.query(
      `SELECT COUNT(*) FROM episode_likes
       WHERE episode_id = $1 AND liked = true`,
      [episodeId]
    );
    const like_count = parseInt(likeRes.rows[0].count);

    // reviews + reviewer name
    const reviewRes = await pool.query(
      `SELECT r.rating, r.comment_text, r.created_at,
              CONCAT(u.first_name, ' ', u.last_name) AS user_name
       FROM reviews r
       JOIN accounts a ON r.account_id = a.id
       JOIN userprofile u ON a.id = u.account_id
       WHERE r.episode_id = $1
       ORDER BY r.created_at DESC`,
      [episodeId]
    );

    const reviews = reviewRes.rows.map(r => ({
      user_name: r.user_name,
      rating: r.rating,
      comment: r.comment_text,
      created_at: r.created_at
    }));

    // format duration (seconds → h:m:s)
    const durationSec = episode.duration || 0;
    const hours = String(Math.floor(durationSec / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((durationSec % 3600) / 60)).padStart(2, '0');
    const seconds = String(durationSec % 60).padStart(2, '0');
    const durationFormatted = `${hours}:${minutes}:${seconds}`;

    // final response
    return res.json({
      episode_name: episode.episode_name,
      podcast_name: episode.podcast_name,
      channel_name: episode.channel_name,
      description: episode.description,
      duration: durationFormatted,
      picture_url: episode.picture_url,
      like_count,
      reviews
    });

  } catch (err) {
    console.error('Error in getEpisodeDetails:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const deleteUser = async (req, res) => {
  const userId = req.params.id;

  try {

    const existsRes = await pool.query(
      `SELECT id FROM accounts WHERE id = $1 AND account_type = 'regular'`,
      [userId]
    );

    if (existsRes.rows.length === 0) {
      return res.status(404).json({ message: 'User not found or not a regular account' });
    }
    
    // delete from episode_likes, podcast_saves, reviews, recentlyplayed, moodtracker, notifications, userinterests, userprofile
    await pool.query(`DELETE FROM episode_likes WHERE account_id = $1`, [userId]);
    await pool.query(`DELETE FROM podcast_saves WHERE account_id = $1`, [userId]);
    await pool.query(`DELETE FROM reviews WHERE account_id = $1`, [userId]);
    await pool.query(`DELETE FROM recentlyplayed WHERE account_id = $1`, [userId]);
    await pool.query(`DELETE FROM moodtracker WHERE account_id = $1`, [userId]);
    await pool.query(`DELETE FROM notifications WHERE account_id = $1`, [userId]);
    await pool.query(`DELETE FROM userinterests WHERE account_id = $1`, [userId]);
    await pool.query(`DELETE FROM userprofile WHERE account_id = $1`, [userId]);

    // finally delete the user account
    await pool.query(`DELETE FROM accounts WHERE id = $1`, [userId]);

    res.json({ message: 'User account deleted successfully' });

  } catch (err) {
    console.error('Error in deleteUser:', err);
    res.status(500).json({ message: 'Failed to delete user', error: err.message });
  }
};


module.exports = {
  getChannelRequests,
  approveRequest,
  rejectRequest,
  getAllChannelRequests,
  getAllUsers,
  getAllChannels,
  getAllPodcasts,
  getAllEpisodes,
  getUserDetails,
  getChannelDetails,
  getPodcastDetails,
  getEpisodeDetails,
  deleteUser
};
