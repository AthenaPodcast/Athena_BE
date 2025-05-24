const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middlewares/auth.middleware');
const adminOnly = require('../middlewares/adminOnly.middleware');
const {
  getChannelRequests,
  approveRequest,
  rejectRequest
} = require('../controllers/admin.controller');

router.use(verifyToken, adminOnly);

router.get('/channel-requests', getChannelRequests);
router.post('/channel-requests/:id/approve', approveRequest);
router.post('/channel-requests/:id/reject', rejectRequest);

module.exports = router;
