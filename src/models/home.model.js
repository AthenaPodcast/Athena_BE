const pool = require('../../db');
const { getRecommendations } = require('../services/recommendation.service');

// latest 4 episodes
const getLatestEpisodes = async () => {
  const result = await pool.query(`
    SELECT id, name, picture_url, created_at
    FROM episodes
    ORDER BY created_at DESC
    LIMIT 4
  `);
  return result.rows;
};

// recommendations (3 episodes + podcasts)
const getHomeRecommendations = async (accountId) => {
  const raw = await getRecommendations(accountId);

  const episodes = [];
  const podcasts = [];

  for (const item of raw) {
    if (item.type === 'episode' && episodes.length < 3) {
      const res = await pool.query(
        `SELECT picture_url FROM episodes WHERE id = $1`, [item.id]
      );
      item.picture_url = res.rows[0]?.picture_url || null;
      episodes.push(item);
    }

    if (item.type === 'podcast' && podcasts.length < 3) {
      const res = await pool.query(
        `SELECT picture_url FROM podcasts WHERE id = $1`, [item.id]
      );
      item.picture_url = res.rows[0]?.picture_url || null;
      podcasts.push(item);
    }

    if ((episodes.length + podcasts.length) === 3) break;
  }

  return { episodes, podcasts };
};


// popular channels
const getPopularChannels = async () => {
  const result = await pool.query(`
    SELECT cp.id, cp.channel_name, cp.channel_picture,
      COUNT(DISTINCT ps.podcast_id) AS saved_podcasts,
      COUNT(DISTINCT el.episode_id) AS liked_episodes,
      COUNT(DISTINCT r.id) AS total_reviews
    FROM channelprofile cp
    JOIN podcasts p ON cp.id = p.channel_id
    LEFT JOIN podcast_saves ps ON p.id = ps.podcast_id AND ps.saved = true
    LEFT JOIN episodes e ON p.id = e.podcast_id
    LEFT JOIN episode_likes el ON e.id = el.episode_id AND el.liked = true
    LEFT JOIN reviews r ON e.id = r.episode_id
    GROUP BY cp.id
    ORDER BY (COUNT(DISTINCT ps.podcast_id) + COUNT(DISTINCT el.episode_id) + COUNT(DISTINCT r.id)) DESC
    LIMIT 3
  `);
  return result.rows;
};

// recently played (3 latest for user)
const getRecentlyPlayed = async (accountId) => {
  const result = await pool.query(`
    SELECT 
      e.id AS episode_id,
      CONCAT(p.name, ' - ', e.name) AS name,
      e.picture_url,
      rp.progress,
      e.duration,
      rp.last_played,
      ROUND((e.duration - rp.progress) / 60.0) AS remaining_minutes
    FROM recentlyplayed rp
    JOIN episodes e ON e.id = rp.episode_id
    JOIN podcasts p ON p.id = e.podcast_id
    WHERE rp.account_id = $1
      AND rp.progress < e.duration
    ORDER BY rp.last_played DESC
    LIMIT 3
  `, [accountId]);

  return result.rows;
};

// top categories (by podcast count)
const getTopCategories = async () => {
  const result = await pool.query(`
    SELECT c.id, c.name, COUNT(pc.podcast_id) AS podcast_count
    FROM categories c
    JOIN podcastcategory pc ON pc.category_id = c.id
    GROUP BY c.id
    ORDER BY podcast_count DESC
    LIMIT 4
  `);
  return result.rows;
};

module.exports = {
  getLatestEpisodes,
  getHomeRecommendations,
  getPopularChannels,
  getRecentlyPlayed,
  getTopCategories
};
