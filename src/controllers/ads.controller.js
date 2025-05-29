const { streamUpload } = require('../utils/cloudinaryUpload');
const { Parser } = require('json2csv');

const AdCampaign = require('../models/adCampaign.model');
const AdPlayLog = require('../models/adPlayLog.model');

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

    const audioFile = req.file;
    if (!audioFile) {
      return res.status(400).json({ error: 'Audio file is required' });
    }

    // upload audio ad to cloudinary
    const uploadResult = await streamUpload(req.file.buffer, 'ads');
    
    const campaign = await AdCampaign.create({
      advertiser_name,
      target_category_id: target_category_id || null,
      max_per_month,
      max_per_episode,
      insert_every_minutes,
      start_date,
      end_date,
      audio_url: uploadResult.secure_url
    });

    res.status(201).json({ message: 'Ad campaign created successfully', campaign});
  } catch (err) {
    console.error('Error in createAdCampaign:', err);
    res.status(500).json({ error: 'Failed to create ad campaign' });
  }
};

const getAdForEpisode = async (req, res) => {
  try {
    const episodeId = req.params.episodeId;
    const user_id = req.user.accountId;

    const categoryIds = await AdPlayLog.getCategoriesByEpisode(episodeId);
    if (categoryIds.length === 0) {
      return res.status(404).json({ message: 'No category assigned to episode' });
    }

    // find matching ad campaign by category
    const ad = await AdPlayLog.getMatchingAdCampaign(categoryIds, user_id);
    if (!ad) {
      return res.status(404).json({ message: 'No ads available for this episode.' });
    }

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
  try {
    const { ad_campaign_id, episode_id } = req.body;
    const user_id = req.user.accountId;

    if (!ad_campaign_id || !episode_id) {
      return res.status(400).json({ error: 'ad_campaign_id and episode_id are required' });
    }
    const log = await AdPlayLog.logPlay(ad_campaign_id, episode_id, user_id);

    res.status(201).json({
      message: 'Ad play logged successfully', log });
  } catch (err) {
    console.error('Error in logAdPlay:', err);
    res.status(500).json({ error: 'Failed to log ad play' });
  }
};

const getAdAnalytics = async (req, res) => {
  try {
    const top_ads = await AdPlayLog.getTopAds();
    const monthly_play_counts = await AdPlayLog.getMonthlyPlayCounts();

    res.json({ top_ads, monthly_play_counts });
  } catch (err) {
    console.error('Error in getAdAnalytics:', err);
    res.status(500).json({ message: 'Failed to fetch ad analytics' });
  }
};

const updateAdStatus = async (req, res) => {
  try {
    const { active } = req.body;

    if (typeof active !== 'boolean') {
      return res.status(400).json({ error: 'Missing or invalid "active" in request body' });
    }

    const updated = await AdCampaign.updateStatus(req.params.id, active);
    if (!updated) {
      return res.status(404).json({ error: 'Ad campaign not found' });
    }

    res.status(200).json({
      message: 'Ad status updated successfully',
      campaign: updated,
    });
  } catch (err) {
    console.error('Error updating ad status:', err);
    res.status(500).json({ message: 'Failed to update ad status' });
  }
};

const getAdCampaignById = async (req, res) => {
  try {
    const { id } = req.params;

    // get campaign info
    const campaign = await AdCampaign.getById(id);

    if (!campaign) {
      return res.status(404).json({ message: 'Ad campaign not found' });
    }

    // get analytics summary
    const summary = await AdPlayLog.getCampaignSummary(id);

    res.json({
      campaign,
      summary: {
        ...summary,
        total_plays: parseInt(summary.total_plays),
        unique_users: parseInt(summary.unique_users),
        is_expired: campaign.end_date && new Date(campaign.end_date) < new Date()
      }
    });
  } catch (err) {
    console.error('Error in getAdCampaignById:', err);
    res.status(500).json({ message: 'Failed to fetch campaign details' });
  }
};

const deleteAdCampaign = async (req, res) => {
  try {
    const deleted = await AdCampaign.delete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    res.json({ message: 'Ad campaign deleted successfully' });
  } catch (err) {
    console.error('Error deleting ad campaign:', err);
    res.status(500).json({ message: 'Failed to delete ad campaign' });
  }
};

const updateAdCampaign = async (req, res) => {
  try {
    const updated = await AdCampaign.update(req.params.id, req.body);

    if (!updated) {
      return res.status(404).json({ message: 'Ad campaign not found' });
    }

    res.json({
      message: 'Ad campaign updated successfully',
      campaign: updated
    });
  } catch (err) {
    console.error('Error updating ad campaign:', err);
    res.status(500).json({ error: 'Failed to update ad campaign' });
  }
};

const getAllAdCampaigns = async (req, res) => {
  try {
    const campaigns = await AdCampaign.getAll();

    res.json({ message: 'Ad campaigns fetched successfully', campaigns });
  } catch (err) {
    console.error('Error fetching all ad campaigns:', err);
    res.status(500).json({ error: 'Failed to fetch ad campaigns' });
  }
};

const getAdCampaignSummary = async (req, res) => {
  try {
    const summary = await AdCampaign.getSummary();

    res.json({
      total: parseInt(summary.total),
      active: parseInt(summary.active),
      expired: parseInt(summary.expired)
    });
  } catch (err) {
    console.error('Error in getAdCampaignSummary:', err);
    res.status(500).json({ message: 'Failed to fetch ad campaign summary' });
  }
};

const exportAdInsightsToCSV = async (req, res) => {
  try {
    const campaigns  = await AdCampaign.getWithAnalytics();

    const fields = [
      'id',
      'advertiser_name',
      'audio_url',
      'max_per_month',
      'max_per_episode',
      'insert_every_minutes',
      'start_date',
      'end_date',
      'active',
      'total_plays',
      'unique_users',
      'is_expired'
    ];

    const parser = new Parser({ fields });
    const csv = parser.parse(campaigns);

    // set headers to trigger download
    res.header('Content-Type', 'text/csv');
    res.attachment('ad_insights_export.csv');
    return res.send(csv);

  } catch (err) {
    console.error('Error exporting insights:', err);
    res.status(500).json({ error: 'Failed to export ad insights' });
  }
};

const renewAdCampaign = async (req, res) => {
  try {
    const oldId = req.params.id;
    const old =  await AdCampaign.getById(oldId);

    if (!old) {
      return res.status(404).json({ error: 'Original campaign not found' });
    }
    
    const newCampaign = await AdCampaign.renew(old, req.body, oldId);

    res.status(201).json({
      message: 'Campaign renewed successfully',
      new_campaign: newCampaign
    });
  } catch (err) {
    console.error('Error renewing campaign:', err);
    res.status(500).json({ error: 'Failed to renew campaign' });
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
    updateAdCampaign,
    getAllAdCampaigns,
    getAdCampaignSummary,
    exportAdInsightsToCSV,
    renewAdCampaign
};