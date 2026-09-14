const path = require('path');
const express = require('express');
const app = require('./app');
const { connectDB } = require('./config/db');

const PORT = process.env.PORT || 5000;

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
