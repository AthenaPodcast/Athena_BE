const pool = require('../../db');

const submitChannelRequest = async (accountId, name, description, picture) => {
  const exists = await pool.query(
    'SELECT * FROM channel_requests WHERE account_id = $1 AND status = $2',
    [accountId, 'pending']
  );
  if (exists.rows.length > 0) return null;

  const result = await pool.query(
    `INSERT INTO channel_requests (account_id, channel_name, channel_description, channel_picture)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [accountId, name, description, picture]
  );
  return result.rows[0];
};


const getPendingRequests = async () => {
  const result = await pool.query(
    `SELECT cr.*, a.email, a.account_type
     FROM channel_requests cr
     JOIN accounts a ON cr.account_id = a.id
     WHERE cr.status = 'pending'
     ORDER BY cr.requested_at DESC`
  );
  return result.rows;
};

const updateRequestStatus = async (requestId, status) => {
  const result = await pool.query(
    `UPDATE channel_requests SET status = $1 WHERE id = $2 RETURNING *`,
    [status, requestId]
  );
  return result.rows[0];
};

const updateAccountToChannel = async (accountId) => {
  await pool.query(
    `UPDATE accounts SET account_type = 'channel' WHERE id = $1`,
    [accountId]
  );
};

const hasExistingRequest = async (accountId) => {
  const result = await pool.query(
    `SELECT * FROM channel_requests WHERE account_id = $1 AND status = 'pending'`,
    [accountId]
  );
  return result.rows.length > 0;
};


module.exports = {
  submitChannelRequest,
  getPendingRequests,
  updateRequestStatus,
  updateAccountToChannel,
  hasExistingRequest
};
