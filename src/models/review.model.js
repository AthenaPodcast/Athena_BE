const pool = require('../../db');

const ReviewModel = {
  async create({ episodeId, accountId, rating, comment }) {
    const result = await pool.query(
      `INSERT INTO reviews (episode_id, account_id, rating, comment_text, created_at)
       VALUES ($1, $2, $3, $4, NOW()) RETURNING *`,
      [episodeId, accountId, rating, comment]
    );
    return result.rows[0];
  }
};

module.exports = ReviewModel;
