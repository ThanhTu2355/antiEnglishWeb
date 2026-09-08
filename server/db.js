const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');
const bcrypt = require('bcryptjs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'anti_english.db');
const db = new DatabaseSync(dbPath);

// Enable WAL mode for better concurrency and foreign keys
db.exec(`PRAGMA journal_mode = WAL;`);
db.exec(`PRAGMA foreign_keys = ON;`);

function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS folders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      color TEXT DEFAULT 'indigo',
      icon TEXT DEFAULT 'folder',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      folder_id INTEGER NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      word TEXT NOT NULL,
      phonetic TEXT DEFAULT '',
      meaning TEXT NOT NULL,
      part_of_speech TEXT DEFAULT 'noun',
      example_en TEXT DEFAULT '',
      example_vi TEXT DEFAULT '',
      note TEXT DEFAULT '',
      status TEXT DEFAULT 'new',
      level TEXT DEFAULT 'B1',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS practice_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      folder_id INTEGER,
      score INTEGER NOT NULL,
      total_questions INTEGER NOT NULL,
      mode TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Migrate existing database to have level column if not present
  try {
    db.exec(`ALTER TABLE cards ADD COLUMN level TEXT DEFAULT 'B1';`);
  } catch (e) {
    // Column already exists
  }
  db.exec(`UPDATE cards SET level = 'B1' WHERE level IS NULL OR level = '';`);

  // Seed default demo user if not exists
  const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get('demo');
  if (!existingUser) {
    const salt = bcrypt.genSaltSync(10);
    const password_hash = bcrypt.hashSync('123456', salt);
    const result = db.prepare(`
      INSERT INTO users (username, email, password_hash, full_name)
      VALUES (?, ?, ?, ?)
    `).run('demo', 'demo@antienglish.com', password_hash, 'Học viên Demo');

    const demoUserId = result.lastInsertRowid;
    seedDefaultData(demoUserId);
  }
}

function seedDefaultData(userId) {
  // Folder 1: IELTS Core Vocabulary
  const f1 = db.prepare(`
    INSERT INTO folders (user_id, name, description, color, icon)
    VALUES (?, ?, ?, ?, ?)
  `).run(userId, 'IELTS Core Vocabulary', 'Từ vựng cốt lõi thường gặp trong bài thi IELTS Reading & Writing', 'indigo', 'sparkles');
  const f1Id = f1.lastInsertRowid;

  const cardsF1 = [
    {
      word: 'abandon',
      phonetic: '/əˈbændən/',
      meaning: 'từ bỏ, ruồng bỏ',
      part_of_speech: 'verb',
      example_en: 'They had to abandon their car in the snow.',
      example_vi: 'Họ phải bỏ lại xe ô tô trong tuyết.',
      note: 'Collocation: abandon hope (từ bỏ hy vọng)'
    },
    {
      word: 'accumulate',
      phonetic: '/əˈkjuːmjəleɪt/',
      meaning: 'tích lũy, gom góp',
      part_of_speech: 'verb',
      example_en: 'Dust and dirt soon accumulate if a house is not cleaned.',
      example_vi: 'Bụi bẩn sẽ nhanh chóng tích tụ nếu ngôi nhà không được dọn dẹp.',
      note: 'Từ đồng nghĩa: collect, gather'
    },
    {
      word: 'benevolent',
      phonetic: '/bəˈnevələnt/',
      meaning: 'nhân từ, rộng lượng',
      part_of_speech: 'adjective',
      example_en: 'He was a benevolent leader who cared deeply for his people.',
      example_vi: 'Ông ấy là một nhà lãnh đạo nhân từ luôn quan tâm sâu sắc tới nhân dân.',
      note: 'Trái nghĩa: malevolent (hiểm ác)'
    },
    {
      word: 'comprehend',
      phonetic: '/ˌkɑːmprɪˈhend/',
      meaning: 'hiểu thấu, lĩnh hội',
      part_of_speech: 'verb',
      example_en: 'She could not comprehend why he decided to leave so suddenly.',
      example_vi: 'Cô ấy không thể hiểu thấu vì sao anh lại quyết định rời đi đột ngột như vậy.',
      note: 'Danh từ: comprehension'
    },
    {
      word: 'diligent',
      phonetic: '/ˈdɪlɪdʒənt/',
      meaning: 'chăm chỉ, siêng năng',
      part_of_speech: 'adjective',
      example_en: 'He is a diligent student who never misses an assignment.',
      example_vi: 'Cậu ấy là một học sinh chăm chỉ không bao giờ bỏ sót bài tập.',
      note: 'Trạng từ: diligently'
    },
    {
      word: 'eloquent',
      phonetic: '/ˈeləkwənt/',
      meaning: 'hùng biện, lưu loát',
      part_of_speech: 'adjective',
      example_en: 'The speaker delivered an eloquent speech that moved the entire audience.',
      example_vi: 'Diễn giả đã có một bài phát biểu hùng hồn làm lay động toàn bộ khán giả.',
      note: 'Danh từ: eloquence'
    },
    {
      word: 'flourish',
      phonetic: '/ˈflɜːrɪʃ/',
      meaning: 'phát triển thịnh vượng, nở rộ',
      part_of_speech: 'verb',
      example_en: 'Small businesses began to flourish after the new policy.',
      example_vi: 'Các doanh nghiệp nhỏ bắt đầu nở rộ phát triển sau chính sách mới.',
      note: 'Đồng nghĩa: thrive, prosper'
    },
    {
      word: 'gratitude',
      phonetic: '/ˈɡrætɪtuːd/',
      meaning: 'lòng biết ơn',
      part_of_speech: 'noun',
      example_en: 'She expressed her sincere gratitude to all the doctors and nurses.',
      example_vi: 'Cô bày tỏ lòng biết ơn chân thành tới tất cả các y bác sĩ.',
      note: 'Cụm từ: express gratitude to someone'
    }
  ];

  const insertCard = db.prepare(`
    INSERT INTO cards (folder_id, user_id, word, phonetic, meaning, part_of_speech, level, example_en, example_vi, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const c of cardsF1) {
    insertCard.run(f1Id, userId, c.word, c.phonetic, c.meaning, c.part_of_speech, c.level || 'B2', c.example_en, c.example_vi, c.note);
  }

  // Folder 2: Workplace English
  const f2 = db.prepare(`
    INSERT INTO folders (user_id, name, description, color, icon)
    VALUES (?, ?, ?, ?, ?)
  `).run(userId, 'Workplace Communication', 'Từ vựng tiếng Anh công sở, đàm phán và giao tiếp hàng ngày', 'emerald', 'briefcase');
  const f2Id = f2.lastInsertRowid;

  const cardsF2 = [
    {
      word: 'collaborate',
      phonetic: '/kəˈlæbəreɪt/',
      meaning: 'hợp tác, cộng tác',
      part_of_speech: 'verb',
      example_en: 'Both departments need to collaborate closely to finish on time.',
      example_vi: 'Cả hai phòng ban cần cộng tác chặt chẽ để hoàn thành đúng hạn.',
      note: 'Cụm từ: collaborate on a project'
    },
    {
      word: 'deadline',
      phonetic: '/ˈdedlaɪn/',
      meaning: 'hạn chót, thời hạn hoàn thành',
      part_of_speech: 'noun',
      example_en: 'We are working extra hours to meet the tight project deadline.',
      example_vi: 'Chúng tôi đang làm thêm giờ để kịp hạn chót dự án rất gấp.',
      note: 'meet a deadline (kịp hạn), miss a deadline (trễ hạn)'
    },
    {
      word: 'negotiate',
      phonetic: '/nɪˈɡoʊʃieɪt/',
      meaning: 'đàm phán, thương lượng',
      part_of_speech: 'verb',
      example_en: 'They managed to negotiate a favorable contract with the client.',
      example_vi: 'Họ đã thương lượng thành công một hợp đồng có lợi với đối tác.',
      note: 'Danh từ: negotiation'
    },
    {
      word: 'productive',
      phonetic: '/prəˈdʌktɪv/',
      meaning: 'năng suất, hiệu quả cao',
      part_of_speech: 'adjective',
      example_en: 'Setting daily goals helps us stay focused and productive.',
      example_vi: 'Đặt mục tiêu hàng ngày giúp chúng ta duy trì sự tập trung và năng suất cao.',
      note: 'Danh từ: productivity'
    },
    {
      word: 'feedback',
      phonetic: '/ˈfiːdbæk/',
      meaning: 'phản hồi, ý kiến đóng góp',
      part_of_speech: 'noun',
      example_en: 'Constructive feedback is essential for personal growth at work.',
      example_vi: 'Phản hồi mang tính xây dựng là điều cốt lõi cho sự phát triển cá nhân tại nơi làm việc.',
      note: 'constructive feedback (phản hồi mang tính xây dựng)'
    },
    {
      word: 'prioritize',
      phonetic: '/praɪˈɔːrətaɪz/',
      meaning: 'ưu tiên, sắp xếp việc quan trọng trước',
      part_of_speech: 'verb',
      example_en: 'You need to prioritize high-impact tasks when your schedule is packed.',
      example_vi: 'Bạn cần ưu tiên các công việc có tác động lớn khi lịch trình quá bận rộn.',
      note: 'Danh từ: priority (sự ưu tiên)'
    }
  ];

  for (const c of cardsF2) {
    insertCard.run(f2Id, userId, c.word, c.phonetic, c.meaning, c.part_of_speech, c.level || 'B1', c.example_en, c.example_vi, c.note);
  }
}

// Initialize database schema on import
initSchema();

module.exports = {
  db,
  seedDefaultData
};
