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

const getEpisodeReviews = async (req, res) => {
  const episodeId = parseInt(req.params.episodeId);
  if (isNaN(episodeId)) {
    return res.status(400).json({ error: "Invalid episode ID" });
  }

  const reviews = await ReviewModel.getByEpisodeId(episodeId);
  res.status(200).json({ reviews });
};

const deleteReview = async (req, res) => {
  const reviewId = parseInt(req.params.reviewId);
  const accountId = req.user.accountId;

  if (isNaN(reviewId)) {
    return res.status(400).json({ error: "Invalid review ID" });
  }

  const review = await ReviewModel.getByIdAndAccount(reviewId, accountId);
  if (!review) {
    return res.status(403).json({ error: "Not authorized to delete this review" });
  }

  await ReviewModel.deleteById(reviewId);
  res.status(200).json({ message: "Review deleted successfully" });
};

module.exports = { 
    submitReview,
    getEpisodeReviews,
    deleteReview
 };
