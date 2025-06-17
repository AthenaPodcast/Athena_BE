const {
  getLatestEpisodes,
  getHomeRecommendations,
  getPopularChannels,
  getRecentlyPlayed,
  getTopCategories
} = require('../models/home.model');

const getHomeData = async (req, res) => {
  const accountId = req.user.accountId;

  try {
    const [latestEpisodes, recommendations, popularChannels, recentlyPlayed, topCategories] =
      await Promise.all([
        getLatestEpisodes(),
        getHomeRecommendations(accountId),
        getPopularChannels(),
        getRecentlyPlayed(accountId),
        getTopCategories()
      ]);

    res.status(200).json({
      latest_episodes: latestEpisodes,
      recommendations,
      popular_channels: popularChannels,
      recently_played: recentlyPlayed,
      top_categories: topCategories
    });
  } catch (err) {
    console.error('Error fetching home data:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { getHomeData };
