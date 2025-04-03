const { updateProfileInfo } = require('../models/userProfile.model');
const { updateProfilePicture } = require('../models/userProfile.model');

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

const uploadProfilePicture = async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
  
    const filePath = req.file.filename;
    const accountId = req.user.accountId;
  
    try {
      await updateProfilePicture(accountId, filePath);
      res.status(200).json({ message: 'Profile picture uploaded successfully' });
    } catch (err) {
      console.error('Profile picture upload error:', err);
      res.status(500).json({ message: 'Server error uploading profile picture' });
    }
  };

module.exports = {
    completeProfile,
    uploadProfilePicture
};
  
