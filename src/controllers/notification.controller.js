const pool = require('../../db');

exports.getMyNotifications = async (req, res) => {
  const userId = req.user.accountId;
  const result = await pool.query(
    `SELECT * FROM notifications WHERE account_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  res.json(result.rows);
};

exports.markAsRead = async (req, res) => {
  const userId = req.user.accountId;
  const notificationId = req.params.id;

  await pool.query(
    `UPDATE notifications SET is_read = TRUE WHERE id = $1 AND account_id = $2`,
    [notificationId, userId]
  );

  res.json({ message: 'Notification marked as read' });
};

exports.markAllAsRead = async (req, res) => {
  const userId = req.user.accountId;

  await pool.query(
    `UPDATE notifications SET is_read = TRUE WHERE account_id = $1`,
    [userId]
  );

  res.json({ message: 'All notifications marked as read' });
};

exports.getUnreadCount = async (req, res) => {
  const userId = req.user.accountId;

  const result = await pool.query(
    `SELECT COUNT(*) FROM notifications WHERE account_id = $1 AND is_read = false`,
    [userId]
  );

  const count = parseInt(result.rows[0].count, 10);
  res.json({ unreadCount: count });
};
