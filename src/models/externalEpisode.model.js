const pool = require('../../db');

const ExternalEpisodeModel = {
  async create({ podcast_id, name, description, audio_url, language, picture_url, release_date, duration }) {
    const result = await pool.query(
      `INSERT INTO episodes 
        (podcast_id, name, description, audio_url, language, picture_url, release_date, duration)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        podcast_id,
        name,
        description,
        audio_url,
        language,
        picture_url,
        release_date,
        duration
      ]
    );
    return result.rows[0];
  },

  async getByPodcastId(podcast_id) {
    const result = await pool.query(
      `SELECT id, name, audio_url, duration, release_date
       FROM episodes WHERE podcast_id = $1
       ORDER BY release_date DESC`,
      [podcast_id]
    );
    return result.rows;
  },

  async getById(id) {
    const result = await pool.query(`SELECT * FROM episodes WHERE id = $1`, [id]);
    return result.rows[0] || null;
  },

  async deleteById(id) {
    const result = await pool.query(`DELETE FROM episodes WHERE id = $1 RETURNING *`, [id]);
    return result.rows[0] || null;
  }
};

module.exports = ExternalEpisodeModel;
