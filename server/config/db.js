const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../models/User');
const Folder = require('../models/Folder');
const Card = require('../models/Card');

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn('\n⚠️ CẢNH BÁO: Chưa cấu hình MONGODB_URI trong file .env hoặc biến môi trường.');
    console.warn('👉 Vui lòng thêm chuỗi kết nối MongoDB Atlas vào file .env:');
    console.warn('   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/anti_english?retryWrites=true&w=majority\n');
    return false;
  }

  try {
    await mongoose.connect(uri);
    console.log('=========================================');
    console.log('🍃 Đã kết nối thành công tới MongoDB Atlas!');
    console.log('=========================================');

    await seedDemoUserIfMissing();
    return true;
  } catch (err) {
    console.error('❌ Lỗi kết nối MongoDB Atlas:', err.message);
    return false;
  }
}

async function seedDemoUserIfMissing() {
  try {
    const existing = await User.findOne({ username: 'demo' });
    if (!existing) {
      const salt = bcrypt.genSaltSync(10);
      const password_hash = bcrypt.hashSync('123456', salt);

      const demoUser = await User.create({
        username: 'demo',
        email: 'demo@antienglish.com',
        password_hash,
        full_name: 'Học viên Demo'
      });

      console.log('🌱 Đã khởi tạo tài khoản mẫu (demo / 123456) trên MongoDB!');
      await seedDefaultData(demoUser._id);
    }
  } catch (err) {
    console.error('Lỗi khi seed tài khoản demo:', err.message);
  }
}

async function seedDefaultData(userId) {
  try {
    // Folder 1: IELTS Core Vocabulary
    const f1 = await Folder.create({
      user_id: userId,
      name: 'IELTS Core Vocabulary',
      description: 'Từ vựng cốt lõi thường gặp trong bài thi IELTS Reading & Writing',
      color: 'indigo',
      icon: 'sparkles'
    });

    const cardsF1 = [
      {
        folder_id: f1._id,
        user_id: userId,
        word: 'abandon',
        phonetic: '/əˈbændən/',
        meaning: 'từ bỏ, ruồng bỏ',
        part_of_speech: 'verb',
        level: 'B2',
        example_en: 'They had to abandon their car in the snow.',
        example_vi: 'Họ phải bỏ lại xe ô tô trong tuyết.',
        note: 'Collocation: abandon hope (từ bỏ hy vọng)'
      },
      {
        folder_id: f1._id,
        user_id: userId,
        word: 'accumulate',
        phonetic: '/əˈkjuːmjəleɪt/',
        meaning: 'tích lũy, gom góp',
        part_of_speech: 'verb',
        level: 'B2',
        example_en: 'Dust and dirt soon accumulate if a house is not cleaned.',
        example_vi: 'Bụi bẩn sẽ nhanh chóng tích tụ nếu ngôi nhà không được dọn dẹp.',
        note: 'Từ đồng nghĩa: collect, gather'
      },
      {
        folder_id: f1._id,
        user_id: userId,
        word: 'benevolent',
        phonetic: '/bəˈnevələnt/',
        meaning: 'nhân từ, rộng lượng',
        part_of_speech: 'adjective',
        level: 'C1',
        example_en: 'He was a benevolent leader who cared deeply for his people.',
        example_vi: 'Ông ấy là một nhà lãnh đạo nhân từ luôn quan tâm sâu sắc tới nhân dân.',
        note: 'Trái nghĩa: malevolent (hiểm ác)'
      },
      {
        folder_id: f1._id,
        user_id: userId,
        word: 'comprehend',
        phonetic: '/ˌkɑːmprɪˈhend/',
        meaning: 'hiểu thấu, lĩnh hội',
        part_of_speech: 'verb',
        level: 'B2',
        example_en: 'She could not comprehend why he decided to leave so suddenly.',
        example_vi: 'Cô ấy không thể hiểu thấu vì sao anh lại quyết định rời đi đột ngột như vậy.',
        note: 'Danh từ: comprehension'
      },
      {
        folder_id: f1._id,
        user_id: userId,
        word: 'diligent',
        phonetic: '/ˈdɪlɪdʒənt/',
        meaning: 'chăm chỉ, siêng năng',
        part_of_speech: 'adjective',
        level: 'B2',
        example_en: 'He is a diligent student who never misses an assignment.',
        example_vi: 'Cậu ấy là một học sinh chăm chỉ không bao giờ bỏ sót bài tập.',
        note: 'Trạng từ: diligently'
      },
      {
        folder_id: f1._id,
        user_id: userId,
        word: 'eloquent',
        phonetic: '/ˈeləkwənt/',
        meaning: 'hùng biện, lưu loát',
        part_of_speech: 'adjective',
        level: 'C1',
        example_en: 'The speaker delivered an eloquent speech that moved the entire audience.',
        example_vi: 'Diễn giả đã có một bài phát biểu hùng hồn làm lay động toàn bộ khán giả.',
        note: 'Danh từ: eloquence'
      },
      {
        folder_id: f1._id,
        user_id: userId,
        word: 'flourish',
        phonetic: '/ˈflɜːrɪʃ/',
        meaning: 'phát triển thịnh vượng, nở rộ',
        part_of_speech: 'verb',
        level: 'B2',
        example_en: 'Small businesses began to flourish after the new policy.',
        example_vi: 'Các doanh nghiệp nhỏ bắt đầu nở rộ phát triển sau chính sách mới.',
        note: 'Đồng nghĩa: thrive, prosper'
      },
      {
        folder_id: f1._id,
        user_id: userId,
        word: 'gratitude',
        phonetic: '/ˈɡrætɪtuːd/',
        meaning: 'lòng biết ơn',
        part_of_speech: 'noun',
        level: 'B1',
        example_en: 'She expressed her sincere gratitude to all the doctors and nurses.',
        example_vi: 'Cô bày tỏ lòng biết ơn chân thành tới tất cả các y bác sĩ.',
        note: 'Cụm từ: express gratitude to someone'
      }
    ];
    await Card.insertMany(cardsF1);

    // Folder 2: Workplace Communication
    const f2 = await Folder.create({
      user_id: userId,
      name: 'Workplace Communication',
      description: 'Từ vựng tiếng Anh công sở, đàm phán và giao tiếp hàng ngày',
      color: 'emerald',
      icon: 'briefcase'
    });

    const cardsF2 = [
      {
        folder_id: f2._id,
        user_id: userId,
        word: 'collaborate',
        phonetic: '/kəˈlæbəreɪt/',
        meaning: 'hợp tác, cộng tác',
        part_of_speech: 'verb',
        level: 'B1',
        example_en: 'Both departments need to collaborate closely to finish on time.',
        example_vi: 'Cả hai phòng ban cần cộng tác chặt chẽ để hoàn thành đúng hạn.',
        note: 'Cụm từ: collaborate on a project'
      },
      {
        folder_id: f2._id,
        user_id: userId,
        word: 'deadline',
        phonetic: '/ˈdedlaɪn/',
        meaning: 'hạn chót, thời hạn hoàn thành',
        part_of_speech: 'noun',
        level: 'B1',
        example_en: 'We are working extra hours to meet the tight project deadline.',
        example_vi: 'Chúng tôi đang làm thêm giờ để kịp hạn chót dự án rất gấp.',
        note: 'meet a deadline (kịp hạn), miss a deadline (trễ hạn)'
      },
      {
        folder_id: f2._id,
        user_id: userId,
        word: 'negotiate',
        phonetic: '/nɪˈɡoʊʃieɪt/',
        meaning: 'đàm phán, thương lượng',
        part_of_speech: 'verb',
        level: 'B2',
        example_en: 'They managed to negotiate a favorable contract with the client.',
        example_vi: 'Họ đã thương lượng thành công một hợp đồng có lợi với đối tác.',
        note: 'Danh từ: negotiation'
      },
      {
        folder_id: f2._id,
        user_id: userId,
        word: 'productive',
        phonetic: '/prəˈdʌktɪv/',
        meaning: 'năng suất, hiệu quả cao',
        part_of_speech: 'adjective',
        level: 'B1',
        example_en: 'Setting daily goals helps us stay focused and productive.',
        example_vi: 'Đặt mục tiêu hàng ngày giúp chúng ta duy trì sự tập trung và năng suất cao.',
        note: 'Danh từ: productivity'
      },
      {
        folder_id: f2._id,
        user_id: userId,
        word: 'feedback',
        phonetic: '/ˈfiːdbæk/',
        meaning: 'phản hồi, ý kiến đóng góp',
        part_of_speech: 'noun',
        level: 'B1',
        example_en: 'Constructive feedback is essential for personal growth at work.',
        example_vi: 'Phản hồi mang tính xây dựng là điều cốt lõi cho sự phát triển cá nhân tại nơi làm việc.',
        note: 'constructive feedback (phản hồi mang tính xây dựng)'
      },
      {
        folder_id: f2._id,
        user_id: userId,
        word: 'prioritize',
        phonetic: '/praɪˈɔːrətaɪz/',
        meaning: 'ưu tiên, sắp xếp việc quan trọng trước',
        part_of_speech: 'verb',
        level: 'B2',
        example_en: 'You need to prioritize high-impact tasks when your schedule is packed.',
        example_vi: 'Bạn cần ưu tiên các công việc có tác động lớn khi lịch trình quá bận rộn.',
        note: 'Danh từ: priority (sự ưu tiên)'
      }
    ];
    await Card.insertMany(cardsF2);
    console.log('📚 Đã seed xong từ vựng mẫu cho người dùng mới.');
  } catch (err) {
    console.error('Lỗi khi seed từ vựng mặc định:', err.message);
  }
}

module.exports = {
  connectDB,
  seedDefaultData
};
