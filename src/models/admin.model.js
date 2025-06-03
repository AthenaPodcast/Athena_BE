const pool = require('../../db');

const getAllUsers = async () => {
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
  return result.rows;
};

const getAllChannels = async () => {
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

  return result.rows.map(row => ({
    channel_id: row.channel_id,
    email: row.email,
    channel_name: row.channel_name,
    channel_description: row.channel_description,
    podcast_count: parseInt(row.podcast_count),
    channel_type: row.created_by_admin ? 'external' : 'regular'
  }));
};

const getAllPodcasts = async () => {
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

  return grouped;
};

const getAllEpisodes = async () => {
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

  return grouped;
};

const getUserDetailsById = async (userId) => {
  const basicInfoResult = await pool.query(
    `SELECT a.email, a.phone, u.first_name, u.last_name, u.gender, u.age, u.profile_picture
     FROM accounts a
     JOIN userprofile u ON a.id = u.account_id
     WHERE a.id = $1`,
    [userId]
  );
  if (basicInfoResult.rows.length === 0) return null;

  const basicInfo = basicInfoResult.rows[0];
  const fullName = `${basicInfo.first_name} ${basicInfo.last_name}`;

  const savedPodcasts = (
    await pool.query(
      `SELECT p.name FROM podcast_saves ps
       JOIN podcasts p ON ps.podcast_id = p.id
       WHERE ps.account_id = $1 AND ps.saved = true`,
      [userId]
    )
  ).rows.map(r => r.name);

  const likedEpisodes = (
    await pool.query(
      `SELECT e.name FROM episode_likes el
       JOIN episodes e ON el.episode_id = e.id
       WHERE el.account_id = $1 AND el.liked = true`,
      [userId]
    )
  ).rows.map(r => r.name);

  const reviews = (
    await pool.query(
      `SELECT r.comment_text, r.rating, r.created_at, e.name AS episode_name
       FROM reviews r
       JOIN episodes e ON r.episode_id = e.id
       WHERE r.account_id = $1`,
      [userId]
    )
  ).rows;

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
  const categoryDurations = {};

  playedResult.rows.forEach(row => {
    const time = Math.min(row.progress, row.duration || row.progress || 0);
    totalSeconds += time;
    const key = row.category_name;
    categoryDurations[key] = (categoryDurations[key] || 0) + time;
  });

  const totalMinutes = Math.floor(totalSeconds / 60);
  const listening_time = `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;

  const category_breakdown = {};
  Object.entries(categoryDurations).forEach(([cat, sec]) => {
    const percent = ((sec / totalSeconds) * 100).toFixed(1);
    category_breakdown[cat] = `${percent}%`;
  });

  return {
    basic_info: {
      email: basicInfo.email,
      phone: basicInfo.phone,
      name: fullName,
      gender: basicInfo.gender,
      age: basicInfo.age,
      profile_picture: basicInfo.profile_picture
    },
    saved_podcasts: { count: savedPodcasts.length, list: savedPodcasts },
    liked_episodes: { count: likedEpisodes.length, list: likedEpisodes },
    reviews,
    listening_time,
    category_breakdown
  };
};

const getChannelDetailsById = async (channelId) => {
  const channelRes = await pool.query(
    `SELECT c.channel_name, c.channel_description, c.channel_picture, c.created_by_admin, a.created_at, c.account_id
     FROM channelprofile c
     LEFT JOIN accounts a ON a.id = c.account_id
     WHERE c.id = $1`,
    [channelId]
  );

  if (channelRes.rows.length === 0) return null;

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

  return {
    channel_name: channel.channel_name,
    channel_picture: channel.channel_picture,
    description: channel.channel_description,
    channel_type: isExternal ? 'external' : 'regular',
    podcast_count: podcasts.length,
    podcasts: podcastNames,
    episode_count: episodeCount,
    languages,
    joined_at: channel.created_at
  };
};

const getPodcastDetailsById = async (podcastId) => {
  const podcastRes = await pool.query(
    `SELECT p.name AS podcast_name, p.description, p.picture_url,
            cp.channel_name, cp.created_by_admin, cp.id AS channel_id
     FROM podcasts p
     JOIN channelprofile cp ON cp.id = p.channel_id
     WHERE p.id = $1`,
    [podcastId]
  );

  if (podcastRes.rows.length === 0) return null;

  const podcast = podcastRes.rows[0];
  const isExternal = podcast.created_by_admin === true;
  const channelType = isExternal ? 'external' : 'regular';

  const categoryRes = await pool.query(
    `SELECT c.name FROM podcastcategory pc
     JOIN categories c ON pc.category_id = c.id
     WHERE pc.podcast_id = $1`,
    [podcastId]
  );
  const categories = categoryRes.rows.map(r => r.name);

  const episodeRes = await pool.query(
    `SELECT name FROM episodes
     WHERE podcast_id = $1
     ORDER BY created_at ASC`,
    [podcastId]
  );
  const episodes = episodeRes.rows.map(r => r.name);

  const saveRes = await pool.query(
    `SELECT COUNT(*) FROM podcast_saves
     WHERE podcast_id = $1 AND saved = true`,
    [podcastId]
  );
  const saved_count = parseInt(saveRes.rows[0].count);

  const langRes = await pool.query(
    `SELECT DISTINCT language FROM episodes
     WHERE podcast_id = $1 AND language IS NOT NULL`,
    [podcastId]
  );
  const languages = langRes.rows.map(r => r.language);

  return {
    podcast_name: podcast.podcast_name,
    channel_name: podcast.channel_name,
    channel_type: channelType,
    description: podcast.description,
    picture_url: podcast.picture_url,
    languages,
    categories,
    episode_count: episodes.length,
    episodes,
    saved_count
  };
};

const getEpisodeDetailsById = async (episodeId) => {
  const episodeRes = await pool.query(
    `SELECT e.name AS episode_name, e.description, e.duration, e.picture_url, e.language,
            p.name AS podcast_name, cp.channel_name, cp.created_by_admin
     FROM episodes e
     LEFT JOIN podcasts p ON e.podcast_id = p.id
     LEFT JOIN channelprofile cp ON p.channel_id = cp.id
     WHERE e.id = $1`,
    [episodeId]
  );

  if (episodeRes.rows.length === 0) return null;

  const episode = episodeRes.rows[0];
  const channelType = episode.created_by_admin ? 'external' : 'regular';

  const speakerRes = await pool.query(
    `SELECT s.name
     FROM episode_speakers es
     JOIN speakers s ON es.speaker_id = s.id
     WHERE es.episode_id = $1`,
    [episodeId]
  );
  const speakers = speakerRes.rows.map(row => row.name);

  const likeRes = await pool.query(
    `SELECT COUNT(*) FROM episode_likes
     WHERE episode_id = $1 AND liked = true`,
    [episodeId]
  );
  const like_count = parseInt(likeRes.rows[0].count);

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

  const durationSec = episode.duration || 0;
  const hours = String(Math.floor(durationSec / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((durationSec % 3600) / 60)).padStart(2, '0');
  const seconds = String(durationSec % 60).padStart(2, '0');
  const durationFormatted = `${hours}:${minutes}:${seconds}`;

  return {
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
  };
};

const deleteUserById = async (userId) => {
  const existsRes = await pool.query(
    `SELECT id FROM accounts WHERE id = $1 AND account_type = 'regular'`,
    [userId]
  );
  if (existsRes.rows.length === 0) return false;

  await pool.query(`DELETE FROM episode_likes WHERE account_id = $1`, [userId]);
  await pool.query(`DELETE FROM podcast_saves WHERE account_id = $1`, [userId]);
  await pool.query(`DELETE FROM reviews WHERE account_id = $1`, [userId]);
  await pool.query(`DELETE FROM recentlyplayed WHERE account_id = $1`, [userId]);
  await pool.query(`DELETE FROM moodtracker WHERE account_id = $1`, [userId]);
  await pool.query(`DELETE FROM notifications WHERE account_id = $1`, [userId]);
  await pool.query(`DELETE FROM userinterests WHERE account_id = $1`, [userId]);
  await pool.query(`DELETE FROM ad_play_logs WHERE user_id = $1`, [userId]);
  await pool.query(`DELETE FROM userprofile WHERE account_id = $1`, [userId]);
  await pool.query(`DELETE FROM accounts WHERE id = $1`, [userId]);

  return true;
};

const deleteChannelById = async (channelId) => {
  const channelRes = await pool.query(
    `SELECT account_id FROM channelprofile WHERE id = $1`,
    [channelId]
  );
  if (channelRes.rows.length === 0) return false;

  const accountId = channelRes.rows[0].account_id;

  const podcastRes = await pool.query(
    `SELECT id FROM podcasts WHERE channel_id = $1`,
    [channelId]
  );
  const podcastIds = podcastRes.rows.map(row => row.id);

  let episodeIds = [];
  if (podcastIds.length > 0) {
    const episodeRes = await pool.query(
      `SELECT id FROM episodes WHERE podcast_id = ANY($1)`,
      [podcastIds]
    );
    episodeIds = episodeRes.rows.map(row => row.id);
  }

  for (const episodeId of episodeIds) {
    await pool.query(`DELETE FROM episode_likes WHERE episode_id = $1`, [episodeId]);
    await pool.query(`DELETE FROM reviews WHERE episode_id = $1`, [episodeId]);
    await pool.query(`DELETE FROM recentlyplayed WHERE episode_id = $1`, [episodeId]);
  }

  if (episodeIds.length > 0) {
    await pool.query(`DELETE FROM episodes WHERE id = ANY($1)`, [episodeIds]);
  }

  for (const podcastId of podcastIds) {
    await pool.query(`DELETE FROM podcastcategory WHERE podcast_id = $1`, [podcastId]);
    await pool.query(`DELETE FROM podcast_saves WHERE podcast_id = $1`, [podcastId]);
  }

  if (podcastIds.length > 0) {
    await pool.query(`DELETE FROM podcasts WHERE id = ANY($1)`, [podcastIds]);
  }

  await pool.query(`DELETE FROM channelprofile WHERE id = $1`, [channelId]);

  if (accountId) {
    await pool.query(`DELETE FROM userprofile WHERE account_id = $1`, [channelId]);
    await pool.query(`DELETE FROM channel_requests WHERE account_id = $1`, [channelId]);
    await pool.query(`DELETE FROM accounts WHERE id = $1`, [channelId]);
  }

  return true;
};

const deletePodcastById = async (podcastId) => {
  const checkRes = await pool.query(`SELECT id FROM podcasts WHERE id = $1`, [podcastId]);
  if (checkRes.rows.length === 0) return false;

  const episodeRes = await pool.query(
    `SELECT id FROM episodes WHERE podcast_id = $1`,
    [podcastId]
  );
  const episodeIds = episodeRes.rows.map(row => row.id);

  for (const episodeId of episodeIds) {
    await pool.query(`DELETE FROM episode_likes WHERE episode_id = $1`, [episodeId]);
    await pool.query(`DELETE FROM reviews WHERE episode_id = $1`, [episodeId]);
    await pool.query(`DELETE FROM recentlyplayed WHERE episode_id = $1`, [episodeId]);
  }

  if (episodeIds.length > 0) {
    await pool.query(`DELETE FROM episodes WHERE id = ANY($1)`, [episodeIds]);
  }

  await pool.query(`DELETE FROM podcast_saves WHERE podcast_id = $1`, [podcastId]);
  await pool.query(`DELETE FROM podcastcategory WHERE podcast_id = $1`, [podcastId]);
  await pool.query(`DELETE FROM podcasts WHERE id = $1`, [podcastId]);

  return true;
};

const deleteEpisodeById = async (episodeId) => {
  const checkRes = await pool.query(`SELECT id FROM episodes WHERE id = $1`, [episodeId]);
  if (checkRes.rows.length === 0) return false;

  await pool.query(`DELETE FROM episode_likes WHERE episode_id = $1`, [episodeId]);
  await pool.query(`DELETE FROM reviews WHERE episode_id = $1`, [episodeId]);
  await pool.query(`DELETE FROM recentlyplayed WHERE episode_id = $1`, [episodeId]);
  await pool.query(`DELETE FROM episode_speakers WHERE episode_id = $1`, [episodeId]);
  await pool.query(`DELETE FROM ad_play_logs WHERE episode_id = $1`, [episodeId]);
  await pool.query(`DELETE FROM episodes WHERE id = $1`, [episodeId]);

  return true;
};

const getChannelOwnerSummaryById = async (channelId) => {
  const channelRes = await pool.query(
    `SELECT account_id, created_by_admin FROM channelprofile WHERE id = $1`,
    [channelId]
  );
  if (channelRes.rows.length === 0) return { error: 'not_found' };

  const { account_id, created_by_admin } = channelRes.rows[0];
  if (!account_id || created_by_admin === true) {
    return { summary: 'This is an external channel created by an admin.' };
  }

  const userRes = await pool.query(
    `SELECT u.first_name, u.last_name, u.gender, u.age
     FROM accounts a
     JOIN userprofile u ON a.id = u.account_id
     WHERE a.id = $1 AND a.account_type = 'channel'`,
    [account_id]
  );

  if (userRes.rows.length === 0) return { error: 'owner_not_found' };

  const { first_name, last_name, gender, age } = userRes.rows[0];
  if (!gender || !age || !first_name || !last_name) return { error: 'incomplete' };

  const fullName = `${first_name} ${last_name}`;
  const summary = `This channel was created by a ${age}-year-old ${gender.toLowerCase()} named ${fullName}`;
  return { summary };
};

const getEpisodeScriptById = async (episodeId) => {
  const result = await pool.query(
    `SELECT script FROM episodes WHERE id = $1`,
    [episodeId]
  );
  if (result.rows.length === 0) return null;
  return result.rows[0].script;
};

const deleteReviewById = async (reviewId) => {
  const checkRes = await pool.query(
    `SELECT id FROM reviews WHERE id = $1`,
    [reviewId]
  );
  if (checkRes.rows.length === 0) return false;

  await pool.query(`DELETE FROM reviews WHERE id = $1`, [reviewId]);
  return true;
};

const getAdminProfileById = async (adminId) => {
  const result = await pool.query(
    `SELECT u.first_name, u.last_name, u.profile_picture
     FROM userprofile u
     WHERE u.account_id = $1`,
    [adminId]
  );

  if (result.rows.length === 0) return null;

  const { first_name, last_name, profile_picture } = result.rows[0];
  const full_name = `${first_name} ${last_name}`;
  return { name: full_name, profile_picture };
};

module.exports = {
  getAllUsers,
  getAllChannels,
  getAllPodcasts,
  getAllEpisodes,
  getUserDetailsById,
  getChannelDetailsById,
  getPodcastDetailsById,
  getEpisodeDetailsById,
  deleteUserById,
  deleteChannelById,
  deletePodcastById,
  deleteEpisodeById,
  getChannelOwnerSummaryById,
  getEpisodeScriptById,
  deleteReviewById,
  getAdminProfileById
};
