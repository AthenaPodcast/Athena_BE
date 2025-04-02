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
  
module.exports = {
  createUserProfile,
  updateProfileInfo
};
