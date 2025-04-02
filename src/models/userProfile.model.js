const pool = require('../../db');

const createUserProfile = async (accountId, firstName, lastName) => {
  await pool.query(
    `INSERT INTO UserProfile (account_id, first_name, last_name)
     VALUES ($1, $2, $3)`,
    [accountId, firstName, lastName]
  );
};

module.exports = {
  createUserProfile
};
