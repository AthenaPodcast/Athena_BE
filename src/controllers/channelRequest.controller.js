const {
  submitChannelRequest,
  hasExistingRequest,
  deleteChannelRequestById
} = require('../models/channelRequest.model');

const requestChannelUpgrade = async (req, res) => {
  const accountId = req.user.accountId;
  const { channel_name, channel_description, channel_picture } = req.body;

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

module.exports = { 
  requestChannelUpgrade,
  deleteChannelRequest
 };
