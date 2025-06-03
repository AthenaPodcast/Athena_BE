const {
  getMostLikedEpisodes,
  getMostSavedPodcasts,
  getTopListeners,
  getTopCategories,
  getAverageListeningTime,
  getMostReviewedEpisodes,
  getTopRatedEpisodes,
  getInactiveUsers,
  getNewUsers,
  getNewEpisodes,
  getInsightsSummary,
  getDashboardSummary
} = require('../models/insights.model');

const getMostLikedEpisodesHandler = async (req, res) => {
  try {
    const result = await getMostLikedEpisodes();
    res.json(result);
  } catch (err) {
    console.error('Error in getMostLikedEpisodes:', err);
    res.status(500).json({ message: 'Failed to get most liked episodes' });
  }
};

const getMostSavedPodcastsHandler = async (req, res) => {
  try {
    const result = await getMostSavedPodcasts();
    res.json(result);
  } catch (err) {
    console.error('Error in getMostSavedPodcasts:', err);
    res.status(500).json({ message: 'Failed to get most saved podcasts' });
  }
};

const getTopListenersHandler = async (req, res) => {
  try {
    const result = await getTopListeners();
    res.json(result);
  } catch (err) {
    console.error('Error in getTopListeners:', err);
    res.status(500).json({ message: 'Failed to get top listeners' });
  }
};

const getTopCategoriesHandler = async (req, res) => {
  try {
    const result = await getTopCategories();
    res.json(result);
  } catch (err) {
    console.error('Error in getTopCategories:', err);
    res.status(500).json({ message: 'Failed to get top categories', error: err.message });
  }
};

const getAverageListeningTimeHandler = async (req, res) => {
  try {
    const result = await getAverageListeningTime();
    res.json(result);
  } catch (err) {
    console.error('Error in getAverageListeningTime:', err);
    res.status(500).json({ message: 'Failed to calculate average listening time', error: err.message });
  }
};

const getMostReviewedEpisodesHandler  = async (req, res) => {
  try {
    const result = await getMostReviewedEpisodes();
    res.json(result);
  } catch (err) {
    console.error('Error in getMostReviewedEpisodes:', err);
    res.status(500).json({ message: 'Failed to get most reviewed episodes' });
  }
};

const getTopRatedEpisodesHandler  = async (req, res) => {
  try {
    const result = await getTopRatedEpisodes();
    res.json(result);
  } catch (err) {
    console.error('Error in getTopRatedEpisodes:', err);
    res.status(500).json({ message: 'Failed to get top rated episodes' });
  }
};

const getInactiveUsersHandler  = async (req, res) => {
  try {
    const result = await getInactiveUsers();
    res.json(result);
  } catch (err) {
    console.error('Error in getInactiveUsers:', err);
    res.status(500).json({ message: 'Failed to get inactive users' });
  }
};

const getNewUsersHandler = async (req, res) => {
  try {
    const result = await getNewUsers();
    res.json(result);
  } catch (err) {
    console.error('Error in getNewUsers:', err);
    res.status(500).json({ message: 'Failed to get new users', error: err.message });
  }
};

const getNewEpisodesHandler = async (req, res) => {
  try {
    const result = await getNewEpisodes();
    res.json(result);
  } catch (err) {
    console.error('Error in getNewEpisodes:', err);
    res.status(500).json({ message: 'Failed to get new episodes', error: err.message });
  }
};

const getInsightsSummaryHandler = async (req, res) => {
  try {
    const result = await getInsightsSummary();
    res.json(result);
  } catch (err) {
    console.error('Error in getInsightsSummary:', err);
    res.status(500).json({ message: 'Failed to load summary insights', error: err.message });
  }
};

const getDashboardSummaryHandler = async (req, res) => {
  try {
    const result = await getDashboardSummary();
    res.json(result);
  } catch (err) {
    console.error('Error in getDashboardSummary:', err);
    res.status(500).json({ message: 'Failed to load dashboard summary', error: err.message });
  }
};

module.exports = {
    getMostLikedEpisodes: getMostLikedEpisodesHandler,
    getMostSavedPodcasts: getMostSavedPodcastsHandler,
    getTopListeners: getTopListenersHandler,
    getTopCategories: getTopCategoriesHandler,
    getAverageListeningTime: getAverageListeningTimeHandler,
    getMostReviewedEpisodes,
    getTopRatedEpisodes,
    getInactiveUsers,
    getNewUsers,
    getNewEpisodes,
    getInsightsSummary,
    getDashboardSummary,
    getMostReviewedEpisodes: getMostReviewedEpisodesHandler,
    getTopRatedEpisodes: getTopRatedEpisodesHandler,
    getInactiveUsers: getInactiveUsersHandler,
    getNewUsers: getNewUsersHandler,
    getNewEpisodes: getNewEpisodesHandler, 
    getInsightsSummary: getInsightsSummaryHandler,
    getDashboardSummary: getDashboardSummaryHandler
};