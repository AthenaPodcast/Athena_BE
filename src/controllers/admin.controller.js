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

const getAllUsers = async (req, res) => {
  const result = await pool.query(
    `SELECT 
       a.id,
       a.email,
       a.phone,
       CONCAT(u.first_name, ' ', u.last_name) AS full_name,
       u.gender,
       u.age
     FROM accounts a
     LEFT JOIN userprofile u ON a.id = u.account_id
     WHERE a.account_type = 'regular'
     ORDER BY a.created_at DESC`
  );
  res.json(result.rows);
};


const getAllChannels = async (req, res) => {
  const result = await pool.query(
    `SELECT 
       a.id,
       a.email,
       c.channel_name,
       c.channel_description,
       COUNT(p.id) AS podcast_count
     FROM accounts a
     JOIN channelprofile c ON a.id = c.account_id
     LEFT JOIN podcasts p ON p.channel_account_id = a.id
     WHERE a.account_type = 'channel'
     GROUP BY a.id, c.channel_name, c.channel_description
     ORDER BY a.created_at DESC`
  );
  res.json(result.rows);
};


const getAllPodcasts = async (req, res) => {
  const result = await pool.query(
    `SELECT 
       p.id,
       c.channel_name,
       p.name AS podcast_name,
       p.description,
       p.language,
       cat.name AS category_name,
       COUNT(e.id) AS episode_count
     FROM podcasts p
     JOIN accounts a ON p.channel_account_id = a.id
     JOIN channelprofile c ON c.account_id = a.id
     LEFT JOIN podcastcategory pc ON p.id = pc.podcast_id
     LEFT JOIN categories cat ON pc.category_id = cat.id
     LEFT JOIN episodes e ON e.podcast_id = p.id
     GROUP BY p.id, c.channel_name, cat.name
     ORDER BY c.channel_name, p.name`
  );

  const grouped = {};
  result.rows.forEach(row => {
    const channel = row.channel_name;
    if (!grouped[channel]) grouped[channel] = [];

    grouped[channel].push({
      podcast_name: row.podcast_name,
      description: row.description,
      language: row.language,
      category_name: row.category_name,
      episode_count: row.episode_count
    });
  });

  res.json(grouped);
};

const getAllEpisodes = async (req, res) => {
  const result = await pool.query(
    `SELECT 
       e.id,
       e.name AS episode_name,
       e.description,
       e.duration,
       p.name AS podcast_name,
       cp.channel_name
     FROM episodes e
     LEFT JOIN podcasts p ON e.podcast_id = p.id
     LEFT JOIN accounts a ON p.channel_account_id = a.id
     LEFT JOIN channelprofile cp ON cp.account_id = a.id
     ORDER BY cp.channel_name, p.name, e.name`
  );

  const grouped = {};
  result.rows.forEach(row => {
    const groupKey = `${row.channel_name} - ${row.podcast_name}`;
    if (!grouped[groupKey]) grouped[groupKey] = [];

    grouped[groupKey].push({
      episode_name: row.episode_name,
      description: row.description,
      duration: row.duration
    });
  });

  res.json(grouped);
};


module.exports = {
  getChannelRequests,
  approveRequest,
  rejectRequest,
  getAllChannelRequests,
  getAllUsers,
  getAllChannels,
  getAllPodcasts,
  getAllEpisodes
};
