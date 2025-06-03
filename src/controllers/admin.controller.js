const pool = require('../../db');

const {
  getPendingRequests,
  updateRequestStatus,
  updateAccountToChannel,
  getAllRequestsGrouped 
} = require('../models/channelRequest.model');

const {
  getAllUsers: fetchAllUsers,
  getAllChannels: fetchAllChannels,
  getAllPodcasts: fetchAllPodcasts,
  getAllEpisodes: fetchAllEpisodes,
  getUserDetailsById,
  getChannelDetailsById,
  getPodcastDetailsById,
  getEpisodeDetailsById,
  deleteUserById,
  deleteChannelById,
  deletePodcastById,
  deleteEpisodeById,
  getChannelOwnerSummaryById,
  getEpisodeScriptById,
  deleteReviewById,
  getAdminProfileById
} = require('../models/admin.model');

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
  try {
    const users = await fetchAllUsers();
    res.json(users);
  } catch (err) {
    console.error('Error in getAllUsers:', err);
    res.status(500).json({ message: 'Failed to fetch users', error: err.message });
  }
};

const getAllChannels = async (req, res) => {
  try {
    const result = await fetchAllChannels();    
    res.json(result);
  } catch(err){
    console.error('Error in getAllChannels:', err);
    res.status(500).json({ message: 'Failed to fetch channels', error: err.message });
  }
};

const getAllPodcasts = async (req, res) => {
  try{
    const result = await fetchAllPodcasts();
    res.json(result);
  } catch (err){
    console.error('Error in getAllPodcasts:', err);
    res.status(500).json({ message: 'Failed to fetch podcasts', error: err.message });
  }
};

const getAllEpisodes = async (req, res) => {
  try {
      const result = await fetchAllEpisodes();
      res.json(result);
    } catch (err) {
      console.error('Error in getAllEpisodes:', err);
      res.status(500).json({ message: 'Failed to fetch episodes', error: err.message });
    }
};

const getUserDetails = async (req, res) => {
  try {
    const result = await getUserDetailsById(req.params.id);
    if (!result) return res.status(404).json({ message: 'User not found' });
    res.json(result);
  } catch (err) {
    console.error('Error in getUserDetails:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getChannelDetails = async (req, res) => {
  try {
    const result = await getChannelDetailsById(req.params.id);
    if (!result) {
      return res.status(404).json({ message: 'Channel not found' });
    }
    res.json(result);
  } catch (err) {
    console.error('Error in getChannelDetails:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getPodcastDetails = async (req, res) => {
  try {
    const result = await getPodcastDetailsById(req.params.id);
    if (!result) {
      return res.status(404).json({ message: 'Podcast not found' });
    }
    res.json(result);
  } catch (err) {
    console.error('Error in getPodcastDetails:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getEpisodeDetails = async (req, res) => {
  try {
    const result = await getEpisodeDetailsById(req.params.id);
    if (!result) {
      return res.status(404).json({ message: 'Episode not found' });
    }
    res.json(result);
  } catch (err) {
    console.error('Error in getEpisodeDetails:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const deleted = await deleteUserById(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'User not found or not a regular account' });
    }
    res.json({ message: 'User account deleted successfully' });
  } catch (err) {
    console.error('Error in deleteUser:', err);
    res.status(500).json({ message: 'Failed to delete user', error: err.message });
  }
};

const deleteChannel = async (req, res) => {
  try {
    const deleted = await deleteChannelById(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Channel not found' });
    }
    res.json({ message: 'Channel and all related data deleted successfully' });
  } catch (err) {
    console.error('Error in deleteChannel:', err);
    res.status(500).json({ message: 'Failed to delete channel', error: err.message });
  }
};

const deletePodcast = async (req, res) => {
  try {
    const deleted = await deletePodcastById(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Podcast not found' });
    }
    res.json({ message: 'Podcast and all related data deleted successfully' });
  } catch (err) {
    console.error('Error in deletePodcast:', err);
    res.status(500).json({ message: 'Failed to delete podcast', error: err.message });
  }
};

const deleteEpisode = async (req, res) => {
  try {
    const result = await deleteEpisodeById(req.params.id);
    if (!result) {
      return res.status(404).json({ message: 'Episode not found' });
    }
    res.json({ message: 'Episode and related data deleted successfully' });
  } catch (err) {
    console.error('Error in deleteEpisode:', err);
    res.status(500).json({ message: 'Failed to delete episode', error: err.message });
  }
};

const getChannelOwnerSummary = async (req, res) => {
  try {
    const result = await getChannelOwnerSummaryById(req.params.id);
    if (result.error === 'not_found') {
      return res.status(404).json({ message: 'Channel not found' });
    }
    if (result.error === 'owner_not_found') {
      return res.status(404).json({ message: 'Owner profile not found for this channel' });
    }
    if (result.error === 'incomplete') {
      return res.status(400).json({ message: 'Owner profile is incomplete for this channel.' });
    }
    res.json({ summary: result.summary });
  } catch (err) {
    console.error('Error in getChannelOwnerSummary:', err);
    res.status(500).json({ message: 'Failed to get channel owner summary', error: err.message });
  }
};

const getEpisodeScript = async (req, res) => {
  try {
    const script = await getEpisodeScriptById(req.params.id);
    if (!script) {
      return res.status(404).json({ message: 'Episode not found' });
    }
    res.json({ script });
  } catch (err) {
    console.error('Error in getEpisodeScript:', err);
    res.status(500).json({ message: 'Failed to get script', error: err.message });
  }
};

const deleteReview = async (req, res) => {
  try {
    const deleted = await deleteReviewById(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Review not found' });
    }
    res.json({ message: 'Review deleted successfully' });
  } catch (err) {
    console.error('Error in deleteReview:', err);
    res.status(500).json({ message: 'Failed to delete review', error: err.message });
  }
};

const getAdminProfile = async (req, res) => {
  try {
    const adminId = req.user.accountId;
    const profile = await getAdminProfileById(adminId);
    if (!profile) {
      return res.status(404).json({ message: 'Admin profile not found' });
    }
    res.json(profile);
  } catch (err) {
    console.error('Error in getAdminProfile:', err);
    res.status(500).json({ message: 'Failed to fetch admin profile' });
  }
};

module.exports = {
  getChannelRequests,
  approveRequest,
  rejectRequest,
  getAllChannelRequests,
  getAllUsers,
  getAllChannels,
  getAllPodcasts,
  getAllEpisodes,
  getUserDetails,
  getChannelDetails,
  getPodcastDetails,
  getEpisodeDetails,
  deleteUser,
  deleteChannel,
  deletePodcast,
  deleteEpisode,
  getChannelOwnerSummary,
  getEpisodeScript,
  deleteReview,
  getAdminProfile
};
