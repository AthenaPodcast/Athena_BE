const pool = require('../../db');
const { streamUpload } = require('../utils/cloudinaryUpload');

const createAdCampaign = async (req, res) => {
  try {
    const {
      advertiser_name,
      target_category_id,
      max_per_month,
      max_per_episode,
      insert_every_minutes
    } = req.body;

    const audioFile = req.file;
    if (!audioFile) {
      return res.status(400).json({ error: 'Audio file is required' });
    }

    // upload audio ad to cloudinary
    const uploadResult = await streamUpload(req.file.buffer, 'ads');
    const audio_url = uploadResult.secure_url;

    const result = await pool.query(
      `INSERT INTO ad_campaigns (advertiser_name, audio_url, target_category_id,
       max_per_month, max_per_episode, insert_every_minutes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        advertiser_name,
        audio_url,
        target_category_id,
        max_per_month,
        max_per_episode,
        insert_every_minutes
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
       WHERE target_category_id = ANY($1::int[])
       ORDER BY RANDOM()
       LIMIT 1`,
      [categoryIds]
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

module.exports = {
    createAdCampaign,
    getAdForEpisode
};