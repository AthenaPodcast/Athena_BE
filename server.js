require('dotenv').config();

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION:', err);
});

const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json()); // to read JSON bodies

const authRoutes = require('./src/routes/auth.routes');
app.use('/api/auth', authRoutes);

const profileRoutes = require('./src/routes/profile.routes');
app.use('/api/profile', profileRoutes);

const audioRoutes = require('./src/routes/audio.routes');
app.use('/api/audio', audioRoutes);

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
