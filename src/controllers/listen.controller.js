const { saveOrUpdateProgress } = require('../models/listen.model');
const { getProgress } = require('../models/listen.model');
const { getRecentlyPlayedEpisodes } = require('../models/listen.model');

// POST /api/episodes/:id/progress
exports.saveProgress = async (req, res) => {
  const accountId = req.user.accountId;
  const episodeId = parseInt(req.params.id, 10);
  const { progress } = req.body;

  if (!episodeId || isNaN(episodeId)) {
    return res.status(400).json({ message: 'Invalid episode ID' });
  }

  if (typeof progress !== 'number' || progress < 0) {
    return res.status(400).json({ message: 'Progress must be a non-negative number' });
  }

  try {
    await saveOrUpdateProgress(accountId, episodeId, progress);
    res.status(200).json({ message: 'Progress saved successfully' });
  } catch (err) {
    console.error('Progress save error:', err);
    res.status(500).json({ message: 'Failed to save progress' });
  }
};

// GET /api/episodes/:id/progress
exports.getProgress = async (req, res) => {
  const accountId = req.user.accountId;
  const episodeId = parseInt(req.params.id, 10);

  if (!episodeId || isNaN(episodeId)) {
    return res.status(400).json({ message: 'Invalid episode ID' });
  }

  try {
    const progressData = await getProgress(accountId, episodeId);

    if (!progressData) {
      return res.status(200).json({ progress: 0 }); // default if none found
    }

    return res.status(200).json({ progress: progressData.progress });
  } catch (err) {
    console.error('Get progress error:', err);
    res.status(500).json({ message: 'Server error getting progress' });
  }
};

// GET /api/recently-played
exports.getRecentlyPlayed = async (req, res) => {
    const accountId = req.user.accountId;
  
    try {
      const episodes = await getRecentlyPlayedEpisodes(accountId);
      res.status(200).json({ episodes });
    } catch (err) {
      console.error('Recently Played fetch error:', err);
      res.status(500).json({ message: 'Failed to fetch recently played episodes' });
    }
  };

