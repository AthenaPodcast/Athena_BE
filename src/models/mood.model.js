const pool = require('../../db');

exports.setUserMood = async (accountId, mood) => {
  // Check if a mood exists for today
  const result = await pool.query(`
    SELECT id FROM moodtracker
    WHERE account_id = $1 AND created_at::date = CURRENT_DATE
  `, [accountId]);

  if (result.rows.length > 0) {
    // update today's mood
    await pool.query(`
      UPDATE moodtracker
      SET mood = $1, created_at = NOW()
      WHERE id = $2
    `, [mood, result.rows[0].id]);
  } else {
    // insert new mood
    await pool.query(`
      INSERT INTO moodtracker (account_id, mood, created_at)
      VALUES ($1, $2, NOW())
    `, [accountId, mood]);
  }

  // clean up older moods
  await pool.query(`
    DELETE FROM moodtracker
    WHERE account_id = $1 AND created_at::date < CURRENT_DATE
  `, [accountId]);
};

exports.getUserMood = async (accountId) => {
  const result = await pool.query(`
    SELECT mood
    FROM moodtracker
    WHERE account_id = $1
      AND created_at::date = CURRENT_DATE
    LIMIT 1
  `, [accountId]);

  return result.rows[0]?.mood || null;
};