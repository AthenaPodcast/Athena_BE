const { getRecommendations } = require('../services/recommendation.service');
const pool = require('../../db');

exports.getUserRecommendations = async (req, res) => {
  const userId = req.user.accountId;

  try {
    const results = await getRecommendations(userId);

    // each recommendation with its picture
    const enhanced = await Promise.all(results.map(async item => {
      if (item.type === 'episode') {
        const ep = await pool.query(
          `SELECT picture_url FROM episodes WHERE id = $1`,
          [item.id]
        );
        item.picture_url = ep.rows[0]?.picture_url || null;
      }

      if (item.type === 'podcast') {
        const pod = await pool.query(
          `SELECT picture_url FROM podcasts WHERE id = $1`,
          [item.id]
        );
        item.picture_url = pod.rows[0]?.picture_url || null;
      }

      return item;
    }));

    res.json({ userId, recommendations: enhanced });
  } catch (err) {
    console.error('Recommendation fetch failed:', err.message);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
};
