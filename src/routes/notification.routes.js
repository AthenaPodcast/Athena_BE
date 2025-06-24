const express = require('express');
const router = express.Router();
const controller = require('../controllers/notification.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { sendNotification } = require('../utils/notification');

router.get('/', verifyToken, controller.getMyNotifications);
router.post('/mark-read/:id', verifyToken, controller.markAsRead);
router.post('/mark-all-read', verifyToken, controller.markAllAsRead);
router.get('/unread-count', verifyToken, controller.getUnreadCount);
router.get('/test-notification', async (req, res) => {
  await sendNotification(1, 'Test', 'This is a test.', 'test');
  res.json({ message: 'Test sent' });
});
module.exports = router;
