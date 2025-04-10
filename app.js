const express = require('express');
const app = express();

// Middlewares
app.use(express.json()); // to read JSON bodies

// Routes
const authRoutes = require('./src/routes/auth.routes');
const profileRoutes = require('./src/routes/profile.routes');
const episodeRoutes = require('./src/routes/episode.routes');

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/episode', episodeRoutes);

module.exports = app;