const ExternalPodcastModel = require('../models/externalPodcast.model');

exports.getPodcastById = async (req, res) => {
  try {
    const podcast = await ExternalPodcastModel.getById(req.params.id);
    if (!podcast) {
      return res.status(404).json({ error: 'Podcast not found' });
    }
    res.status(200).json({ podcast });
  } catch (err) {
    console.error('Error fetching podcast by ID:', err);
    res.status(500).json({ error: 'Failed to fetch podcast' });
  }
};

exports.deletePodcastById = async (req, res) => {
  try {
    const deleted = await ExternalPodcastModel.deleteById(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Podcast not found' });
    }
    res.status(200).json({ message: 'Podcast deleted successfully' });
  } catch (err) {
    console.error('Error deleting podcast:', err);
    res.status(500).json({ error: 'Failed to delete podcast' });
  }
};

