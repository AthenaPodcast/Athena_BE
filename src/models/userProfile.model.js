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

module.exports = {
  createUserProfile,
  updateProfileInfo,
  updateProfilePicture,
  insertUserInterests,
  deleteUserInterests,
  markProfileComplete,
  getFullProfileInfo
};


  