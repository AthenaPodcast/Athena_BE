const pool = require('../../db');

const {
  getPendingRequests,
  updateRequestStatus,
  updateAccountToChannel,
  getAllRequestsGrouped 
} = require('../models/channelRequest.model');

const getChannelRequests = async (req, res) => {
  const requests = await getPendingRequests();
  res.json(requests);
};

const approveRequest = async (req, res) => {
  const { id } = req.params;
  const request = await updateRequestStatus(id, 'approved');
  if (request) {
    await updateAccountToChannel(request.account_id);

    await pool.query(
      `INSERT INTO channelprofile (account_id, channel_name, channel_description, channel_picture)
       VALUES ($1, $2, $3, $4)`,
      [request.account_id, request.channel_name, request.channel_description, request.channel_picture]
    );

    return res.json({ message: 'Channel approved and profile created' });
  }

  res.status(404).json({ message: 'Request not found' });
};

const rejectRequest = async (req, res) => {
  const { id } = req.params;
  const request = await updateRequestStatus(id, 'rejected');
  if (request) return res.json({ message: 'Request rejected' });
  res.status(404).json({ message: 'Request not found' });
};

const getAllChannelRequests = async (req, res) => {
  const result = await getAllRequestsGrouped();
  res.json(result);
};

module.exports = {
  getChannelRequests,
  approveRequest,
  rejectRequest,
  getAllChannelRequests
};
