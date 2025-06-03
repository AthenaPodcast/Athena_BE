const pool = require('../../db');

const AdCampaignModel = {
  async create(data) {
    const result = await pool.query(
      `INSERT INTO ad_campaigns (
        advertiser_name, audio_url, target_category_id,
        max_per_month, max_per_episode, insert_every_minutes,
        start_date, end_date
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *`,
      [
        data.advertiser_name,
        data.audio_url,
        data.target_category_id || null,
        data.max_per_month,
        data.max_per_episode,
        data.insert_every_minutes,
        data.start_date || null,
        data.end_date || null
      ]
    );
    return result.rows[0];
  },

  async getAll() {
    const result = await pool.query(
      `SELECT *, (end_date IS NOT NULL AND end_date < CURRENT_DATE) AS is_expired
       FROM ad_campaigns ORDER BY created_at DESC`
    );
    return result.rows;
  },

  async getById(id) {
    const result = await pool.query(`SELECT * FROM ad_campaigns WHERE id = $1`, [id]);
    return result.rows[0] || null;
  },

  async update(id, data) {
    const result = await pool.query(
      `UPDATE ad_campaigns SET
         advertiser_name = $1,
         target_category_id = $2,
         max_per_month = $3,
         max_per_episode = $4,
         insert_every_minutes = $5,
         start_date = $6,
         end_date = $7,
         active = $8
       WHERE id = $9 RETURNING *`,
      [
        data.advertiser_name,
        data.target_category_id || null,
        data.max_per_month,
        data.max_per_episode,
        data.insert_every_minutes,
        data.start_date || null,
        data.end_date || null,
        data.active,
        id
      ]
    );
    return result.rows[0] || null;
  },

  async delete(id) {
    const result = await pool.query('DELETE FROM ad_campaigns WHERE id = $1 RETURNING *', [id]);
    return result.rows[0] || null;
  },

  async updateStatus(id, active) {
    const result = await pool.query(
      `UPDATE ad_campaigns SET active = $1 WHERE id = $2 RETURNING *`,
      [active, id]
    );
    return result.rows[0] || null;
  },

  async getSummary() {
    const result = await pool.query(`
      SELECT 
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE active = true AND (end_date IS NULL OR end_date >= CURRENT_DATE)) AS active,
        COUNT(*) FILTER (WHERE end_date IS NOT NULL AND end_date < CURRENT_DATE) AS expired
      FROM ad_campaigns
    `);
    return result.rows[0];
  },

  async renew(oldCampaign, newValues, copiedFrom) {
    const result = await pool.query(
      `INSERT INTO ad_campaigns (
        advertiser_name, audio_url, target_category_id,
        max_per_month, max_per_episode, insert_every_minutes,
        start_date, end_date, copied_from
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *`,
      [
        newValues.advertiser_name || oldCampaign.advertiser_name,
        oldCampaign.audio_url,
        newValues.target_category_id || oldCampaign.target_category_id,
        newValues.max_per_month || oldCampaign.max_per_month,
        newValues.max_per_episode || oldCampaign.max_per_episode,
        newValues.insert_every_minutes || oldCampaign.insert_every_minutes,
        newValues.start_date || null,
        newValues.end_date || null,
        copiedFrom
      ]
    );
    return result.rows[0];
  },

  async getWithAnalytics() {
    const result = await pool.query(`
      SELECT 
        ac.id, ac.advertiser_name, ac.audio_url,
        ac.max_per_month, ac.max_per_episode,
        ac.insert_every_minutes, ac.start_date, ac.end_date,
        ac.active,
        COUNT(pl.id) AS total_plays,
        COUNT(DISTINCT pl.user_id) AS unique_users,
        CASE 
          WHEN ac.end_date IS NOT NULL AND ac.end_date < CURRENT_DATE THEN 'Yes'
          ELSE 'No'
        END AS is_expired
      FROM ad_campaigns ac
      LEFT JOIN ad_play_logs pl ON pl.ad_campaign_id = ac.id
      GROUP BY ac.id
    `);
    return result.rows;
  }
};

module.exports = AdCampaignModel;
