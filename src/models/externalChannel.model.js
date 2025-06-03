const pool = require('../../db');

const ExternalChannelModel = {
  async create({ admin_id, name, description, picture_url }) {
    const result = await pool.query(
      `INSERT INTO channelprofile (
         account_id, channel_name, channel_description, channel_picture, created_by_admin
       ) VALUES ($1, $2, $3, $4, true)
       RETURNING *`,
      [admin_id, name, description, picture_url]
    );
    return result.rows[0];
  },

  // channels created by admin (external channels)
  async getAll() {
    const result = await pool.query(
      `SELECT * FROM channelprofile
       WHERE created_by_admin = true
       ORDER BY channel_name`
    );
    return result.rows;
  },

  async getById(id) {
    const result = await pool.query(
      `SELECT * FROM channelprofile
       WHERE id = $1 AND created_by_admin = true`,
      [id]
    );
    return result.rows[0];
  },

  async deleteById(id) {
    const result = await pool.query(
      `DELETE FROM channelprofile
       WHERE id = $1 AND created_by_admin = true
       RETURNING *`,
      [id]
    );
    return result.rows[0];
  }
};

module.exports = ExternalChannelModel;
