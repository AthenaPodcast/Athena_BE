const {
  submitChannelRequest,
  hasExistingRequest
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


module.exports = { requestChannelUpgrade };
