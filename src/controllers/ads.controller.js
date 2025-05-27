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

module.exports = {
    createAdCampaign
};