const express = require('express');
const mongoose = require('mongoose');
const Card = require('../models/Card');
const Folder = require('../models/Folder');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// Get cards with optional filters
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { folder_id, search, status, level } = req.query;

    const filter = { user_id: userId };

    if (folder_id && folder_id !== 'all' && mongoose.Types.ObjectId.isValid(folder_id)) {
      filter.folder_id = folder_id;
    }

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (level && level !== 'all') {
      const norm = level.trim().toUpperCase();
      if (norm === 'OTHER') {
        filter.level = { $in: ['OTHER', 'Other'] };
      } else {
        filter.level = norm;
      }
    }

    if (search && search.trim()) {
      const reg = new RegExp(search.trim(), 'i');
      filter.$or = [
        { word: reg },
        { meaning: reg },
        { example_en: reg }
      ];
    }

    const cards = await Card.find(filter).populate('folder_id', 'name color').sort({ _id: -1 });
    res.json(cards);
  } catch (err) {
    console.error('Get cards error:', err);
    res.status(500).json({ error: 'Không thể lấy danh sách từ vựng' });
  }
});

// Get single card
router.get('/:id', async (req, res) => {
  try {
    const cardId = req.params.id;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(cardId)) {
      return res.status(404).json({ error: 'ID từ vựng không hợp lệ' });
    }

    const card = await Card.findOne({ _id: cardId, user_id: userId });
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
router.post('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      folder_id,
      word,
      phonetic = '',
      meaning,
      part_of_speech = 'noun',
      level = 'B1',
      status = 'new',
      example_en = '',
      example_vi = '',
      note = ''
    } = req.body;

    if (!folder_id || !mongoose.Types.ObjectId.isValid(folder_id)) {
      return res.status(400).json({ error: 'Vui lòng chọn thư mục hợp lệ cho từ vựng' });
    }

    if (!word || !word.trim() || !meaning || !meaning.trim()) {
      return res.status(400).json({ error: 'Từ tiếng Anh và Nghĩa tiếng Việt không được để trống' });
    }

    // Verify folder belongs to user
    const folder = await Folder.findOne({ _id: folder_id, user_id: userId });
    if (!folder) {
      return res.status(404).json({ error: 'Thư mục không hợp lệ' });
    }

    const newCard = await Card.create({
      folder_id,
      user_id: userId,
      word: word.trim(),
      phonetic: phonetic.trim(),
      meaning: meaning.trim(),
      part_of_speech: part_of_speech.trim(),
      level: (level || '').trim().toUpperCase() === 'OTHER' ? 'Other' : (level || 'B1').trim().toUpperCase(),
      example_en: example_en.trim(),
      example_vi: example_vi.trim(),
      note: note.trim(),
      status: ['new', 'learning', 'unmastered', 'mastered'].includes(status) ? status : 'new'
    });

    await Folder.findByIdAndUpdate(folder_id, { updated_at: new Date() });

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
router.post('/bulk', async (req, res) => {
  try {
    const userId = req.user.id;
    const { folder_id, cards, default_level = 'B1' } = req.body;

    if (!folder_id || !mongoose.Types.ObjectId.isValid(folder_id) || !Array.isArray(cards) || cards.length === 0) {
      return res.status(400).json({ error: 'Dữ liệu nhập hàng loạt không hợp lệ' });
    }

    const folder = await Folder.findOne({ _id: folder_id, user_id: userId });
    if (!folder) {
      return res.status(404).json({ error: 'Thư mục không hợp lệ' });
    }

    const cardsToInsert = [];
    for (const c of cards) {
      if (!c.word || !c.meaning) continue;
      cardsToInsert.push({
        folder_id,
        user_id: userId,
        word: c.word.trim(),
        phonetic: (c.phonetic || '').trim(),
        meaning: c.meaning.trim(),
        part_of_speech: (c.part_of_speech || 'noun').trim(),
        level: (c.level || default_level || '').trim().toUpperCase() === 'OTHER' ? 'Other' : (c.level || default_level || 'B1').trim().toUpperCase(),
        example_en: (c.example_en || '').trim(),
        example_vi: (c.example_vi || '').trim(),
        note: (c.note || '').trim(),
        status: 'new'
      });
    }

    if (cardsToInsert.length > 0) {
      await Card.insertMany(cardsToInsert);
    }

    await Folder.findByIdAndUpdate(folder_id, { updated_at: new Date() });

    res.status(201).json({
      message: `Đã nhập thành công ${cardsToInsert.length} thẻ từ vựng!`,
      imported_count: cardsToInsert.length
    });
  } catch (err) {
    console.error('Bulk import error:', err);
    res.status(500).json({ error: 'Lỗi khi nhập danh sách từ vựng' });
  }
});

// Update card
router.put('/:id', async (req, res) => {
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

    if (!mongoose.Types.ObjectId.isValid(cardId)) {
      return res.status(404).json({ error: 'ID từ vựng không hợp lệ' });
    }

    if (!word || !word.trim() || !meaning || !meaning.trim()) {
      return res.status(400).json({ error: 'Từ tiếng Anh và Nghĩa không được để trống' });
    }

    const updateData = {
      word: word.trim(),
      phonetic: phonetic.trim(),
      meaning: meaning.trim(),
      part_of_speech: part_of_speech.trim(),
      level: (level || '').trim().toUpperCase() === 'OTHER' ? 'Other' : (level || 'B1').trim().toUpperCase(),
      example_en: example_en.trim(),
      example_vi: example_vi.trim(),
      note: note.trim()
    };
    if (status) updateData.status = status;

    const updated = await Card.findOneAndUpdate(
      { _id: cardId, user_id: userId },
      updateData,
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: 'Không tìm thấy thẻ từ vựng' });
    }

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
router.patch('/:id/status', async (req, res) => {
  try {
    const cardId = req.params.id;
    const userId = req.user.id;
    const { status } = req.body;

    if (!['new', 'learning', 'unmastered', 'mastered'].includes(status)) {
      return res.status(400).json({ error: 'Trạng thái học không hợp lệ' });
    }

    if (!mongoose.Types.ObjectId.isValid(cardId)) {
      return res.status(404).json({ error: 'ID từ vựng không hợp lệ' });
    }

    const card = await Card.findOneAndUpdate(
      { _id: cardId, user_id: userId },
      { status },
      { new: true }
    );

    if (!card) {
      return res.status(404).json({ error: 'Không tìm thấy thẻ từ vựng' });
    }

    res.json({ message: 'Cập nhật trạng thái thành công', status });
  } catch (err) {
    console.error('Update status error:', err);
    res.status(500).json({ error: 'Lỗi máy chủ' });
  }
});

// Delete card
router.delete('/:id', async (req, res) => {
  try {
    const cardId = req.params.id;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(cardId)) {
      return res.status(404).json({ error: 'ID từ vựng không hợp lệ' });
    }

    const card = await Card.findOneAndDelete({ _id: cardId, user_id: userId });
    if (!card) {
      return res.status(404).json({ error: 'Không tìm thấy thẻ từ vựng' });
    }

    res.json({ message: 'Đã xóa thẻ từ vựng' });
  } catch (err) {
    console.error('Delete card error:', err);
    res.status(500).json({ error: 'Lỗi khi xóa từ vựng' });
  }
});

module.exports = router;
