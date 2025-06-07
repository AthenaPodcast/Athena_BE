const pool = require('../../db');
const ReviewModel = require('../models/review.model');
const { isInappropriate } = require('../utils/moderate');
const { isBlacklisted } = require('../utils/isBlacklisted');

const submitReview = async (req, res) => {
  const { rating, comment } = req.body;
  const episodeId = parseInt(req.params.episodeId);
  const accountId = req.user.accountId;

  if (!episodeId || !rating || !comment) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  const episodeCheck = await pool.query(
    'SELECT id FROM episodes WHERE id = $1',
    [episodeId]
  );

  if (episodeCheck.rowCount === 0) {
    return res.status(404).json({ error: 'Episode not found' });
  }

  const flagged = await isInappropriate(comment);
  if (flagged) {
    return res.status(400).json({ error: 'Your review contains inappropriate language and cannot be submitted.' });
  }

  if (isBlacklisted(comment)) {
    return res.status(400).json({ error: 'Your review contains disrespectful language and cannot be submitted.' });
  }

  const review = await ReviewModel.create({
    episodeId,
    accountId,
    rating,
    comment
  });

  res.status(201).json({ message: 'Review submitted successfully', review });
};

module.exports = { submitReview };
