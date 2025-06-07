const pool = require('../../db');

const ReviewModel = {
  async create({ episodeId, accountId, rating, comment }) {
    const result = await pool.query(
      `INSERT INTO reviews (episode_id, account_id, rating, comment_text, created_at)
       VALUES ($1, $2, $3, $4, NOW()) RETURNING *`,
      [episodeId, accountId, rating, comment]
    );
    return result.rows[0];
  },

  async getByEpisodeId(episodeId) {
    const result = await pool.query(`
      SELECT r.id, r.comment_text, r.rating, r.created_at,
             a.id AS account_id, a.account_type,
             up.first_name, up.last_name
      FROM reviews r
      JOIN accounts a ON a.id = r.account_id
      JOIN userprofile up ON up.account_id = a.id
      WHERE r.episode_id = $1
      ORDER BY r.created_at DESC
    `, [episodeId]);

    return result.rows;
  },

  async getByIdAndAccount(reviewId, accountId) {
    const result = await pool.query(
      'SELECT * FROM reviews WHERE id = $1 AND account_id = $2',
      [reviewId, accountId]
    );
    return result.rows[0];
  },

  async deleteById(reviewId) {
    await pool.query('DELETE FROM reviews WHERE id = $1', [reviewId]);
  }
};

module.exports = ReviewModel;