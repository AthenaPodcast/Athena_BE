const pool = require('../../db');

const {
  submitChannelRequest,
  hasExistingRequest,
  deleteChannelRequestById
} = require('../models/channelRequest.model');

const requestChannelUpgrade = async (req, res) => {
  const accountId = req.user.accountId;
  const { channel_name, channel_description } = req.body;
  const channel_picture = req.file?.filename;

  if (!channel_name || !channel_description || !channel_picture) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  if (await hasExistingRequest(accountId)) {
    return res.status(400).json({ message: 'You already have a pending request' });
  }

  const request = await submitChannelRequest(accountId, channel_name, channel_description, channel_picture);
  if (request) {
    res.status(201).json({ message: 'Request submitted successfully' });
  } else {
    res.status(500).json({ message: 'Failed to submit request' });
  }
};

const deleteChannelRequest = async (req, res) => {
  const { id } = req.params;

  try {
    await deleteChannelRequestById(id);
    res.status(200).json({ message: 'Channel request deleted successfully' });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ error: 'Failed to delete channel request' });
  }
};

const checkChannelRequestStatus = async (req, res) => {
  const accountId = req.user.accountId;

  try {
    const result = await pool.query(
      `SELECT status FROM channel_requests
       WHERE account_id = $1
       ORDER BY requested_at DESC
       LIMIT 1`,
      [accountId]
    );

    if (result.rows.length === 0) {
      return res.status(200).json({ hasRequest: false });
    }

    const status = result.rows[0].status;
    return res.status(200).json({ hasRequest: true, status });
  } catch (err) {
    console.error('Check request status error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { 
  requestChannelUpgrade,
  deleteChannelRequest,
  checkChannelRequestStatus
 };
