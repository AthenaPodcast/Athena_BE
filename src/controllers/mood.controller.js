const { setUserMood, getUserMood } = require('../models/mood.model');

exports.saveUserMood = async (req, res) => {
  const accountId = req.user.accountId;
  const { mood } = req.body;

  if (!mood) {
    return res.status(400).json({ message: 'Mood is required' });
  }

  try {
    await setUserMood(accountId, mood);
    res.status(200).json({ message: 'Mood saved successfully' });
  } catch (err) {
    console.error('Error saving mood:', err);
    res.status(500).json({ message: 'Failed to save mood' });
  }
};

exports.getCurrentMood = async (req, res) => {
  const accountId = req.user.accountId;

  try {
    const mood = await getUserMood(accountId);
    res.status(200).json({ mood });
  } catch (err) {
    console.error('Error fetching mood:', err);
    res.status(500).json({ message: 'Failed to get mood' });
  }
};
