const { getRecommendations } = require('../services/recommendation.service');

exports.getUserRecommendations = async (req, res) => {
  const userId = req.user.accountId;

  try {
    const results = await getRecommendations(userId);
    res.json({ userId, recommendations: results });
  } catch (err) {
    console.error('Recommendation fetch failed:', err.message);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
};
