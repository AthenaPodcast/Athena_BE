const pool = require('../../db');

exports.getCategoryById = async (categoryId) => {
  const result = await pool.query(`SELECT id, name FROM categories WHERE id = $1`, [categoryId]);
  return result.rows[0] || null;
};

exports.getPodcastsByCategory = async (categoryId, page, limit) => {
  const offset = (page - 1) * limit;

  const data = await pool.query(`
    SELECT p.id, p.name, p.picture_url, cp.created_by_admin
    FROM podcasts p
    JOIN podcastcategory pc ON pc.podcast_id = p.id
    JOIN channelprofile cp ON cp.id = p.channel_id
    WHERE pc.category_id = $1
    ORDER BY p.created_at DESC
    LIMIT $2 OFFSET $3
  `, [categoryId, limit, offset]);

  const count = await pool.query(`
    SELECT COUNT(*) AS count
    FROM podcasts p
    JOIN podcastcategory pc ON pc.podcast_id = p.id
    WHERE pc.category_id = $1
  `, [categoryId]);

  const totalCount = parseInt(count.rows[0].count, 10);
  return {
    podcasts: data.rows.map(p => ({
      ...p,
      type: p.created_by_admin ? 'external' : 'regular'
    })),
    total_pages: Math.ceil(totalCount / limit),
    total_count: totalCount
  };
};

exports.getFeaturedEpisodesByCategory = async (categoryId) => {
  const result = await pool.query(`
    SELECT e.id, e.name, e.picture_url, cp.created_by_admin
    FROM episodes e
    JOIN podcasts p ON e.podcast_id = p.id
    JOIN channelprofile cp ON p.channel_id = cp.id
    JOIN podcastcategory pc ON pc.podcast_id = p.id
    LEFT JOIN episode_likes el ON el.episode_id = e.id AND el.liked = true
    LEFT JOIN reviews r ON r.episode_id = e.id
    WHERE pc.category_id = $1
    GROUP BY e.id, cp.created_by_admin
    ORDER BY COUNT(DISTINCT el.account_id) DESC, AVG(r.rating) DESC
    LIMIT 3
  `, [categoryId]);

  return result.rows.map(e => ({
    id: e.id,
    name: e.name,
    picture_url: e.picture_url,
    type: e.created_by_admin ? 'external' : 'regular'
  }));
};
