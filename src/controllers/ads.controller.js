const pool = require('../../db');
const { streamUpload } = require('../utils/cloudinaryUpload');

const createAdCampaign = async (req, res) => {
  try {
    const {
      advertiser_name,
      target_category_id,
      max_per_month,
      max_per_episode,
      insert_every_minutes,
      start_date,
      end_date
    } = req.body;

    const toIntOrNull = (v) => v === '' ? null : parseInt(v);

    const categoryId = toIntOrNull(target_category_id);
    const maxMonth = toIntOrNull(max_per_month);
    const maxEpisode = toIntOrNull(max_per_episode);
    const insertMinutes = toIntOrNull(insert_every_minutes);


    const audioFile = req.file;
    if (!audioFile) {
      return res.status(400).json({ error: 'Audio file is required' });
    }

    // upload audio ad to cloudinary
    const uploadResult = await streamUpload(req.file.buffer, 'ads');
    const audio_url = uploadResult.secure_url;

    const result = await pool.query(
      `INSERT INTO ad_campaigns (advertiser_name, audio_url, target_category_id,
       max_per_month, max_per_episode, insert_every_minutes, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        advertiser_name,
        audio_url,
        categoryId,
        maxMonth,
        maxEpisode,
        insertMinutes,
        start_date || null, 
        end_date || null
      ]
    );

    res.status(201).json({
      message: 'Ad campaign created successfully',
      campaign: result.rows[0]
    });
  } catch (err) {
    console.error('Error in createAdCampaign:', err);
    res.status(500).json({ error: 'Failed to create ad campaign' });
  }
};

const getAdForEpisode = async (req, res) => {
  const episodeId = req.params.episodeId;
  const user_id = req.user.accountId;

  try {
    // get categories of the episode's podcast
    const categoryRes = await pool.query(
      `SELECT pc.category_id
       FROM episodes e
       JOIN podcasts p ON e.podcast_id = p.id
       JOIN podcastcategory pc ON pc.podcast_id = p.id
       WHERE e.id = $1`,
      [episodeId]
    );

    const categoryIds = categoryRes.rows.map(row => row.category_id);
    if (categoryIds.length === 0) {
      return res.status(404).json({ message: 'No category assigned to episode' });
    }

    // find matching ad campaign by category
    const adRes = await pool.query(
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

    if (adRes.rows.length === 0) {
      return res.status(404).json({ message: 'No ads available for this episode.' });
    }

    const ad = adRes.rows[0];

    res.json({
      ad_campaign_id: ad.id,
      audio_url: ad.audio_url,
      insert_every_minutes: ad.insert_every_minutes,
      max_per_episode: ad.max_per_episode
    });

  } catch (err) {
    console.error('Error in getAdForEpisode:', err);
    res.status(500).json({ error: 'Failed to fetch ad for episode' });
  }
};

const logAdPlay = async (req, res) => {
  const { ad_campaign_id, episode_id } = req.body;
  const user_id = req.user.accountId;

  if (!ad_campaign_id || !episode_id) {
    return res.status(400).json({ error: 'ad_campaign_id and episode_id are required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO ad_play_logs (ad_campaign_id, episode_id, user_id)
       VALUES ($1, $2, $3) RETURNING *`,
      [ad_campaign_id, episode_id, user_id]
    );

    res.status(201).json({
      message: 'Ad play logged successfully',
      log: result.rows[0]
    });
  } catch (err) {
    console.error('Error in logAdPlay:', err);
    res.status(500).json({ error: 'Failed to log ad play' });
  }
};

const getAdAnalytics = async (req, res) => {
  try {
    const topAdsResult = await pool.query(`
      SELECT ac.id, ac.advertiser_name, COUNT(al.id) AS play_count
      FROM ad_campaigns ac
      LEFT JOIN ad_play_logs al ON ac.id = al.ad_campaign_id
      GROUP BY ac.id
      ORDER BY play_count DESC
      LIMIT 5;
    `);

    const monthlyCountsResult = await pool.query(`
      SELECT TO_CHAR(played_at, 'YYYY-MM') AS month, COUNT(*) AS count
      FROM ad_play_logs
      GROUP BY month
      ORDER BY month;
    `);

    res.json({
      top_ads: topAdsResult.rows,
      monthly_play_counts: monthlyCountsResult.rows
    });
  } catch (err) {
    console.error('Error in getAdAnalytics:', err);
    res.status(500).json({ message: 'Failed to fetch ad analytics' });
  }
};

const updateAdStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { active } = req.body;

    if (typeof active !== 'boolean') {
      return res.status(400).json({ error: 'Missing or invalid "active" in request body' });
    }

    const result = await pool.query(
      `UPDATE ad_campaigns SET active = $1 WHERE id = $2 RETURNING *`,
      [active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ad campaign not found' });
    }

    res.status(200).json({
      message: 'Ad status updated successfully',
      campaign: result.rows[0],
    });
  } catch (err) {
    console.error('Error updating ad status:', err);
    res.status(500).json({ message: 'Failed to update ad status' });
  }
};

const getAdCampaignById = async (req, res) => {
  const { id } = req.params;

  try {
    // get campaign info
    const campaignRes = await pool.query(
      `SELECT * FROM ad_campaigns WHERE id = $1`,
      [id]
    );

    if (campaignRes.rows.length === 0) {
      return res.status(404).json({ message: 'Ad campaign not found' });
    }

    const campaign = campaignRes.rows[0];

    // get analytics summary
    const summaryRes = await pool.query(
      `SELECT COUNT(*) AS total_plays, COUNT(DISTINCT user_id) AS unique_users
       FROM ad_play_logs
       WHERE ad_campaign_id = $1`,
      [id]
    );

    const { total_plays, unique_users } = summaryRes.rows[0];

    res.json({
      campaign,
      summary: {
        total_plays: parseInt(total_plays),
        unique_users: parseInt(unique_users),
        is_expired: campaign.end_date && new Date(campaign.end_date) < new Date()
      }
    });
  } catch (err) {
    console.error('Error in getAdCampaignById:', err);
    res.status(500).json({ message: 'Failed to fetch campaign details' });
  }
};

const deleteAdCampaign = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query('DELETE FROM ad_campaigns WHERE id = $1 RETURNING *', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    res.json({ message: 'Ad campaign deleted successfully' });
  } catch (err) {
    console.error('Error deleting ad campaign:', err);
    res.status(500).json({ message: 'Failed to delete ad campaign' });
  }
};

const updateAdCampaign = async (req, res) => {
  const { id } = req.params;
  const {
    advertiser_name,
    target_category_id,
    max_per_month,
    max_per_episode,
    insert_every_minutes,
    start_date,
    end_date,
    active
  } = req.body;

  try {
    const result = await pool.query(
      `UPDATE ad_campaigns
       SET advertiser_name = $1,
           target_category_id = $2,
           max_per_month = $3,
           max_per_episode = $4,
           insert_every_minutes = $5,
           start_date = $6,
           end_date = $7,
           active = $8
       WHERE id = $9
       RETURNING *`,
      [
        advertiser_name,
        target_category_id || null,
        max_per_month,
        max_per_episode,
        insert_every_minutes,
        start_date || null,
        end_date || null,
        active,
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Ad campaign not found' });
    }

    res.json({
      message: 'Ad campaign updated successfully',
      campaign: result.rows[0]
    });
  } catch (err) {
    console.error('Error updating ad campaign:', err);
    res.status(500).json({ error: 'Failed to update ad campaign' });
  }
};


module.exports = {
    createAdCampaign,
    getAdForEpisode,
    logAdPlay,
    getAdAnalytics,
    updateAdStatus,
    getAdCampaignById,
    deleteAdCampaign,
    updateAdCampaign
};