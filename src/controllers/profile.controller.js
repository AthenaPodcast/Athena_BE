const { 
  updateProfileInfo,
  updateProfilePicture,
  insertUserInterests,
  deleteUserInterests,
  markProfileComplete
} = require('../models/userProfile.model');

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

const saveUserInterests = async (req, res) => {
    const accountId = req.user.accountId;
    const { interests } = req.body;
  
    if (!Array.isArray(interests) || interests.length === 0) {
      return res.status(400).json({ message: 'Please provide at least one interest' });
    }
  
    try {
      // Clear previous interests (good for overwrite)
      await deleteUserInterests(accountId);
  
      // Insert new ones
      await insertUserInterests(accountId, interests);
  
      await markProfileComplete(accountId);
      res.status(200).json({ message: 'Interests saved successfully' });
    } catch (err) {
      console.error('Error saving interests:', err);
      res.status(500).json({ message: 'Server error saving interests' });
    }
};

const isProfileComplete = async (req, res) => {
  const accountId = req.user.accountId;

  try {
    const result = await pool.query(
      `SELECT is_profile_complete FROM UserProfile WHERE account_id = $1`,
      [accountId]
    );

    const complete = result.rows[0]?.is_profile_complete || false;
    res.status(200).json({ isComplete: complete });
  } catch (err) {
    console.error('Error checking profile status:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
    completeProfile,
    uploadProfilePicture,
    saveUserInterests,
    isProfileComplete
};
  
