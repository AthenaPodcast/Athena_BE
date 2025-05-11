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

module.exports = {
  saveOrUpdateProgress,
  getProgress,
};