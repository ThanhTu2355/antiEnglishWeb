require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { connectDB } = require('./config/db');

const authRoutes = require('./routes/auth');
const folderRoutes = require('./routes/folders');
const cardRoutes = require('./routes/cards');
const practiceRoutes = require('./routes/practice');

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());

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

// Serve frontend build if in production
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));

// Fallback for SPA routing in production
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint không tồn tại' });
  }
  const indexPath = path.join(clientDist, 'index.html');
  res.sendFile(indexPath, err => {
    if (err) {
      res.status(200).send('AntiEnglish Web Server Running. Run frontend in client/ folder or build it.');
    }
  });
});

async function startServer() {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`🚀 AntiEnglish Server running at http://localhost:${PORT}`);
    console.log(`🍃 Database connected: MongoDB Atlas`);
    console.log(`=========================================`);
  });
}

startServer();
