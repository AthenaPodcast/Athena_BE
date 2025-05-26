const express = require('express');
const app = express();

// Middlewares
app.use(express.json()); // to read JSON bodies

// Routes
const authRoutes = require('./src/routes/auth.routes');
const profileRoutes = require('./src/routes/profile.routes');
const episodeRoutes = require('./src/routes/episode.routes');
const listenRoutes = require('./src/routes/listen.routes');
const adminRoutes = require('./src/routes/admin.routes');
const channelRequestRoutes = require('./src/routes/channelRequest.routes');
const insightsRoutes = require('./src/routes/insights.routes');

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/episode', episodeRoutes);
app.use('/api', listenRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', channelRequestRoutes);
app.use('/api/admin/insights', insightsRoutes);

module.exports = app;