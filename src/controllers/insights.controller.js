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
       JOIN channelprofile cp ON p.channel_id = cp.id
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

const getMostReviewedEpisodes = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT e.id AS episode_id,
              e.name AS episode_name,
              p.name AS podcast_name,
              COUNT(r.*) AS review_count
       FROM reviews r
       JOIN episodes e ON r.episode_id = e.id
       JOIN podcasts p ON e.podcast_id = p.id
       GROUP BY e.id, e.name, p.name
       ORDER BY review_count DESC
       LIMIT 5`
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error in getMostReviewedEpisodes:', err);
    res.status(500).json({ message: 'Failed to get most reviewed episodes' });
  }
};

const getTopRatedEpisodes = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT e.id AS episode_id,
              e.name AS episode_name,
              p.name AS podcast_name,
              COUNT(r.*) AS review_count,
              ROUND(AVG(r.rating)::numeric, 1) AS avg_rating
       FROM reviews r
       JOIN episodes e ON r.episode_id = e.id
       JOIN podcasts p ON e.podcast_id = p.id
       GROUP BY e.id, e.name, p.name
       HAVING COUNT(r.*) >= 3
       ORDER BY avg_rating DESC
       LIMIT 5`
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error in getTopRatedEpisodes:', err);
    res.status(500).json({ message: 'Failed to get top rated episodes' });
  }
};

const getInactiveUsers = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.id AS account_id, a.email,
              CONCAT(up.first_name, ' ', up.last_name) AS full_name
       FROM accounts a
       JOIN userprofile up ON a.id = up.account_id
       WHERE a.account_type = 'regular'
         AND NOT EXISTS (
           SELECT 1 FROM recentlyplayed rp WHERE rp.account_id = a.id
         )
       ORDER BY a.created_at DESC
       LIMIT 10`
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error in getInactiveUsers:', err);
    res.status(500).json({ message: 'Failed to get inactive users' });
  }
};

const getNewUsers = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.id AS account_id, a.email,
              CONCAT(up.first_name, ' ', up.last_name) AS full_name,
              a.created_at
       FROM accounts a
       JOIN userprofile up ON a.id = up.account_id
       WHERE a.account_type = 'regular'
         AND DATE_TRUNC('month', a.created_at) = DATE_TRUNC('month', CURRENT_DATE)
       ORDER BY a.created_at DESC`
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error in getNewUsers:', err);
    res.status(500).json({ message: 'Failed to get new users', error: err.message });
  }
};

const getNewEpisodes = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT e.id AS episode_id, e.name AS episode_name, e.created_at,
              p.name AS podcast_name, cp.channel_name
       FROM episodes e
       JOIN podcasts p ON e.podcast_id = p.id
       JOIN channelprofile cp ON p.channel_id = cp.id
       WHERE DATE_TRUNC('month', e.created_at) = DATE_TRUNC('month', CURRENT_DATE)
       ORDER BY e.created_at DESC`
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error in getNewEpisodes:', err);
    res.status(500).json({ message: 'Failed to get new episodes', error: err.message });
  }
};

const getInsightsSummary = async (req, res) => {
  try {
    const [users, channels, podcasts, episodes, totalTime, avgDuration] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM accounts WHERE account_type = 'regular'`),
      pool.query(`SELECT COUNT(*) FROM channelprofile`),
      pool.query(`SELECT COUNT(*) FROM podcasts`),
      pool.query(`SELECT COUNT(*) FROM episodes`),
      pool.query(`SELECT FLOOR(SUM(progress) / 3600) AS total_hours FROM recentlyplayed`),
      pool.query(`SELECT ROUND(AVG(duration)::numeric, 1) AS avg_minutes FROM episodes`)
    ]);

    res.json({
      total_users: parseInt(users.rows[0].count),
      total_channels: parseInt(channels.rows[0].count),
      total_podcasts: parseInt(podcasts.rows[0].count),
      total_episodes: parseInt(episodes.rows[0].count),
      total_listening_hours: parseInt(totalTime.rows[0].total_hours || 0),
      avg_episode_length_minutes: parseFloat(avgDuration.rows[0].avg_minutes || 0)
    });

  } catch (err) {
    console.error('Error in getInsightsSummary:', err);
    res.status(500).json({ message: 'Failed to load summary insights', error: err.message });
  }
};

const getDashboardSummary = async (req, res) => {
  try {
    // total counts
    const [users, channels, podcasts, episodes] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM accounts WHERE account_type = 'regular'`),
      pool.query(`SELECT COUNT(*) FROM channelprofile`),
      pool.query(`SELECT COUNT(*) FROM podcasts`),
      pool.query(`SELECT COUNT(*) FROM episodes`)
    ]);

    // total listening hours
    const totalTime = await pool.query(
      `SELECT FLOOR(SUM(progress) / 3600) AS total_hours FROM recentlyplayed`
    );

    // most liked episode
    const mostLiked = await pool.query(
      `SELECT e.id, e.name, COUNT(el.*) AS like_count
       FROM episode_likes el
       JOIN episodes e ON el.episode_id = e.id
       WHERE el.liked = true
       GROUP BY e.id, e.name
       ORDER BY like_count DESC
       LIMIT 1`
    );

   // most saved podcast
    const mostSaved = await pool.query(
      `SELECT p.id, p.name, COUNT(ps.*) AS save_count
       FROM podcast_saves ps
       JOIN podcasts p ON ps.podcast_id = p.id
       WHERE ps.saved = true
       GROUP BY p.id, p.name
       ORDER BY save_count DESC
       LIMIT 1`
    );

    // top listener
    const topListener = await pool.query(
      `SELECT rp.account_id,
              CONCAT(up.first_name, ' ', up.last_name) AS user_name,
              FLOOR(SUM(rp.progress) / 60) AS total_minutes
       FROM recentlyplayed rp
       JOIN userprofile up ON rp.account_id = up.account_id
       GROUP BY rp.account_id, user_name
       ORDER BY total_minutes DESC
       LIMIT 1`
    );

    // top category
    const topCategory = await pool.query(
      `SELECT c.name AS category_name,
              FLOOR(SUM(rp.progress) / 60) AS total_minutes
       FROM recentlyplayed rp
       JOIN episodes e ON rp.episode_id = e.id
       JOIN podcasts p ON e.podcast_id = p.id
       JOIN podcastcategory pc ON pc.podcast_id = p.id
       JOIN categories c ON pc.category_id = c.id
       GROUP BY c.name
       ORDER BY total_minutes DESC
       LIMIT 1`
    );

    res.json({
      totals: {
        users: parseInt(users.rows[0].count),
        channels: parseInt(channels.rows[0].count),
        podcasts: parseInt(podcasts.rows[0].count),
        episodes: parseInt(episodes.rows[0].count),
        listening_hours: parseInt(totalTime.rows[0].total_hours || 0)
      },
      highlights: {
        most_liked_episode: mostLiked.rows[0] || null,
        most_saved_podcast: mostSaved.rows[0] || null,
        top_listener: topListener.rows[0] || null,
        top_category: topCategory.rows[0] || null
      }
    });

  } catch (err) {
    console.error('Error in getDashboardSummary:', err);
    res.status(500).json({ message: 'Failed to load dashboard summary', error: err.message });
  }
};


module.exports = {
    getMostLikedEpisodes,
    getMostSavedPodcasts,
    getTopListeners,
    getTopCategories,
    getAverageListeningTime,
    getMostReviewedEpisodes,
    getTopRatedEpisodes,
    getInactiveUsers,
    getNewUsers,
    getNewEpisodes,
    getInsightsSummary,
    getDashboardSummary 
};