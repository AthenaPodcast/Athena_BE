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
const adsRoutes = require('./src/routes/ads.routes');
const externalChannelRoutes = require('./src/routes/externalChannel.routes');
const externalEpisodeRoutes = require('./src/routes/externalEpisode.routes');
const externalPodcastRoutes = require('./src/routes/externalPodcast.routes');
const userRoutes = require('./src/routes/user.routes');
const chatRoutes = require('./src/routes/chat.routes');

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/episode', episodeRoutes);
app.use('/api', listenRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', channelRequestRoutes);
app.use('/api/admin/insights', insightsRoutes);
app.use('/api/ads', adsRoutes);
app.use('/api/admin/ads', adsRoutes);
app.use('/api/admin', externalChannelRoutes);
app.use('/api/admin', externalEpisodeRoutes);
app.use('/api/admin', externalPodcastRoutes);
app.use('/api/users', userRoutes);
app.use('/api', chatRoutes);

module.exports = app;