const pool = require('../../db');

exports.sendNotification = async (userId, title, message, type = null) => {
  try {
    await pool.query(
      `INSERT INTO notifications (account_id, title, message, type) VALUES ($1, $2, $3, $4)`,
      [userId, title, message, type]
    );
    console.log('Notification inserted');
  } catch (err) {
    console.error(' Error inserting notification:', err);
  }
};
