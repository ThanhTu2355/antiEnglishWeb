const express = require('express');
const { db } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// Helper to normalize strings for comparison (accent insensitive & remove extra punctuation)
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

  // If trueMeaning has multiple meanings separated by comma or semicolon
  // e.g., "từ bỏ, ruồng bỏ" -> user inputs "từ bỏ" is valid!
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
router.get('/questions', (req, res) => {
  try {
    const userId = req.user.id;
    const { folder_id, limit = 10, mode = 'fill_meaning', level, status } = req.query;

    let query = 'SELECT * FROM cards WHERE user_id = ?';
    const params = [userId];

    if (folder_id && folder_id !== 'all') {
      query += ' AND folder_id = ?';
      params.push(folder_id);
    }

    if (level && level !== 'all') {
      query += ' AND level = ?';
      params.push(level);
    }

    if (status && status !== 'all') {
      if (status === 'unmastered') {
        query += " AND status != 'mastered'";
      } else {
        query += ' AND status = ?';
        params.push(status);
      }
    }

    query += ' ORDER BY RANDOM() LIMIT ?';
    params.push(Number(limit) || 10);

    const questionsCards = db.prepare(query).all(...params);

    if (questionsCards.length === 0) {
      return res.json({
        total: 0,
        mode,
        questions: []
      });
    }

    // Fetch all user cards for generating distractors if needed
    const allUserCards = db.prepare('SELECT word, meaning FROM cards WHERE user_id = ?').all(userId);

    const questions = questionsCards.map((card, idx) => {
      const q = {
        id: card.id,
        card_id: card.id,
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
        // Collect unique wrong choices
        const uniqueOtherMeanings = Array.from(new Set(
          allUserCards
            .map(c => (c.meaning || '').trim())
            .filter(m => m && m.toLowerCase() !== (card.meaning || '').trim().toLowerCase())
        ));

        // Shuffle other meanings
        const shuffledOthers = uniqueOtherMeanings.sort(() => 0.5 - Math.random());
        const distractors = shuffledOthers.slice(0, 3);

        // If not enough cards in user collection, provide fallback distractors
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
router.post('/check', (req, res) => {
  try {
    const cardId = req.body.card_id || req.body.id;
    const userAnswer = req.body.user_answer !== undefined ? req.body.user_answer : req.body.answer;
    const mode = req.body.mode || 'fill_meaning';
    const userId = req.user.id;

    if (!cardId || userAnswer === undefined) {
      return res.status(400).json({ error: 'Dữ liệu kiểm tra không đầy đủ' });
    }

    const card = db.prepare('SELECT * FROM cards WHERE id = ? AND user_id = ?').get(cardId, userId);
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

    // Update card status dynamically based on answer
    const newStatus = isCorrect ? 'mastered' : 'learning';
    db.prepare('UPDATE cards SET status = ? WHERE id = ?').run(newStatus, cardId);

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
router.post('/submit', (req, res) => {
  try {
    const userId = req.user.id;
    const { folder_id, score, mode } = req.body;
    const total_questions = req.body.total_questions || req.body.total || 1;

    if (score === undefined || !total_questions) {
      return res.status(400).json({ error: 'Thông tin kết quả không đầy đủ' });
    }

    const result = db.prepare(`
      INSERT INTO practice_history (user_id, folder_id, score, total_questions, mode)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, folder_id || null, score, total_questions, mode || 'fill_meaning');

    const accuracy = Math.round((score / total_questions) * 100);

    res.status(201).json({
      message: 'Đã lưu kết quả bài luyện tập!',
      history_id: result.lastInsertRowid,
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
