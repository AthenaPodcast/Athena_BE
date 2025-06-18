const pool = require('../../db');
const ExternalChannelModel = require('../models/externalChannel.model');
const ExternalPodcastModel = require('../models/externalPodcast.model');
const { getChannelsByCategories } = require('../models/channel.model');

exports.createExternalChannel = async (req, res) => {
  try {
    const adminId = req.user.accountId;
    const { name, description } = req.body;

    if (!name || !description) {
      return res.status(400).json({ error: 'Missing name or description' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Channel image is required' });
    }

    const filePath = req.file.filename;

    const channel = await ExternalChannelModel.create({ 
        admin_id: adminId,
        name, 
        description, 
        picture_url: filePath 
    });

    res.status(201).json({ message: 'Channel created successfully', channel });
  } catch (err) {
    console.error('Error creating external channel:', err);
    res.status(500).json({ error: 'Failed to create channel' });
  }
};

exports.getAllExternalChannels = async (req, res) => {
  try {
    const channels = await ExternalChannelModel.getAll();
    res.status(200).json({ channels });
  } catch (err) {
    console.error('Error fetching channels:', err);
    res.status(500).json({ error: 'Failed to fetch channels' });
  }
};

exports.getExternalChannels = async (req, res) => {
  const categoryQuery = req.query.categories;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 6;

  try {
    let data;

    if (categoryQuery) {
      const categoryIds = categoryQuery
        .split(',')
        .map(id => parseInt(id.trim()))
        .filter(id => !isNaN(id));

      if (categoryIds.length > 0) {
        data = await getChannelsByCategories(true, categoryIds, page, limit);
      }
    }

    if (!data) {
      const result = await pool.query(
        `SELECT * FROM channelprofile WHERE created_by_admin = true LIMIT $1 OFFSET $2`,
        [limit, (page - 1) * limit]
      );
      const count = await pool.query(
        `SELECT COUNT(*) FROM channelprofile WHERE created_by_admin = true`
      );
      data = {
        channels: result.rows,
        total_count: parseInt(count.rows[0].count),
        total_pages: Math.ceil(count.rows[0].count / limit)
      };
    }

    res.status(200).json({
      page,
      limit,
      total_pages: data.total_pages,
      total_count: data.total_count,
      channels: data.channels
    });
  } catch (err) {
    console.error('Error fetching external channels:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getExternalChannelById = async (req, res) => {
  try {
    const id = req.params.id;
    const channel = await ExternalChannelModel.getById(id);

    if (!channel) return res.status(404).json({ error: 'Channel not found' });

    res.status(200).json({ channel });
  } catch (err) {
    console.error('Error fetching channel:', err);
    res.status(500).json({ error: 'Failed to fetch channel' });
  }
};

exports.deleteExternalChannel = async (req, res) => {
  try {
    const id = req.params.id;
    const deleted = await ExternalChannelModel.deleteById(id);

    if (!deleted) return res.status(404).json({ error: 'Channel not found' });

    res.status(200).json({ message: 'Channel deleted successfully' });
  } catch (err) {
    console.error('Error deleting channel:', err);
    res.status(500).json({ error: 'Failed to delete channel' });
  }
};

exports.getPodcastsByChannelId = async (req, res) => {
  try {
    const channelId = req.params.channelId;
    const podcasts = await ExternalPodcastModel.getByChannel(channelId);
    res.status(200).json({ podcasts });
  } catch (err) {
    console.error('Error fetching podcasts:', err);
    res.status(500).json({ error: 'Failed to fetch podcasts' });
  }
};

exports.createPodcastUnderChannel = async (req, res) => {
  try {
    const channelId = req.params.channelId;
    const { name, description } = req.body;
    const category_ids = JSON.parse(req.body.category_ids || '[]');

    if (!name || !description || !Array.isArray(category_ids) || category_ids.length === 0 || !req.file) {
      return res.status(400).json({ error: 'Missing required podcast fields or image file' });
    }

    const picture_url = req.file.filename;

    const { rows: validCategories } = await pool.query(
        `SELECT id FROM categories WHERE id = ANY($1::int[])`,
        [category_ids]
    );

    if (validCategories.length !== category_ids.length) {
      return res.status(400).json({ error: 'Some category IDs are invalid' });
    }
   
    const podcast = await ExternalPodcastModel.create({
      channel_id: channelId,
      name,
      description,
      picture_url,
      category_ids 
    });

    res.status(201).json({ message: 'Podcast created', podcast });
  } catch (err) {
    console.error('Error creating podcast:', err);
    res.status(500).json({ error: 'Failed to create podcast' });
  }
};
