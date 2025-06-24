const cron = require('node-cron');
const pool = require('../../db'); 

// run every Sunday at 3:00 AM
cron.schedule('0 3 * * 0', async () => {
  try {
    const result = await pool.query(
      `DELETE FROM notifications
       WHERE is_read = true AND created_at < NOW() - INTERVAL '30 days'`
    );
    console.log(`Deleted ${result.rowCount} old notifications`);
  } catch (err) {
    console.error(' Notification cleanup failed:', err.message);
  }
});
