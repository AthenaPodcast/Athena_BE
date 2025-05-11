const pool = require('../../db');

// Save or update episode progress for a user
const saveOrUpdateProgress = async (accountId, episodeId, progress) => {
  const query = `
    INSERT INTO recentlyplayed (account_id, episode_id, progress, last_played)
    VALUES ($1, $2, $3, NOW())
    ON CONFLICT (account_id, episode_id)
    DO UPDATE SET progress = $3, last_played = NOW()
    RETURNING *;
  `;

  const values = [accountId, episodeId, progress];
  const result = await pool.query(query, values);
  return result.rows[0];
};

// Get saved progress for an episode for the user
const getProgress = async (accountId, episodeId) => {
  const query = `
    SELECT progress, last_played
    FROM recentlyplayed
    WHERE account_id = $1 AND episode_id = $2
  `;

  const values = [accountId, episodeId];
  const result = await pool.query(query, values);
  return result.rows[0] || null;
};

// Get list of recently played podcasts (LIMIT 10)
const getRecentlyPlayedEpisodes = async (accountId) => {
    const query = `
      SELECT 
        rp.episode_id,
        rp.progress,
        rp.last_played,
        e.name AS episode_name,
        e.picture_url,
        e.duration,
        p.name AS podcast_name,
        ROUND((e.duration - rp.progress) / 60.0) AS minutes_remaining
      FROM recentlyplayed rp
      JOIN episodes e ON rp.episode_id = e.id
      JOIN podcasts p ON e.podcast_id = p.id
      WHERE rp.account_id = $1
      ORDER BY rp.last_played DESC
      LIMIT 10;
    `;
  
    const result = await pool.query(query, [accountId]);
    return result.rows;
};
  

module.exports = {
  saveOrUpdateProgress,
  getProgress,
  getRecentlyPlayedEpisodes
};