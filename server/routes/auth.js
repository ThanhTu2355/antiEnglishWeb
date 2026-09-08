const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Folder = require('../models/Folder');
const Card = require('../models/Card');
const PracticeHistory = require('../models/PracticeHistory');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, full_name } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Vui lòng điền đầy đủ tên đăng nhập, email và mật khẩu' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    if (cleanUsername.length < 3) {
      return res.status(400).json({ error: 'Tên đăng nhập phải có ít nhất 3 ký tự' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Mật khẩu phải có ít nhất 6 ký tự' });
    }

    // Check existing
    const existing = await User.findOne({
      $or: [{ username: cleanUsername }, { email: cleanEmail }]
    });

    if (existing) {
      if (existing.username === cleanUsername) {
        return res.status(400).json({ error: 'Tên đăng nhập này đã được sử dụng' });
      }
      return res.status(400).json({ error: 'Email này đã được sử dụng' });
    }

    const salt = bcrypt.genSaltSync(10);
    const password_hash = bcrypt.hashSync(password, salt);

    const newUser = await User.create({
      username: cleanUsername,
      email: cleanEmail,
      password_hash,
      full_name: full_name ? full_name.trim() : username.trim()
    });

    const userData = {
      id: newUser._id.toString(),
      username: newUser.username,
      email: newUser.email,
      full_name: newUser.full_name
    };

    const token = jwt.sign(userData, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'Đăng ký thành công!',
      user: userData,
      token
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Lỗi máy chủ khi đăng ký' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Vui lòng nhập tên đăng nhập và mật khẩu' });
    }

    const cleanInput = username.trim().toLowerCase();
    const user = await User.findOne({
      $or: [{ username: cleanInput }, { email: cleanInput }]
    });

    if (!user) {
      return res.status(401).json({ error: 'Tài khoản hoặc mật khẩu không chính xác' });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Tài khoản hoặc mật khẩu không chính xác' });
    }

    const userData = {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      full_name: user.full_name || user.username
    };

    const token = jwt.sign(userData, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'Đăng ký thành công!',
      user: userData,
      token
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Lỗi máy chủ khi đăng nhập' });
  }
});

// Get current user profile & stats
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password_hash');
    if (!user) {
      return res.status(404).json({ error: 'Không tìm thấy người dùng' });
    }

    // Stats
    const folderCount = await Folder.countDocuments({ user_id: req.user.id });
    
    // Aggregations on cards for current user
    const statsResult = await Card.aggregate([
      { $match: { user_id: user._id } },
      {
        $group: {
          _id: null,
          total_cards: { $sum: 1 },
          mastered_cards: { $sum: { $cond: [{ $eq: ['$status', 'mastered'] }, 1, 0] } },
          unmastered_cards: { $sum: { $cond: [{ $ne: ['$status', 'mastered'] }, 1, 0] } },
          learning_cards: { $sum: { $cond: [{ $eq: ['$status', 'learning'] }, 1, 0] } },
          new_cards: { $sum: { $cond: [{ $eq: ['$status', 'new'] }, 1, 0] } }
        }
      }
    ]);

    const cardStats = statsResult[0] || {
      total_cards: 0,
      mastered_cards: 0,
      unmastered_cards: 0,
      learning_cards: 0,
      new_cards: 0
    };

    const practiceCount = await PracticeHistory.countDocuments({ user_id: req.user.id });

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
