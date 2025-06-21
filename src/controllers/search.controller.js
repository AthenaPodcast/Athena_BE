const { searchAll, getSuggestions } = require('../models/search.model');

exports.searchHandler = async (req, res) => {
  const query = req.query.query || req.query.q || '';
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  const categories = req.query.categories
    ? req.query.categories.split(',').map(c => parseInt(c.trim())).filter(c => !isNaN(c))
    : [];

  const languages = req.query.languages
    ? req.query.languages.split(',').map(l => l.trim()).filter(l => !!l)
    : [];

  try {
    const data = await searchAll({ query, categories, languages, page, limit });
    res.json(data);
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ message: 'Server error during search' });
  }
};

exports.getSearchSuggestions = async (req, res) => {
  const query = req.query.query || req.query.q || '';
  if (!query || query.trim() === '') {
    return res.status(400).json({ error: 'Query parameter (q) is required' });
  }

  try {
    const suggestions = await getSuggestions(query.trim());
    res.json(suggestions);
  } catch (err) {
    console.error('Suggestion fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
};
