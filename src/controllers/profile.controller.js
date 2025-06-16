const bcrypt = require('bcrypt');
const pool = require('../../db');

const { 
  updateProfileInfo,
  updateProfilePicture,
  insertUserInterests,
  deleteUserInterests,
  markProfileComplete,
  getFullProfileInfo,
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

    await updateProfileInfo(accountId, gender, age, dateOfBirth);

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

const getUserProfile = async (req, res) => {
  const accountId = req.user.accountId;

  try {
    const data = await getFullProfileInfo(accountId);

    if (!data) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    res.status(200).json({
      full_name: `${data.first_name} ${data.last_name}`,
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      phone: data.phone,
      profile_picture: data.profile_picture,
      gender: data.gender,
      birth_date: data.birth_date,
      liked_episodes_count: parseInt(data.liked_episodes_count, 10),
      saved_podcasts_count: parseInt(data.saved_podcasts_count, 10),
    });
  } catch (err) {
    console.error('Error getting profile:', err);
    res.status(500).json({ message: 'Server error fetching profile' });
  }
};

const editUserProfile = async (req, res) => {
  const accountId = req.user.accountId;
  const {
    firstName,
    lastName,
    phone,
    currentPassword,
    newPassword,
    confirmPassword,
    gender,
    birthDate
  } = req.body;

  const profileImage = req.file?.filename;

  try {
    // 1. Fetch current password for validation (if trying to update password)
    if (newPassword || confirmPassword) {
      if (!currentPassword) return res.status(400).json({ message: 'Current password required' });
      if (newPassword !== confirmPassword) return res.status(400).json({ message: 'Passwords do not match' });

      const result = await pool.query('SELECT password_hash FROM accounts WHERE id = $1', [accountId]);
      const valid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
      if (!valid) return res.status(401).json({ message: 'Incorrect current password' });

      const newHash = await bcrypt.hash(newPassword, 10);
      await pool.query('UPDATE accounts SET password_hash = $1 WHERE id = $2', [newHash, accountId]);
    }

    // 2. Update phone number (optional)
    if (phone) {
      await pool.query('UPDATE accounts SET phone = $1 WHERE id = $2', [phone, accountId]);
    }

    // 3. Update profile table
    const fields = [];
    const values = [];
    let index = 1;

    if (firstName) {
      fields.push(`first_name = $${index++}`);
      values.push(firstName);
    }
    if (lastName) {
      fields.push(`last_name = $${index++}`);
      values.push(lastName);
    }
    if (gender) {
      fields.push(`gender = $${index++}`);
      values.push(gender);
    }
    if (birthDate) {
      const age = new Date().getFullYear() - new Date(birthDate).getFullYear();
      fields.push(`birth_date = $${index++}`);
      values.push(birthDate);
      fields.push(`age = $${index++}`);
      values.push(age);
    }
    if (profileImage) {
      await updateProfilePicture(accountId, profileImage);
    }

    if (fields.length > 0) {
      const updateQuery = `UPDATE userprofile SET ${fields.join(', ')} WHERE account_id = $${index}`;
      values.push(accountId);
      await pool.query(updateQuery, values);
    }

    return res.status(200).json({ message: 'Profile updated successfully' });
  } catch (err) {
    console.error('Edit profile error:', err);
    return res.status(500).json({ message: 'Server error updating profile' });
  }
};

module.exports = {
    completeProfile,
    uploadProfilePicture,
    saveUserInterests,
    isProfileComplete,
    getUserProfile,
    editUserProfile
};
  
