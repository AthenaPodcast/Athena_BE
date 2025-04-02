const { updateProfileInfo } = require('../models/userProfile.model');

const completeProfile = async (req, res) => {
  const { gender, dateOfBirth } = req.body;
  const accountId = req.user.accountId;

  try {
    if (!gender && !dateOfBirth) {
      return res.status(400).json({ message: 'No data provided' });
    }

    let age = null;
    if (dateOfBirth) {
      const birthDate = new Date(dateOfBirth);
      const today = new Date();
      age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
    }

    await updateProfileInfo(accountId, gender, age);

    res.status(200).json({ message: 'Profile updated successfully' });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ message: 'Server error updating profile' });
  }
};

module.exports = { completeProfile };
