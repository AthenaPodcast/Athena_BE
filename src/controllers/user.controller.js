const { getRecommendations } = require('../services/recommendation.service');
const pool = require('../../db');

exports.getUserRecommendations = async (req, res) => {
  const userId = req.user.accountId;

  try {
    const results = await getRecommendations(userId);

    // each recommendation with its picture
    const enhanced = await Promise.all(results.map(async item => {
      const contentType = item.type;

      if (item.type === 'episode') {
        const ep = await pool.query(
          `SELECT e.picture_url, cp.created_by_admin AS is_external
          FROM episodes e 
          JOIN podcasts p ON p.id = e.podcast_id
          JOIN channelprofile cp ON cp.id = p.channel_id
          WHERE e.id = $1`,
          [item.id]
        );
        item.picture_url = ep.rows[0]?.picture_url || null;
        item.type = ep.rows[0]?.is_external ? 'external' : 'regular';
        item.content_type = 'episode';
      }

      if (item.type === 'podcast') {
        const pod = await pool.query(
          `SELECT p.picture_url, cp.created_by_admin AS is_external
           FROM podcasts p
           JOIN channelprofile cp ON cp.id = p.channel_id
           WHERE p.id = $1`,
          [item.id]
        );
        item.picture_url = pod.rows[0]?.picture_url || null;
        item.type = pod.rows[0]?.is_external ? 'external' : 'regular';
        item.content_type = 'podcast';
      }

      return item;
    }));

    res.json({ userId, recommendations: enhanced });
  } catch (err) {
    console.error('Recommendation fetch failed:', err.message);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
};
