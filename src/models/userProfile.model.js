const pool = require('../../db');

const createUserProfile = async (accountId, firstName, lastName) => {
  await pool.query(
    `INSERT INTO UserProfile (account_id, first_name, last_name)
     VALUES ($1, $2, $3)`,
    [accountId, firstName, lastName]
  );
};

const updateProfileInfo = async (accountId, gender, age) => {
    await pool.query(
      `UPDATE UserProfile SET gender = $1, age = $2 WHERE account_id = $3`,
      [gender, age, accountId]
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
  
module.exports = {
  createUserProfile,
  updateProfileInfo,
  updateProfilePicture,
  insertUserInterests,
  deleteUserInterests
};


  