require('dotenv').config();
const pool = require('./db');

async function testDatabaseConnection() {
  try {
    const { rows } = await pool.query('SELECT NOW() as now');
    console.log('Database connection successful. Server time is:', rows[0].now);
  } catch (err) {
    console.error('Unable to connect to the database:', err);
  }

  pool.end();
}

testDatabaseConnection();
