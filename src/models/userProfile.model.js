const pool = require('../../db');

const createUserProfile = async (accountId, firstName, lastName) => {
  await pool.query(
    `INSERT INTO UserProfile (account_id, first_name, last_name)
     VALUES ($1, $2, $3)`,
    [accountId, firstName, lastName]
  );
};

const updateProfileInfo = async (accountId, gender, age, birthDate) => {
    await pool.query(
      `UPDATE UserProfile SET gender = $1, age = $2, birth_date = $3 WHERE account_id = $4`,
      [gender, age, birthDate, accountId]
    );
};

const updateProfilePicture = async (accountId, filePath) => {
    await pool.query(
      `UPDATE UserProfile SET profile_picture = $1 WHERE account_id = $2`,
      [filePath, accountId]
    );
};
  
const insertUserInterests = async (accountId, categoryIds) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
  
      const query = `
        INSERT INTO UserInterests (account_id, category_id, created_at)
        VALUES ($1, $2, NOW())
      `;
  
      for (const categoryId of categoryIds) {
        await client.query(query, [accountId, categoryId]);
      }
  
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
};

const deleteUserInterests = async (accountId) => {
    await pool.query('DELETE FROM UserInterests WHERE account_id = $1', [accountId]);
};

const markProfileComplete = async (accountId) => {
  await pool.query(
    `UPDATE UserProfile SET is_profile_complete = true WHERE account_id = $1`,
    [accountId]
  );
};
  
const getFullProfileInfo = async (accountId) => {
  const result = await pool.query(`
    SELECT 
      up.first_name,
      up.last_name,
      up.profile_picture,
      up.gender,
      up.birth_date,
      acc.email,
      acc.phone,
      COALESCE(likes.count, 0) AS liked_episodes_count,
      COALESCE(saves.count, 0) AS saved_podcasts_count
    FROM userprofile up
    JOIN accounts acc ON acc.id = up.account_id
    LEFT JOIN (
      SELECT account_id, COUNT(*) as count
      FROM episode_likes
      WHERE liked = true
      GROUP BY account_id
    ) likes ON up.account_id = likes.account_id
    LEFT JOIN (
      SELECT account_id, COUNT(*) as count
      FROM podcast_saves
      WHERE saved = true
      GROUP BY account_id
    ) saves ON up.account_id = saves.account_id
    WHERE up.account_id = $1
  `, [accountId]);

  return result.rows[0];
};

const getProfileSummary = async (accountId) => {
  const client = await pool.connect();
  try {
    const likedEpisodesRes = await client.query(`
      SELECT 
        e.id, e.name, e.picture_url,
        cp.created_by_admin AS is_external
      FROM episode_likes el
      JOIN episodes e ON e.id = el.episode_id
      JOIN podcasts p ON p.id = e.podcast_id
      JOIN channelprofile cp ON cp.id = p.channel_id
      WHERE el.account_id = $1 AND el.liked = true
      ORDER BY el.episode_id DESC
      LIMIT 3
    `, [accountId]);

    const likedCountRes = await client.query(`
      SELECT COUNT(*) FROM episode_likes
      WHERE account_id = $1 AND liked = true
    `, [accountId]);

    const savedPodcastsRes = await client.query(`
      SELECT 
        p.id, p.name, p.picture_url,
        cp.created_by_admin AS is_external
      FROM podcast_saves ps
      JOIN podcasts p ON p.id = ps.podcast_id
      JOIN channelprofile cp ON cp.id = p.channel_id
      WHERE ps.account_id = $1 AND ps.saved = true
      ORDER BY ps.podcast_id DESC
      LIMIT 3
    `, [accountId]);

    const savedCountRes = await client.query(`
      SELECT COUNT(*) FROM podcast_saves
      WHERE account_id = $1 AND saved = true
    `, [accountId]);

    const liked_episodes = likedEpisodesRes.rows.map(row => ({
      ...row,
      type: row.is_external ? 'external' : 'regular'
    }));

    const saved_podcasts = savedPodcastsRes.rows.map(row => ({
      ...row,
      type: row.is_external ? 'external' : 'regular'
    }));

    return {
      liked_episodes_count: parseInt(likedCountRes.rows[0].count, 10),
      liked_episodes,
      saved_podcasts_count: parseInt(savedCountRes.rows[0].count, 10),
      saved_podcasts,
    };
  } finally {
    client.release();
  }
};

const AllLikedEpisodes = async (accountId) => {
  const result = await pool.query(`
    SELECT 
      e.id, e.name, e.picture_url,
      cp.created_by_admin AS is_external
    FROM episode_likes el
    JOIN episodes e ON e.id = el.episode_id
    JOIN podcasts p ON p.id = e.podcast_id
    JOIN channelprofile cp ON cp.id = p.channel_id
    WHERE el.account_id = $1 AND el.liked = true
    ORDER BY el.episode_id DESC
  `, [accountId]);

  return result.rows.map(row => ({
    ...row,
    type: row.is_external ? 'external' : 'regular'
  }));
};

const AllSavedPodcasts = async (accountId) => {
  const result = await pool.query(`
    SELECT 
      p.id, p.name, p.picture_url,
      cp.created_by_admin AS is_external
    FROM podcast_saves ps
    JOIN podcasts p ON p.id = ps.podcast_id
    JOIN channelprofile cp ON cp.id = p.channel_id
    WHERE ps.account_id = $1 AND ps.saved = true
    ORDER BY ps.podcast_id DESC
  `, [accountId]);

  return result.rows.map(row => ({
    ...row,
    type: row.is_external ? 'external' : 'regular'
  }));
};

module.exports = {
  createUserProfile,
  updateProfileInfo,
  updateProfilePicture,
  insertUserInterests,
  deleteUserInterests,
  markProfileComplete,
  getFullProfileInfo,
  getProfileSummary,
  AllLikedEpisodes,
  AllSavedPodcasts
};


  