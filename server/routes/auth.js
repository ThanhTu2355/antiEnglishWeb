const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db, seedDefaultData } = require('../db');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// Register new user
router.post('/register', (req, res) => {
  try {
    const { username, email, password, full_name } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ tên đăng nhập, email và mật khẩu' });
    }

    if (username.length < 3) {
      return res.status(400).json({ error: 'Tên đăng nhập phải có ít nhất 3 ký tự' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 6 ký tự' });
    }

    // Check existing
    const existing = db.prepare('SELECT id, username, email FROM users WHERE username = ? OR email = ?').get(username.trim(), email.trim().toLowerCase());
    if (existing) {
      if (existing.username === username.trim()) {
        return res.status(400).json({ error: 'Tên đăng nhập này đã được sử dụng' });
      }
      return res.status(400).json({ error: 'Email này đã được sử dụng' });
    }

    const salt = bcrypt.genSaltSync(10);
    const password_hash = bcrypt.hashSync(password, salt);

    const result = db.prepare(`
      INSERT INTO users (username, email, password_hash, full_name)
      VALUES (?, ?, ?, ?)
    `).run(username.trim(), email.trim().toLowerCase(), password_hash, full_name ? full_name.trim() : username.trim());

    const newUserId = Number(result.lastInsertRowid);

    // Seed sample vocabulary sets for the new user so they can start immediately!
    seedDefaultData(newUserId);

    const user = {
      id: newUserId,
      username: username.trim(),
      email: email.trim().toLowerCase(),
      full_name: full_name ? full_name.trim() : username.trim()
    };

    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'Đăng ký thành công!',
      user,
      token
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Lỗi máy chủ khi đăng ký' });
  }
});

// Login
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Vui lòng nhập tên đăng nhập và mật khẩu' });
    }

    const cleanInput = username.trim();
    const user = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(cleanInput, cleanInput.toLowerCase());

    if (!user) {
      return res.status(401).json({ error: 'Tài khoản hoặc mật khẩu không chính xác' });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Tài khoản hoặc mật khẩu không chính xác' });
    }

    const userData = {
      id: user.id,
      username: user.username,
      email: user.email,
      full_name: user.full_name || user.username
    };

    const token = jwt.sign(userData, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Đăng nhập thành công!',
      user: userData,
      token
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Lỗi máy chủ khi đăng nhập' });
  }
});

// Get current user profile & stats
router.get('/me', authenticateToken, (req, res) => {
  try {
    const user = db.prepare('SELECT id, username, email, full_name, created_at FROM users WHERE id = ?').get(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng' });
    }

    // Stats
    const folderCount = db.prepare('SELECT COUNT(*) as count FROM folders WHERE user_id = ?').get(req.user.id).count;
    const cardStats = db.prepare(`
      SELECT 
        COUNT(*) as total_cards,
        SUM(CASE WHEN status = 'mastered' THEN 1 ELSE 0 END) as mastered_cards,
        SUM(CASE WHEN status != 'mastered' THEN 1 ELSE 0 END) as unmastered_cards,
        SUM(CASE WHEN status = 'learning' THEN 1 ELSE 0 END) as learning_cards,
        SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) as new_cards
      FROM cards 
      WHERE user_id = ?
    `).get(req.user.id);

    const practiceCount = db.prepare('SELECT COUNT(*) as count FROM practice_history WHERE user_id = ?').get(req.user.id).count;

    res.json({
      user,
      stats: {
        total_folders: folderCount,
        total_cards: cardStats.total_cards || 0,
        mastered_cards: cardStats.mastered_cards || 0,
        unmastered_cards: cardStats.unmastered_cards || 0,
        learning_cards: cardStats.learning_cards || 0,
        new_cards: cardStats.new_cards || 0,
        total_practices: practiceCount
      }
    });
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'Lỗi máy chủ' });
  }
});

module.exports = router;
