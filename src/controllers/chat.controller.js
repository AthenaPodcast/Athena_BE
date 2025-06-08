const { getEpisodeById, getPreviousEpisode } = require('../models/episode.model');
const { getRecommendations } = require('../services/recommendation.service');
const { buildPrompt } = require('../utils/prompts');
const { callGpt } = require('../utils/gpt');

const chatWithEpisode = async (req, res) => {
  const { episodeId } = req.params;
  const { action, message, targetLanguage, timestamp } = req.body;

  try {
    const episode = await getEpisodeById(episodeId);
    if (!episode) return res.status(404).json({ success: false, error: 'Episode not found' });
    
    const userId = req.user.accountId;
    if (message?.toLowerCase().includes('recommend')) {
        const results = await getRecommendations(userId);
        const cleaned = Array.isArray(results)
            ? results.map(r => ({ id: r.id, name: r.name, type: r.type || 'episode' }))
            : [];

        return res.json({
            success: true,
            message: cleaned.length > 0 ? "Here are some personalized recommendations for you:" : 'No recommendations found.',
            recommendations: cleaned
        });
    }

    if (!episode.script && action !== 'translate') {
      return res.json({
        success: true,
        response: "This episode doesn't have a script available yet, so I can’t summarize or answer questions."
      });
    }

    let previousEpisode = null;

    if (message?.toLowerCase().includes('differ')) {
      previousEpisode = await getPreviousEpisode(episodeId);
    }

    const prompt = buildPrompt({
      action,
      message,
      episode,
      targetLanguage,
      timestamp,
      previousEpisode
    });

    const response = await callGpt(prompt);

    res.json({ success: true, response });

  } catch (error) {
    console.error('Chatbot error:', error);
    res.status(500).json({ success: false, error: 'Internal chatbot error' });
  }
};

module.exports = { chatWithEpisode };
