require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const path = require('path');
const compression = require('compression');

const participantRoutes = require('./routes/participant');
const quizRoutes = require('./routes/quiz');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// Gzip compress all responses — reduces bandwidth by ~70%
app.use(compression());

// Parse JSON body with a size limit to prevent abuse
app.use(express.json({ limit: '50kb' }));
app.use(cookieParser());

// Serve static files with caching headers
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1h',
  etag: true
}));

app.use('/api/participant', participantRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/admin', adminRoutes);

// Fallback: any unknown route serves the registration page
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
  maxPoolSize: 100,        // Handle 150 concurrent DB operations
  minPoolSize: 10,         // Keep 10 connections warm
  socketTimeoutMS: 45000,  // 45s socket timeout
  serverSelectionTimeoutMS: 10000
})
  .then(() => {
    console.log('Connected to MongoDB (pool: 100)');
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
  });

// Only listen locally (Vercel will handle serverless execution)
if (!process.env.VERCEL) {
  const server = app.listen(PORT, () =>
    console.log(`Server running on http://localhost:${PORT}`)
  );
  // Increase keep-alive timeout for concurrent HTTP connections
  server.keepAliveTimeout = 65000;
  server.headersTimeout = 70000;
}

module.exports = app;
