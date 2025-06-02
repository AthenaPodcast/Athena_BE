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
  try {
    const result = await pool.query(
      `SELECT 
        c.id AS channel_id,
        a.email,
        c.channel_name,
        c.channel_description,
        c.created_by_admin,
        COUNT(p.id) AS podcast_count
      FROM channelprofile c
      LEFT JOIN accounts a ON a.id = c.account_id
      LEFT JOIN podcasts p ON p.channel_id = c.id
      GROUP BY c.id, a.email, c.channel_name, c.channel_description, c.created_by_admin
      ORDER BY c.id DESC`
    );

    const channels = result.rows.map(row => ({
      channel_id: row.channel_id,
      email: row.email,
      channel_name: row.channel_name,
      channel_description: row.channel_description,
      podcast_count: parseInt(row.podcast_count),
      channel_type: row.created_by_admin ? 'external' : 'regular'
    }));
    
    res.json(channels);
  } catch(err){
    console.error('Error in getAllChannels:', err);
    res.status(500).json({ message: 'Failed to fetch channels', error: err.message });
  }
};

const getAllPodcasts = async (req, res) => {
  try{
    const result = await pool.query(
      `SELECT 
        p.id,
        c.channel_name,
        c.created_by_admin,
        p.name AS podcast_name,
        p.description,
        ARRAY_AGG(DISTINCT e.language) AS languages,
        cat.name AS category_name,
        COUNT(e.id) AS episode_count
      FROM podcasts p
      JOIN channelprofile c ON p.channel_id = c.id
      LEFT JOIN podcastcategory pc ON p.id = pc.podcast_id
      LEFT JOIN categories cat ON pc.category_id = cat.id
      LEFT JOIN episodes e ON e.podcast_id = p.id
      GROUP BY p.id, c.channel_name, c.created_by_admin, cat.name
      ORDER BY c.channel_name, p.name`
    );

    const grouped = {};
    result.rows.forEach(row => {
      const channelType = row.created_by_admin ? 'external' : 'regular';
      const groupKey = `${row.channel_name} - ${channelType}`;

      if (!grouped[groupKey]) grouped[groupKey] = [];

      grouped[groupKey].push({
        podcast_name: row.podcast_name,
        description: row.description,
        languages: row.languages.filter(Boolean),
        category_name: row.category_name,
        episode_count: parseInt(row.episode_count)
      });
    });

    res.json(grouped);
  } catch (err){
    console.error('Error in getAllPodcasts:', err);
    res.status(500).json({ message: 'Failed to fetch podcasts', error: err.message });
  }
};

const getAllEpisodes = async (req, res) => {
  const result = await pool.query(
    `SELECT 
       e.id,
       e.name AS episode_name,
       e.description,
       e.duration,
       e.language,
       p.name AS podcast_name,
       cp.channel_name,
       cp.created_by_admin
     FROM episodes e
     LEFT JOIN podcasts p ON e.podcast_id = p.id
     LEFT JOIN channelprofile cp ON cp.id = p.channel_id
     ORDER BY cp.channel_name, p.name, e.name`
  );

  const grouped = {};
  result.rows.forEach(row => {
    const channelType = row.created_by_admin ? 'external' : 'regular'; 
    const groupKey = `${row.channel_name} (${channelType}) - ${row.podcast_name}`; 
    if (!grouped[groupKey]) grouped[groupKey] = [];

    grouped[groupKey].push({
      episode_name: row.episode_name,
      description: row.description,
      duration: row.duration,
      language: row.language
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
  const channelId = req.params.id;

  try {
    // basic channel info
    const channelRes = await pool.query(
      `SELECT c.channel_name, c.channel_description, c.channel_picture, c.created_by_admin, a.created_at, c.account_id
       FROM channelprofile c
       LEFT JOIN accounts a ON a.id = c.account_id
       WHERE c.id = $1`,
      [channelId]
    );

    if (channelRes.rows.length === 0) {
      return res.status(404).json({ message: 'Channel not found' });
    }

    const channel = channelRes.rows[0];
    const isExternal = channel.created_by_admin === true;

    const podcastQuery = isExternal
      ? `SELECT p.id, p.name FROM podcasts p WHERE p.channel_id = $1`
      : `SELECT p.id, p.name FROM podcasts p WHERE p.channel_account_id = $1`;

    const podcastIdParam = isExternal ? channelId : channel.account_id;
    const podcastsRes = await pool.query(podcastQuery, [podcastIdParam]);
    const podcasts = podcastsRes.rows;
    const podcastNames = podcasts.map(p => p.name);
    const podcastIds = podcasts.map(p => p.id);

    let episodeCount = 0;
    
    if (podcastIds.length > 0) {
      const episodeCountRes = await pool.query(
        `SELECT COUNT(*) FROM episodes WHERE podcast_id = ANY($1)`,
        [podcastIds]
      );
      episodeCount = parseInt(episodeCountRes.rows[0].count);
    }

    let languages = [];
    if (podcastIds.length > 0) {
      const langRes = await pool.query(
        `SELECT DISTINCT language FROM episodes WHERE podcast_id = ANY($1)`,
        [podcastIds]
      );
      languages = langRes.rows.map(r => r.language).filter(Boolean);
    }  

    return res.json({
      channel_name: channel.channel_name,
      channel_picture: channel.channel_picture,
      description: channel.channel_description,
      channel_type: isExternal ? 'external' : 'regular',
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
      `SELECT p.name AS podcast_name, p.description, p.picture_url,
              cp.channel_name, cp.created_by_admin, cp.id AS channel_id
       FROM podcasts p
       JOIN channelprofile cp ON cp.id = p.channel_id
       WHERE p.id = $1`,
      [podcastId]
    );

    if (podcastRes.rows.length === 0) {
      return res.status(404).json({ message: 'Podcast not found' });
    }

    const podcast = podcastRes.rows[0];
    const isExternal = podcast.created_by_admin === true;
    const channelType = isExternal ? 'external' : 'regular';

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

    // get langs
    const langRes = await pool.query(
      `SELECT DISTINCT language FROM episodes
       WHERE podcast_id = $1 AND language IS NOT NULL`,
      [podcastId]
    );
    const languages = langRes.rows.map(r => r.language);

    // final response
    return res.json({
      podcast_name: podcast.podcast_name,
      channel_name: podcast.channel_name,
      channel_type: channelType,
      description: podcast.description,
      language: podcast.language,
      picture_url: podcast.picture_url,
      languages,
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
      `SELECT e.name AS episode_name, e.description, e.duration, e.picture_url, e.language,
              p.name AS podcast_name, cp.channel_name, cp.created_by_admin
       FROM episodes e
       LEFT JOIN podcasts p ON e.podcast_id = p.id
       LEFT JOIN channelprofile cp ON p.channel_id = cp.id
       WHERE e.id = $1`,
      [episodeId]
    );

    if (episodeRes.rows.length === 0) {
      return res.status(404).json({ message: 'Episode not found' });
    }

    const episode = episodeRes.rows[0];
    const channelType = episode.created_by_admin ? 'external' : 'regular';

    // speakers
    const speakerRes = await pool.query(
      `SELECT s.name
      FROM episode_speakers es
      JOIN speakers s ON es.speaker_id = s.id
      WHERE es.episode_id = $1`,
      [episodeId]
    );

    const speakers = speakerRes.rows.map(row => row.name);

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
    
    // avg rating
    const avgRes = await pool.query(
      `SELECT AVG(rating) AS avg FROM reviews WHERE episode_id = $1`,
      [episodeId]
    );
    const avg_rating = avgRes.rows[0].avg ? parseFloat(avgRes.rows[0].avg).toFixed(1) : null;


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
      channel_type: channelType,
      language: episode.language,
      speakers,
      description: episode.description,
      duration: durationFormatted,
      picture_url: episode.picture_url,
      like_count,
      avg_rating,
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
    await pool.query(`DELETE FROM ad_play_logs WHERE user_id = $1`, [userId]);
    await pool.query(`DELETE FROM userprofile WHERE account_id = $1`, [userId]);

    // finally delete the user account
    await pool.query(`DELETE FROM accounts WHERE id = $1`, [userId]);

    res.json({ message: 'User account deleted successfully' });

  } catch (err) {
    console.error('Error in deleteUser:', err);
    res.status(500).json({ message: 'Failed to delete user', error: err.message });
  }
};

const deleteChannel = async (req, res) => {
  const channelId = req.params.id;

  try {
    // confirm it's a channel account
    const channelRes = await pool.query(
      `SELECT account_id FROM channelprofile WHERE id = $1`,
      [channelId]
    );

    if (channelRes.rows.length === 0) {
      return res.status(404).json({ message: 'Channel not found' });
    }

    const accountId = channelRes.rows[0].account_id;

    // get podcast IDs created by this channel
    const podcastRes = await pool.query(
      `SELECT id FROM podcasts WHERE channel_id = $1`,
      [channelId]
    );
    const podcastIds = podcastRes.rows.map(row => row.id);

    // get episode IDs from those podcasts
    let episodeIds = [];
    if (podcastIds.length > 0) {
      const episodeRes = await pool.query(
        `SELECT id FROM episodes WHERE podcast_id = ANY($1)`,
        [podcastIds]
      );
      episodeIds = episodeRes.rows.map(row => row.id);
    }

    // delete all episode related data
    for (const episodeId of episodeIds) {
      await pool.query(`DELETE FROM episode_likes WHERE episode_id = $1`, [episodeId]);
      await pool.query(`DELETE FROM reviews WHERE episode_id = $1`, [episodeId]);
      await pool.query(`DELETE FROM recentlyplayed WHERE episode_id = $1`, [episodeId]);
    }

    // delete all episodes
    if (episodeIds.length > 0) {
      await pool.query(`DELETE FROM episodes WHERE id = ANY($1)`, [episodeIds]);
    }

    // delete all podcast related data
    for (const podcastId of podcastIds) {
      await pool.query(`DELETE FROM podcastcategory WHERE podcast_id = $1`, [podcastId]);
      await pool.query(`DELETE FROM podcast_saves WHERE podcast_id = $1`, [podcastId]);
    }

    if (podcastIds.length > 0) {
      await pool.query(`DELETE FROM podcasts WHERE id = ANY($1)`, [podcastIds]);
    }

    // delete channelprofile
    await pool.query(`DELETE FROM channelprofile WHERE id = $1`, [channelId]);

    if (accountId) {
      // delete userprofile (user info)
      await pool.query(`DELETE FROM userprofile WHERE account_id = $1`, [channelId]);
      // delete any channel request made by this user
      await pool.query(`DELETE FROM channel_requests WHERE account_id = $1`, [channelId]);
      // delete the account itself
      await pool.query(`DELETE FROM accounts WHERE id = $1`, [channelId]);
    }

    res.json({ message: 'Channel and all related data deleted successfully' });

  } catch (err) {
    console.error('Error in deleteChannel:', err);
    res.status(500).json({ message: 'Failed to delete channel', error: err.message });
  }
};

const deletePodcast = async (req, res) => {
  const podcastId = req.params.id;

  try {
    // check if podcast exists
    const checkRes = await pool.query(
      `SELECT id FROM podcasts WHERE id = $1`,
      [podcastId]
    );

    if (checkRes.rows.length === 0) {
      return res.status(404).json({ message: 'Podcast not found' });
    }

    // get all episodes in the podcast
    const episodeRes = await pool.query(
      `SELECT id FROM episodes WHERE podcast_id = $1`,
      [podcastId]
    );
    const episodeIds = episodeRes.rows.map(row => row.id);

    // delete episode linked data
    for (const episodeId of episodeIds) {
      await pool.query(`DELETE FROM episode_likes WHERE episode_id = $1`, [episodeId]);
      await pool.query(`DELETE FROM reviews WHERE episode_id = $1`, [episodeId]);
      await pool.query(`DELETE FROM recentlyplayed WHERE episode_id = $1`, [episodeId]);
    }

    // delete episodes
    if (episodeIds.length > 0) {
      await pool.query(`DELETE FROM episodes WHERE id = ANY($1)`, [episodeIds]);
    }

    // delete podcast saves and categories
    await pool.query(`DELETE FROM podcast_saves WHERE podcast_id = $1`, [podcastId]);
    await pool.query(`DELETE FROM podcastcategory WHERE podcast_id = $1`, [podcastId]);

    // delete the podcast itself
    await pool.query(`DELETE FROM podcasts WHERE id = $1`, [podcastId]);

    res.json({ message: 'Podcast and all related data deleted successfully' });

  } catch (err) {
    console.error('Error in deletePodcast:', err);
    res.status(500).json({ message: 'Failed to delete podcast', error: err.message });
  }
};

const deleteEpisode = async (req, res) => {
  const episodeId = req.params.id;

  try {
    // check if episode exists
    const checkRes = await pool.query(
      `SELECT id FROM episodes WHERE id = $1`,
      [episodeId]
    );

    if (checkRes.rows.length === 0) {
      return res.status(404).json({ message: 'Episode not found' });
    }

    // delete related data
    await pool.query(`DELETE FROM episode_likes WHERE episode_id = $1`, [episodeId]);
    await pool.query(`DELETE FROM reviews WHERE episode_id = $1`, [episodeId]);
    await pool.query(`DELETE FROM recentlyplayed WHERE episode_id = $1`, [episodeId]);
    await pool.query(`DELETE FROM episode_speakers WHERE episode_id = $1`, [episodeId]); 
    await pool.query(`DELETE FROM ad_play_logs WHERE episode_id = $1`, [episodeId]);    

    // delete the episode
    await pool.query(`DELETE FROM episodes WHERE id = $1`, [episodeId]);

    res.json({ message: 'Episode and related data deleted successfully' });

  } catch (err) {
    console.error('Error in deleteEpisode:', err);
    res.status(500).json({ message: 'Failed to delete episode', error: err.message });
  }
};

const getChannelOwnerSummary = async (req, res) => {
  const channelId = req.params.id;

  try {
    const channelRes = await pool.query(
      `SELECT account_id, created_by_admin FROM channelprofile WHERE id = $1`,
      [channelId]
    );

    if (channelRes.rows.length === 0) {
      return res.status(404).json({ message: 'Channel not found' });
    }

    const { account_id, created_by_admin } = channelRes.rows[0];
    
    if (!account_id || created_by_admin === true) {
      return res.json({ summary: 'This is an external channel created by an admin.' });
    }

    // join channel → userprofile to get gender, age, name
    const userRes  = await pool.query(
      `SELECT u.first_name, u.last_name, u.gender, u.age
       FROM accounts a
       JOIN userprofile u ON a.id = u.account_id
       WHERE a.id = $1 AND a.account_type = 'channel'`,
      [account_id]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ message: 'Owner profile not found for this channel' });
    }

    const { first_name, last_name, gender, age } = userRes.rows[0];
    if (!gender || !age || !first_name || !last_name) {
      return res.status(400).json({ message: 'Owner profile is incomplete for this channel.' });
    }

    const fullName = `${first_name} ${last_name}`;
    const sentence = `This channel was created by a ${age}-year-old ${gender.toLowerCase()} named ${fullName}`;

    res.json({ summary: sentence });

  } catch (err) {
    console.error('Error in getChannelOwnerSummary:', err);
    res.status(500).json({ message: 'Failed to get channel owner summary', error: err.message });
  }
};

const getEpisodeScript = async (req, res) => {
  const episodeId = req.params.id;

  try {
    const result = await pool.query(
      `SELECT script FROM episodes WHERE id = $1`,
      [episodeId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Episode not found' });
    }

    res.json({ script: result.rows[0].script });

  } catch (err) {
    console.error('Error in getEpisodeScript:', err);
    res.status(500).json({ message: 'Failed to get script', error: err.message });
  }
};

const deleteReview = async (req, res) => {
  const reviewId = req.params.id;

  try {
    const checkRes = await pool.query(
      `SELECT id FROM reviews WHERE id = $1`,
      [reviewId]
    );

    if (checkRes.rows.length === 0) {
      return res.status(404).json({ message: 'Review not found' });
    }

    await pool.query(
      `DELETE FROM reviews WHERE id = $1`,
      [reviewId]
    );

    res.json({ message: 'Review deleted successfully' });

  } catch (err) {
    console.error('Error in deleteReview:', err);
    res.status(500).json({ message: 'Failed to delete review', error: err.message });
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
  deleteUser,
  deleteChannel,
  deletePodcast,
  deleteEpisode,
  getChannelOwnerSummary,
  getEpisodeScript,
  deleteReview
};
