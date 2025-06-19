const {
  getCategoryById,
  getPodcastsByCategory,
  getFeaturedEpisodesByCategory
} = require('../models/category.model');

exports.getCategoryDetail = async (req, res) => {
  const categoryId = parseInt(req.params.id);
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 6;

  try {
    const category = await getCategoryById(categoryId);
    if (!category) return res.status(404).json({ message: 'Category not found' });

    const podcastData = await getPodcastsByCategory(categoryId, page, limit);
    const featuredEpisodes = await getFeaturedEpisodesByCategory(categoryId);

    res.json({
      category_id: category.id,
      category_name: category.name,
      page,
      limit,
      total_pages: podcastData.total_pages,
      total_count: podcastData.total_count,
      podcasts: podcastData.podcasts,
      featured_episodes: featuredEpisodes
    });
  } catch (err) {
    console.error('Error fetching category detail:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
