const pool = require('../../db');

const getMostLikedEpisodes = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT e.id AS episode_id, e.name AS episode_name, p.name AS podcast_name, COUNT(el.*) AS like_count
       FROM episode_likes el
       JOIN episodes e ON el.episode_id = e.id
       JOIN podcasts p ON e.podcast_id = p.id
       WHERE el.liked = true
       GROUP BY e.id, e.name, p.name
       ORDER BY like_count DESC
       LIMIT 5`
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error in getMostLikedEpisodes:', err);
    res.status(500).json({ message: 'Failed to get most liked episodes' });
  }
};

const getMostSavedPodcasts = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.id AS podcast_id, p.name AS podcast_name, cp.channel_name, COUNT(ps.*) AS save_count
       FROM podcast_saves ps
       JOIN podcasts p ON ps.podcast_id = p.id
       JOIN accounts a ON p.channel_account_id = a.id
       JOIN channelprofile cp ON cp.account_id = a.id
       WHERE ps.saved = true
       GROUP BY p.id, p.name, cp.channel_name
       ORDER BY save_count DESC
       LIMIT 5`
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error in getMostSavedPodcasts:', err);
    res.status(500).json({ message: 'Failed to get most saved podcasts' });
  }
};

const getTopListeners = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT rp.account_id,
              CONCAT(up.first_name, ' ', up.last_name) AS user_name,
              FLOOR(SUM(rp.progress) / 60) AS total_minutes
       FROM recentlyplayed rp
       JOIN userprofile up ON rp.account_id = up.account_id
       GROUP BY rp.account_id, user_name
       ORDER BY total_minutes DESC
       LIMIT 5`
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error in getTopListeners:', err);
    res.status(500).json({ message: 'Failed to get top listeners' });
  }
};

const getTopCategories = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.name AS category_name,
              FLOOR(SUM(rp.progress) / 60) AS total_minutes
       FROM recentlyplayed rp
       JOIN episodes e ON rp.episode_id = e.id
       JOIN podcasts p ON e.podcast_id = p.id
       JOIN podcastcategory pc ON pc.podcast_id = p.id
       JOIN categories c ON pc.category_id = c.id
       GROUP BY c.name
       ORDER BY total_minutes DESC
       LIMIT 5`
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error in getTopCategories:', err);
    res.status(500).json({ message: 'Failed to get top categories', error: err.message });
  }
};

const getAverageListeningTime = async (req, res) => {
  try {
    const totalRes = await pool.query(
      `SELECT SUM(progress) AS total_seconds FROM recentlyplayed`
    );

    const userRes = await pool.query(
      `SELECT COUNT(DISTINCT account_id) AS user_count FROM recentlyplayed`
    );

    const totalSeconds = parseInt(totalRes.rows[0].total_seconds || 0);
    const userCount = parseInt(userRes.rows[0].user_count || 0);

    const avgMinutes = userCount > 0 ? Math.floor((totalSeconds / 60) / userCount) : 0;

    res.json({ avg_minutes_per_user: avgMinutes });
  } catch (err) {
    console.error('Error in getAverageListeningTime:', err);
    res.status(500).json({ message: 'Failed to calculate average listening time', error: err.message });
  }
};

module.exports = {
    getMostLikedEpisodes,
    getMostSavedPodcasts,
    getTopListeners,
    getTopCategories,
    getAverageListeningTime
};