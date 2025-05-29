const pool = require('../../db');

const AdPlayLogModel = {
  async logPlay(ad_campaign_id, episode_id, user_id) {
    const result = await pool.query(
      `INSERT INTO ad_play_logs (ad_campaign_id, episode_id, user_id)
       VALUES ($1, $2, $3) RETURNING *`,
      [ad_campaign_id, episode_id, user_id]
    );
    return result.rows[0];
  },

  async getCategoriesByEpisode(episodeId) {
    const res = await pool.query(
      `SELECT pc.category_id
       FROM episodes e
       JOIN podcasts p ON e.podcast_id = p.id
       JOIN podcastcategory pc ON pc.podcast_id = p.id
       WHERE e.id = $1`,
      [episodeId]
    );
    return res.rows.map(row => row.category_id);
  },

  async getMatchingAdCampaign(categoryIds, user_id) {
    const result = await pool.query(
      `SELECT *
       FROM ad_campaigns
       WHERE active = true
       AND (target_category_id IS NULL OR target_category_id = ANY($1::int[]))
       AND (start_date IS NULL OR CURRENT_DATE >= start_date)
       AND (end_date IS NULL OR CURRENT_DATE <= end_date)
       AND id NOT IN (
         SELECT ad_campaign_id FROM ad_play_logs
         WHERE user_id = $2
         AND DATE_TRUNC('month', played_at) = DATE_TRUNC('month', CURRENT_DATE)
         GROUP BY ad_campaign_id
         HAVING COUNT(*) >= (
           SELECT max_per_month FROM ad_campaigns WHERE ad_campaigns.id = ad_play_logs.ad_campaign_id
         )
       )
       ORDER BY RANDOM()
       LIMIT 1`,
      [categoryIds, user_id]
    );
    return result.rows[0] || null;
  },

  async getTopAds() {
    const result = await pool.query(`
      SELECT ac.id, ac.advertiser_name, COUNT(al.id) AS play_count
      FROM ad_campaigns ac
      LEFT JOIN ad_play_logs al ON ac.id = al.ad_campaign_id
      GROUP BY ac.id
      ORDER BY play_count DESC
      LIMIT 5;
    `);
    return result.rows;
  },

  async getMonthlyPlayCounts() {
    const result = await pool.query(`
      SELECT TO_CHAR(played_at, 'YYYY-MM') AS month, COUNT(*) AS count
      FROM ad_play_logs
      GROUP BY month
      ORDER BY month;
    `);
    return result.rows;
  },

  async getCampaignSummary(ad_campaign_id) {
    const result = await pool.query(
      `SELECT COUNT(*) AS total_plays, COUNT(DISTINCT user_id) AS unique_users
       FROM ad_play_logs
       WHERE ad_campaign_id = $1`,
      [ad_campaign_id]
    );
    return result.rows[0];
  }
};

module.exports = AdPlayLogModel;
