const express = require('express');
const { db } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// Get cards with optional filters
router.get('/', (req, res) => {
  try {
    const userId = req.user.id;
    const { folder_id, search, status, level } = req.query;

    let query = 'SELECT * FROM cards WHERE user_id = ?';
    const params = [userId];

    if (folder_id) {
      query += ' AND folder_id = ?';
      params.push(folder_id);
    }

    if (status && status !== 'all') {
      if (status === 'unmastered') {
        query += " AND status != 'mastered'";
      } else {
        query += ' AND status = ?';
        params.push(status);
      }
    }

    if (level && level !== 'all') {
      query += ' AND level = ?';
      params.push(level);
    }

    if (search) {
      query += ' AND (word LIKE ? OR meaning LIKE ? OR example_en LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term);
    }

    query += ' ORDER BY id DESC';

    const cards = db.prepare(query).all(...params);
    res.json(cards);
  } catch (err) {
    console.error('Get cards error:', err);
    res.status(500).json({ error: 'Không thể lấy danh sách từ vựng' });
  }
});

// Get single card
router.get('/:id', (req, res) => {
  try {
    const cardId = req.params.id;
    const userId = req.user.id;

    const card = db.prepare('SELECT * FROM cards WHERE id = ? AND user_id = ?').get(cardId, userId);
    if (!card) {
      return res.status(404).json({ error: 'Không tìm thấy thẻ từ vựng' });
    }

    res.json(card);
  } catch (err) {
    console.error('Get card error:', err);
    res.status(500).json({ error: 'Lỗi máy chủ' });
  }
});

// Create single card
router.post('/', (req, res) => {
  try {
    const userId = req.user.id;
    const {
      folder_id,
      word,
      phonetic = '',
      meaning,
      part_of_speech = 'noun',
      level = 'B1',
      example_en = '',
      example_vi = '',
      note = ''
    } = req.body;

    if (!folder_id) {
      return res.status(400).json({ error: 'Vui lòng chọn thư mục cho từ vựng' });
    }

    if (!word || !word.trim() || !meaning || !meaning.trim()) {
      return res.status(400).json({ error: 'Từ tiếng Anh và Nghĩa tiếng Việt không được để trống' });
    }

    // Verify folder belongs to user
    const folder = db.prepare('SELECT id FROM folders WHERE id = ? AND user_id = ?').get(folder_id, userId);
    if (!folder) {
      return res.status(404).json({ error: 'Thư mục không hợp lệ' });
    }

    const result = db.prepare(`
      INSERT INTO cards (folder_id, user_id, word, phonetic, meaning, part_of_speech, level, example_en, example_vi, note, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new')
    `).run(
      folder_id,
      userId,
      word.trim(),
      phonetic.trim(),
      meaning.trim(),
      part_of_speech.trim(),
      (level || 'B1').trim().toUpperCase(),
      example_en.trim(),
      example_vi.trim(),
      note.trim()
    );

    // Update folder timestamp
    db.prepare('UPDATE folders SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(folder_id);

    const newCard = db.prepare('SELECT * FROM cards WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({
      message: 'Thêm từ vựng thành công!',
      card: newCard
    });
  } catch (err) {
    console.error('Create card error:', err);
    res.status(500).json({ error: 'Lỗi khi tạo thẻ từ vựng' });
  }
});

// Bulk import cards
router.post('/bulk', (req, res) => {
  try {
    const userId = req.user.id;
    const { folder_id, cards, default_level = 'B1' } = req.body;

    if (!folder_id || !Array.isArray(cards) || cards.length === 0) {
      return res.status(400).json({ error: 'Dữ liệu nhập hàng loạt không hợp lệ' });
    }

    const folder = db.prepare('SELECT id FROM folders WHERE id = ? AND user_id = ?').get(folder_id, userId);
    if (!folder) {
      return res.status(404).json({ error: 'Thư mục không hợp lệ' });
    }

    const insertStmt = db.prepare(`
      INSERT INTO cards (folder_id, user_id, word, phonetic, meaning, part_of_speech, level, example_en, example_vi, note, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new')
    `);

    let count = 0;
    for (const c of cards) {
      if (!c.word || !c.meaning) continue;
      insertStmt.run(
        folder_id,
        userId,
        c.word.trim(),
        (c.phonetic || '').trim(),
        c.meaning.trim(),
        (c.part_of_speech || 'noun').trim(),
        (c.level || default_level || 'B1').trim().toUpperCase(),
        (c.example_en || '').trim(),
        (c.example_vi || '').trim(),
        (c.note || '').trim()
      );
      count++;
    }

    db.prepare('UPDATE folders SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(folder_id);

    res.status(201).json({
      message: `Đã nhập thành công ${count} thẻ từ vựng!`,
      imported_count: count
    });
  } catch (err) {
    console.error('Bulk import error:', err);
    res.status(500).json({ error: 'Lỗi khi nhập danh sách từ vựng' });
  }
});

// Update card
router.put('/:id', (req, res) => {
  try {
    const cardId = req.params.id;
    const userId = req.user.id;
    const {
      word,
      phonetic = '',
      meaning,
      part_of_speech = 'noun',
      level = 'B1',
      example_en = '',
      example_vi = '',
      note = '',
      status
    } = req.body;

    if (!word || !word.trim() || !meaning || !meaning.trim()) {
      return res.status(400).json({ error: 'Từ tiếng Anh và Nghĩa không được để trống' });
    }

    const existing = db.prepare('SELECT id, folder_id FROM cards WHERE id = ? AND user_id = ?').get(cardId, userId);
    if (!existing) {
      return res.status(404).json({ error: 'Không tìm thấy thẻ từ vựng' });
    }

    db.prepare(`
      UPDATE cards 
      SET word = ?, phonetic = ?, meaning = ?, part_of_speech = ?, level = ?, example_en = ?, example_vi = ?, note = ?, status = COALESCE(?, status)
      WHERE id = ? AND user_id = ?
    `).run(
      word.trim(),
      phonetic.trim(),
      meaning.trim(),
      part_of_speech.trim(),
      (level || 'B1').trim().toUpperCase(),
      example_en.trim(),
      example_vi.trim(),
      note.trim(),
      status || null,
      cardId,
      userId
    );

    const updated = db.prepare('SELECT * FROM cards WHERE id = ?').get(cardId);
    res.json({
      message: 'Cập nhật từ vựng thành công!',
      card: updated
    });
  } catch (err) {
    console.error('Update card error:', err);
    res.status(500).json({ error: 'Lỗi khi cập nhật từ vựng' });
  }
});

// Update card mastery status ('new' | 'learning' | 'mastered')
router.patch('/:id/status', (req, res) => {
  try {
    const cardId = req.params.id;
    const userId = req.user.id;
    const { status } = req.body;

    if (!['new', 'learning', 'mastered'].includes(status)) {
      return res.status(400).json({ error: 'Trạng thái học không hợp lệ' });
    }

    const card = db.prepare('SELECT id FROM cards WHERE id = ? AND user_id = ?').get(cardId, userId);
    if (!card) {
      return res.status(404).json({ error: 'Không tìm thấy thẻ từ vựng' });
    }

    db.prepare('UPDATE cards SET status = ? WHERE id = ? AND user_id = ?').run(status, cardId, userId);

    res.json({ message: 'Cập nhật trạng thái thành công', status });
  } catch (err) {
    console.error('Update status error:', err);
    res.status(500).json({ error: 'Lỗi máy chủ' });
  }
});

// Delete card
router.delete('/:id', (req, res) => {
  try {
    const cardId = req.params.id;
    const userId = req.user.id;

    const card = db.prepare('SELECT id FROM cards WHERE id = ? AND user_id = ?').get(cardId, userId);
    if (!card) {
      return res.status(404).json({ error: 'Không tìm thấy thẻ từ vựng' });
    }

    db.prepare('DELETE FROM cards WHERE id = ? AND user_id = ?').run(cardId, userId);
    res.json({ message: 'Đã xóa thẻ từ vựng' });
  } catch (err) {
    console.error('Delete card error:', err);
    res.status(500).json({ error: 'Lỗi khi xóa từ vựng' });
  }
});

module.exports = router;
