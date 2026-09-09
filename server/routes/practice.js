const express = require('express');
const mongoose = require('mongoose');
const Card = require('../models/Card');
const PracticeHistory = require('../models/PracticeHistory');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// Helper to normalize strings for comparison
function normalizeString(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .trim()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'’]/g, ' ')
    .replace(/\s+/g, ' ');
}

// Smart check if user's Vietnamese meaning is correct
function checkMeaningMatch(userAnswer, trueMeaning) {
  const normUser = normalizeString(userAnswer);
  const normTrue = normalizeString(trueMeaning);

  if (!normUser) return false;
  if (normUser === normTrue) return true;

  const meanings = trueMeaning
    .split(/[,;\/]+/)
    .map(m => normalizeString(m))
    .filter(Boolean);

  for (const m of meanings) {
    if (normUser === m) return true;
    if (m.includes(normUser) && normUser.length >= 3) return true;
    if (normUser.includes(m) && m.length >= 3) return true;
  }

  return false;
}

// Generate practice questions
router.get('/questions', async (req, res) => {
  try {
    const userId = req.user.id;
    const { folder_id, limit = 10, mode = 'fill_meaning', level, status } = req.query;

    const matchFilter = { user_id: new mongoose.Types.ObjectId(userId) };

    if (folder_id && folder_id !== 'all' && mongoose.Types.ObjectId.isValid(folder_id)) {
      matchFilter.folder_id = new mongoose.Types.ObjectId(folder_id);
    }

    if (level && level !== 'all') {
      matchFilter.level = level;
    }

    if (status && status !== 'all') {
      if (status === 'unmastered') {
        matchFilter.status = { $ne: 'mastered' };
      } else {
        matchFilter.status = status;
      }
    }

    const isAll = limit === 'all' || Number(limit) === 0;
    const sampleSize = isAll ? 999999 : (Math.max(1, Number(limit)) || 10);

    const questionCards = await Card.aggregate([
      { $match: matchFilter },
      { $sample: { size: sampleSize } }
    ]);

    if (questionCards.length === 0) {
      return res.json({
        total: 0,
        mode,
        questions: []
      });
    }

    // Fetch all user cards for generating distractors
    const allUserCards = await Card.find({ user_id: userId }).select('meaning');

    const questions = questionCards.map((card, idx) => {
      const cardId = card._id.toString();
      const q = {
        id: cardId,
        card_id: cardId,
        index: idx + 1,
        word: card.word,
        phonetic: card.phonetic,
        meaning: card.meaning,
        part_of_speech: card.part_of_speech,
        level: card.level || 'B1',
        example_en: card.example_en,
        example_vi: card.example_vi,
        note: card.note,
        status: card.status,
        mode
      };

      if (mode === 'multiple_choice') {
        const uniqueOtherMeanings = Array.from(new Set(
          allUserCards
            .map(c => (c.meaning || '').trim())
            .filter(m => m && m.toLowerCase() !== (card.meaning || '').trim().toLowerCase())
        ));

        const shuffledOthers = uniqueOtherMeanings.sort(() => 0.5 - Math.random());
        const distractors = shuffledOthers.slice(0, 3);

        const fallbackDistractors = ['thay đổi, biến đổi', 'phát triển mạnh mẽ', 'quan sát cẩn thận', 'hoàn thành mục tiêu', 'kết nối các phần', 'chú ý, xem xét'];
        while (distractors.length < 3 && fallbackDistractors.length > 0) {
          const fallback = fallbackDistractors.pop();
          if (fallback && fallback !== card.meaning && !distractors.includes(fallback)) {
            distractors.push(fallback);
          }
        }

        const options = Array.from(new Set([card.meaning, ...distractors])).sort(() => 0.5 - Math.random());
        q.options = options;
      }

      return q;
    });

    res.json({
      total: questions.length,
      mode,
      questions
    });
  } catch (err) {
    console.error('Practice questions error:', err);
    res.status(500).json({ error: 'Lỗi khi tạo bộ câu hỏi luyện tập' });
  }
});

// Check single question answer
router.post('/check', async (req, res) => {
  try {
    const cardId = req.body.card_id || req.body.id;
    const userAnswer = req.body.user_answer !== undefined ? req.body.user_answer : req.body.answer;
    const mode = req.body.mode || 'fill_meaning';
    const userId = req.user.id;

    if (!cardId || !mongoose.Types.ObjectId.isValid(cardId) || userAnswer === undefined) {
      return res.status(400).json({ error: 'Dữ liệu kiểm tra không đầy đủ' });
    }

    const card = await Card.findOne({ _id: cardId, user_id: userId });
    if (!card) {
      return res.status(404).json({ error: 'Không tìm thấy thẻ từ vựng' });
    }

    let isCorrect = false;
    let expectedAnswer = '';

    if (mode === 'fill_meaning' || mode === 'multiple_choice') {
      isCorrect = checkMeaningMatch(userAnswer, card.meaning);
      expectedAnswer = card.meaning;
    } else if (mode === 'fill_word') {
      isCorrect = normalizeString(userAnswer) === normalizeString(card.word);
      expectedAnswer = card.word;
    }

    const newStatus = isCorrect ? 'mastered' : 'learning';
    await Card.findByIdAndUpdate(cardId, { status: newStatus });

    res.json({
      is_correct: isCorrect,
      user_answer: userAnswer,
      expected_answer: expectedAnswer,
      word: card.word,
      phonetic: card.phonetic,
      meaning: card.meaning,
      part_of_speech: card.part_of_speech,
      example_en: card.example_en,
      example_vi: card.example_vi,
      note: card.note
    });
  } catch (err) {
    console.error('Check answer error:', err);
    res.status(500).json({ error: 'Lỗi kiểm tra câu trả lời' });
  }
});

// Submit final quiz results
router.post('/submit', async (req, res) => {
  try {
    const userId = req.user.id;
    const { folder_id, score, mode } = req.body;
    const total_questions = req.body.total_questions || req.body.total || 1;

    if (score === undefined || !total_questions) {
      return res.status(400).json({ error: 'Thông tin kết quả không đầy đủ' });
    }

    const history = await PracticeHistory.create({
      user_id: userId,
      folder_id: (folder_id && mongoose.Types.ObjectId.isValid(folder_id)) ? folder_id : null,
      score,
      total_questions,
      mode: mode || 'fill_meaning'
    });

    const accuracy = Math.round((score / total_questions) * 100);

    res.status(201).json({
      message: 'Đã lưu kết quả bài luyện tập!',
      history_id: history._id.toString(),
      score,
      total_questions,
      accuracy
    });
  } catch (err) {
    console.error('Submit practice error:', err);
    res.status(500).json({ error: 'Lỗi khi lưu kết quả' });
  }
});

module.exports = router;
