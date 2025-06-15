const pool = require('../../db');

// Middleware 1: check if the user is a channel
const requireChannel = async (req, res, next) => {
  const accountId = req.user?.accountId;

  try {
    const result = await pool.query('SELECT account_type FROM accounts WHERE id = $1', [accountId]);

    if (result.rows.length === 0 || result.rows[0].account_type !== 'channel') {
      return res.status(403).json({ message: 'Access denied. Only channels can perform this action.' });
    }

    next();
  } catch (err) {
    console.error('Channel check error:', err);
    res.status(500).json({ message: 'Internal server error.' });
  }
};

// Middleware 2: check if the channel owns the podcast
const validatePodcastOwnership = async (req, res, next) => {
  const accountId = req.user?.accountId;
  const podcast_id = req.body?.podcast_id || req.params?.id;

  if (!podcast_id) {
    return res.status(400).json({ error: 'Podcast ID is required.' });
  }

  try {
    const result = await pool.query(
      'SELECT * FROM podcasts WHERE id = $1 AND channel_id = (SELECT id FROM channelprofile WHERE account_id = $2)',
      [podcast_id, accountId]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ message: 'You do not own this podcast.' });
    }

    next();
  } catch (error) {
    console.error('Podcast ownership validation error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  requireChannel,
  validatePodcastOwnership,
};
