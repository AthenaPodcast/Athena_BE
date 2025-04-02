const pool = require('../../db');

const findAccountByEmail = async (email) => {
  const result = await pool.query(
    'SELECT * FROM Accounts WHERE email = $1',
    [email]
  );
  return result.rows[0];
};

const createAccount = async (email, phone, hashedPassword) => {
  const result = await pool.query(
    `INSERT INTO Accounts (email, phone, password_hash, email_verified, account_type)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [email, phone, hashedPassword, false, 'regular']
  );
  return result.rows[0].id;
};

const verifyAccountEmail = async (accountId) => {
  await pool.query(
    'UPDATE Accounts SET email_verified = true WHERE id = $1',
    [accountId]
  );
};

module.exports = {
  findAccountByEmail,
  createAccount,
  verifyAccountEmail
};
