const express = require('express');
const mongoose = require('mongoose');
const Card = require('../models/Card');
const Folder = require('../models/Folder');
const { authenticateToken } = require('../middleware/auth');
const { calculateSM2, getProjectedIntervals } = require('../utils/sm2');

const router = express.Router();
router.use(authenticateToken);

// Count cards due for review (must be before /:id)
router.get('/due/count', async (req, res) => {
  try {
    const userId = req.user.id;
    const { folder_id } = req.query;
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    const filter = {
      user_id: userId,
      last_reviewed_at: { $ne: null },
      next_review_date: { $ne: null, $lte: endOfToday }
    };

    if (folder_id && folder_id !== 'all' && mongoose.Types.ObjectId.isValid(folder_id)) {
      filter.folder_id = folder_id;
    }

    const count = await Card.countDocuments(filter);
    res.json({ count });
  } catch (err) {
    console.error('Count due cards error:', err);
    res.status(500).json({ error: 'Lỗi khi đếm số từ cần ôn tập' });
  }
});

// Get cards with optional filters
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { folder_id, search, status, level, due } = req.query;

    const filter = { user_id: userId };

    if (folder_id && folder_id !== 'all' && mongoose.Types.ObjectId.isValid(folder_id)) {
      filter.folder_id = folder_id;
    }

    // Filter by Spaced Repetition Due status
    if (due === 'true' || status === 'due') {
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);
      filter.last_reviewed_at = { $ne: null };
      filter.next_review_date = { $ne: null, $lte: endOfToday };
    } else if (status && status !== 'all') {
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
    const results = cards.map(c => {
      const json = c.toJSON();
      json.projected_intervals = getProjectedIntervals(c);
      return json;
    });
    res.json(results);
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

    if (!word || !word.trim() || !meaning || !meaning.trim()) {
      return res.status(400).json({ error: 'Từ tiếng Anh và Nghĩa tiếng Việt không được để trống' });
    }

    let validFolderId = null;
    if (folder_id && folder_id !== 'all' && mongoose.Types.ObjectId.isValid(folder_id)) {
      const folder = await Folder.findOne({ _id: folder_id, user_id: userId });
      if (folder) {
        validFolderId = folder._id;
      }
    }

    const newCard = await Card.create({
      folder_id: validFolderId,
      user_id: userId,
      word: word.trim(),
      phonetic: phonetic.trim(),
      meaning: meaning.trim(),
      part_of_speech: part_of_speech.trim(),
      level: (level || '').trim().toUpperCase() === 'OTHER' ? 'Other' : (level || 'B1').trim().toUpperCase(),
      example_en: example_en.trim(),
      example_vi: example_vi.trim(),
      note: note.trim(),
      status: ['new', 'learning', 'unmastered', 'mastered'].includes(status) ? status : 'new',
      next_review_date: null,
      last_reviewed_at: null
    });

    if (validFolderId) {
      await Folder.findByIdAndUpdate(validFolderId, { updated_at: new Date() });
    }

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

    if (!Array.isArray(cards) || cards.length === 0) {
      return res.status(400).json({ error: 'Dữ liệu nhập hàng loạt không hợp lệ' });
    }

    let validFolderId = null;
    if (folder_id && folder_id !== 'all' && mongoose.Types.ObjectId.isValid(folder_id)) {
      const folder = await Folder.findOne({ _id: folder_id, user_id: userId });
      if (folder) {
        validFolderId = folder._id;
      }
    }

    const cardsToInsert = [];
    for (const c of cards) {
      if (!c.word || !c.meaning) continue;
      cardsToInsert.push({
        folder_id: validFolderId,
        user_id: userId,
        word: c.word.trim(),
        phonetic: (c.phonetic || '').trim(),
        meaning: c.meaning.trim(),
        part_of_speech: (c.part_of_speech || 'noun').trim(),
        level: (c.level || default_level || '').trim().toUpperCase() === 'OTHER' ? 'Other' : (c.level || default_level || 'B1').trim().toUpperCase(),
        example_en: (c.example_en || '').trim(),
        example_vi: (c.example_vi || '').trim(),
        note: (c.note || '').trim(),
        status: 'new',
        next_review_date: null,
        last_reviewed_at: null
      });
    }

    if (cardsToInsert.length > 0) {
      await Card.insertMany(cardsToInsert);
    }

    if (validFolderId) {
      await Folder.findByIdAndUpdate(validFolderId, { updated_at: new Date() });
    }

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
      folder_id,
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

    if (folder_id !== undefined) {
      if (folder_id && folder_id !== 'all' && mongoose.Types.ObjectId.isValid(folder_id)) {
        const folder = await Folder.findOne({ _id: folder_id, user_id: userId });
        updateData.folder_id = folder ? folder._id : null;
      } else {
        updateData.folder_id = null;
      }
    }

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

// Review card using SM-2 Spaced Repetition ('again' | 'hard' | 'good' | 'easy')
router.post('/:id/review', async (req, res) => {
  try {
    const cardId = req.params.id;
    const userId = req.user.id;
    const { rating } = req.body;

    if (!['again', 'hard', 'good', 'easy', 'unmastered', 'learning', 'mastered'].includes(rating)) {
      return res.status(400).json({ error: 'Đánh giá ôn tập không hợp lệ (again, hard, good, easy)' });
    }

    if (!mongoose.Types.ObjectId.isValid(cardId)) {
      return res.status(404).json({ error: 'ID từ vựng không hợp lệ' });
    }

    const card = await Card.findOne({ _id: cardId, user_id: userId });
    if (!card) {
      return res.status(404).json({ error: 'Không tìm thấy thẻ từ vựng' });
    }

    const sm2Update = calculateSM2(card, rating);
    Object.assign(card, sm2Update);
    await card.save();

    const cardJson = card.toJSON();
    cardJson.projected_intervals = getProjectedIntervals(card);

    res.json({
      message: 'Đã cập nhật tiến độ ôn tập!',
      card: cardJson,
      sm2: sm2Update
    });
  } catch (err) {
    console.error('Review card error:', err);
    res.status(500).json({ error: 'Lỗi khi lưu kết quả ôn tập' });
  }
});

// Update card mastery status ('new' | 'learning' | 'mastered' | 'unmastered')
router.patch('/:id/status', async (req, res) => {
  try {
    const cardId = req.params.id;
    const userId = req.user.id;
    const { status, rating } = req.body;

    if (!mongoose.Types.ObjectId.isValid(cardId)) {
      return res.status(404).json({ error: 'ID từ vựng không hợp lệ' });
    }

    const card = await Card.findOne({ _id: cardId, user_id: userId });
    if (!card) {
      return res.status(404).json({ error: 'Không tìm thấy thẻ từ vựng' });
    }

    if (status === 'new') {
      card.status = 'new';
      card.repetitions = 0;
      card.interval = 0;
      card.next_review_date = null;
      card.last_reviewed_at = null;
      await card.save();

      const cardJson = card.toJSON();
      cardJson.projected_intervals = getProjectedIntervals(card);

      return res.json({
        message: 'Cập nhật trạng thái thành công',
        status: card.status,
        card: cardJson
      });
    }

    const effectiveRating = rating || (
      status === 'mastered' ? 'easy' :
      status === 'unmastered' ? 'again' :
      status === 'learning' ? 'hard' : 'good'
    );

    const sm2Update = calculateSM2(card, effectiveRating);
    if (status && ['learning', 'unmastered', 'mastered'].includes(status)) {
      sm2Update.status = status;
    }

    Object.assign(card, sm2Update);
    await card.save();

    const cardJson = card.toJSON();
    cardJson.projected_intervals = getProjectedIntervals(card);

    res.json({
      message: 'Cập nhật trạng thái thành công',
      status: card.status,
      card: cardJson
    });
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
