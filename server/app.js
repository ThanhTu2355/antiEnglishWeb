require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectDB } = require('./config/db');

const authRoutes = require('./routes/auth');
const folderRoutes = require('./routes/folders');
const cardRoutes = require('./routes/cards');
const practiceRoutes = require('./routes/practice');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Database connection middleware for Serverless (and resilient local dev)
app.use(async (req, res, next) => {
  if (req.path.startsWith('/api')) {
    try {
      await connectDB();
    } catch (err) {
      console.error('Database connection error in middleware:', err);
    }
  }
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/cards', cardRoutes);
app.use('/api/practice', practiceRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: 'MongoDB Atlas',
    time: new Date().toISOString(),
    app: 'AntiEnglish Web API'
  });
});

module.exports = app;
