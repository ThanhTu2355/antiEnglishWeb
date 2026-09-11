const express = require('express');
const mongoose = require('mongoose');
const Folder = require('../models/Folder');
const Card = require('../models/Card');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// Get all folders for the authenticated user
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const folders = await Folder.find({ user_id: userId }).sort({ updated_at: -1, _id: -1 });

    const folderIds = folders.map(f => f._id);
    const cardAgg = await Card.aggregate([
      { $match: { folder_id: { $in: folderIds } } },
      {
        $group: {
          _id: '$folder_id',
          card_count: { $sum: 1 },
          mastered_count: { $sum: { $cond: [{ $eq: ['$status', 'mastered'] }, 1, 0] } },
          unmastered_count: { $sum: { $cond: [{ $ne: ['$status', 'mastered'] }, 1, 0] } },
          learning_count: { $sum: { $cond: [{ $eq: ['$status', 'learning'] }, 1, 0] } }
        }
      }
    ]);

    const statsMap = {};
    cardAgg.forEach(item => {
      statsMap[item._id.toString()] = item;
    });

    const result = folders.map(f => {
      const s = statsMap[f._id.toString()] || {};
      return {
        ...f.toJSON(),
        card_count: s.card_count || 0,
        mastered_count: s.mastered_count || 0,
        unmastered_count: s.unmastered_count || 0,
        learning_count: s.learning_count || 0
      };
    });

    res.json(result);
  } catch (err) {
    console.error('Get folders error:', err);
    res.status(500).json({ error: 'Không thể lấy danh sách thư mục' });
  }
});

// Get all-cards virtual folder summary
router.get('/all', async (req, res) => {
  try {
    const userId = req.user.id;
    const cardAgg = await Card.aggregate([
      { $match: { user_id: new mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          card_count: { $sum: 1 },
          new_count: { $sum: { $cond: [{ $eq: ['$status', 'new'] }, 1, 0] } },
          mastered_count: { $sum: { $cond: [{ $eq: ['$status', 'mastered'] }, 1, 0] } },
          unmastered_count: { $sum: { $cond: [{ $eq: ['$status', 'unmastered'] }, 1, 0] } },
          learning_count: { $sum: { $cond: [{ $eq: ['$status', 'learning'] }, 1, 0] } }
        }
      }
    ]);

    const s = cardAgg[0] || {};
    res.json({
      id: 'all',
      _id: 'all',
      name: 'Tất cả từ vựng',
      description: 'Thư mục tổng hợp chứa toàn bộ từ vựng từ tất cả các thư mục của bạn.',
      color: 'indigo',
      icon: 'layers',
      is_all_folder: true,
      card_count: s.card_count || 0,
      new_count: s.new_count || 0,
      mastered_count: s.mastered_count || 0,
      unmastered_count: s.unmastered_count || 0,
      learning_count: s.learning_count || 0
    });
  } catch (err) {
    console.error('Get all-folder summary error:', err);
    res.status(500).json({ error: 'Lỗi máy chủ' });
  }
});

// Get single folder
router.get('/:id', async (req, res) => {
  try {
    const folderId = req.params.id;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(folderId)) {
      return res.status(404).json({ error: 'ID thư mục không hợp lệ' });
    }

    const folder = await Folder.findOne({ _id: folderId, user_id: userId });
    if (!folder) {
      return res.status(404).json({ error: 'Không tìm thấy thư mục' });
    }

    const cardAgg = await Card.aggregate([
      { $match: { folder_id: folder._id } },
      {
        $group: {
          _id: '$folder_id',
          card_count: { $sum: 1 },
          mastered_count: { $sum: { $cond: [{ $eq: ['$status', 'mastered'] }, 1, 0] } },
          unmastered_count: { $sum: { $cond: [{ $ne: ['$status', 'mastered'] }, 1, 0] } },
          learning_count: { $sum: { $cond: [{ $eq: ['$status', 'learning'] }, 1, 0] } }
        }
      }
    ]);

    const s = cardAgg[0] || {};
    res.json({
      ...folder.toJSON(),
      card_count: s.card_count || 0,
      mastered_count: s.mastered_count || 0,
      unmastered_count: s.unmastered_count || 0,
      learning_count: s.learning_count || 0
    });
  } catch (err) {
    console.error('Get folder detail error:', err);
    res.status(500).json({ error: 'Lỗi máy chủ' });
  }
});

// Create folder
router.post('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, description = '', color = 'indigo', icon = 'folder' } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Tên thư mục không được để trống' });
    }

    const newFolder = await Folder.create({
      user_id: userId,
      name: name.trim(),
      description: description.trim(),
      color,
      icon
    });

    res.status(201).json({
      message: 'Tạo thư mục thành công!',
      folder: { ...newFolder.toJSON(), card_count: 0, mastered_count: 0, unmastered_count: 0, learning_count: 0 }
    });
  } catch (err) {
    console.error('Create folder error:', err);
    res.status(500).json({ error: 'Lỗi khi tạo thư mục' });
  }
});

// Update folder
router.put('/:id', async (req, res) => {
  try {
    const folderId = req.params.id;
    const userId = req.user.id;
    const { name, description = '', color = 'indigo', icon = 'folder' } = req.body;

    if (!mongoose.Types.ObjectId.isValid(folderId)) {
      return res.status(404).json({ error: 'ID thư mục không hợp lệ' });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Tên thư mục không được để trống' });
    }

    const updated = await Folder.findOneAndUpdate(
      { _id: folderId, user_id: userId },
      {
        name: name.trim(),
        description: description.trim(),
        color,
        icon,
        updated_at: new Date()
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: 'Không tìm thấy thư mục cần sửa' });
    }

    res.json({
      message: 'Cập nhật thư mục thành công!',
      folder: updated
    });
  } catch (err) {
    console.error('Update folder error:', err);
    res.status(500).json({ error: 'Lỗi khi cập nhật thư mục' });
  }
});

// Delete folder
router.delete('/:id', async (req, res) => {
  try {
    const folderId = req.params.id;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(folderId)) {
      return res.status(404).json({ error: 'ID thư mục không hợp lệ' });
    }

    const folder = await Folder.findOneAndDelete({ _id: folderId, user_id: userId });
    if (!folder) {
      return res.status(404).json({ error: 'Không tìm thấy thư mục cần xóa' });
    }

    // Delete cards in this folder
    await Card.deleteMany({ folder_id: folderId, user_id: userId });

    res.json({ message: 'Đã xóa thư mục thành công' });
  } catch (err) {
    console.error('Delete folder error:', err);
    res.status(500).json({ error: 'Lỗi khi xóa thư mục' });
  }
});

// MERGE FOLDERS (Gộp thư mục)
router.post('/merge', async (req, res) => {
  try {
    const userId = req.user.id;
    let { 
      source_folder_ids,       // Array of IDs
      target_folder_id,        // Target ID if merging into existing
      create_new_folder,       // boolean
      new_folder_name,         // string if create_new_folder is true
      new_folder_desc,         // string
      new_folder_color = 'purple',
      delete_source = false,   // boolean
      deduplicate = true       // boolean
    } = req.body;

    if (!Array.isArray(source_folder_ids) || source_folder_ids.length === 0) {
      return res.status(400).json({ error: 'Vui lòng chọn ít nhất 1 thư mục nguồn để gộp' });
    }

    let finalTargetId = target_folder_id;

    if (create_new_folder) {
      if (!new_folder_name || !new_folder_name.trim()) {
        return res.status(400).json({ error: 'Vui lòng nhập tên thư mục mới cần tạo để gộp' });
      }

      const newFolder = await Folder.create({
        user_id: userId,
        name: new_folder_name.trim(),
        description: new_folder_desc ? new_folder_desc.trim() : 'Thư mục được gộp tự động',
        color: new_folder_color,
        icon: 'layers'
      });

      finalTargetId = newFolder._id.toString();
    } else {
      if (!finalTargetId || !mongoose.Types.ObjectId.isValid(finalTargetId)) {
        return res.status(400).json({ error: 'Vui lòng chọn thư mục đích hợp lệ' });
      }

      const targetFolder = await Folder.findOne({ _id: finalTargetId, user_id: userId });
      if (!targetFolder) {
        return res.status(404).json({ error: 'Thư mục đích không tồn tại hoặc không thuộc quyền sở hữu của bạn' });
      }
    }

    // Existing words in target folder to deduplicate
    const existingCardsInTarget = await Card.find({ folder_id: finalTargetId }).select('word');
    const existingWordsSet = new Set(existingCardsInTarget.map(c => c.word.trim().toLowerCase()));

    let movedCount = 0;
    let skippedCount = 0;

    for (const srcId of source_folder_ids) {
      if (srcId.toString() === finalTargetId.toString()) continue;

      if (!mongoose.Types.ObjectId.isValid(srcId)) continue;
      const srcFolder = await Folder.findOne({ _id: srcId, user_id: userId });
      if (!srcFolder) continue;

      const srcCards = await Card.find({ folder_id: srcId, user_id: userId });

      for (const card of srcCards) {
        const wordKey = card.word.trim().toLowerCase();
        if (deduplicate && existingWordsSet.has(wordKey)) {
          skippedCount++;
          continue;
        }

        await Card.create({
          folder_id: finalTargetId,
          user_id: userId,
          word: card.word,
          phonetic: card.phonetic,
          meaning: card.meaning,
          part_of_speech: card.part_of_speech,
          level: card.level || 'B1',
          example_en: card.example_en,
          example_vi: card.example_vi,
          note: card.note,
          status: card.status
        });

        existingWordsSet.add(wordKey);
        movedCount++;
      }

      if (delete_source) {
        await Card.deleteMany({ folder_id: srcId, user_id: userId });
        await Folder.deleteOne({ _id: srcId, user_id: userId });
      }
    }

    await Folder.findByIdAndUpdate(finalTargetId, { updated_at: new Date() });

    const targetFolderDoc = await Folder.findById(finalTargetId);
    const cardCount = await Card.countDocuments({ folder_id: finalTargetId });
    const masteredCount = await Card.countDocuments({ folder_id: finalTargetId, status: 'mastered' });
    const learningCount = await Card.countDocuments({ folder_id: finalTargetId, status: 'learning' });

    res.json({
      message: `Gộp thư mục thành công! Đã thêm ${movedCount} từ vựng mới${skippedCount > 0 ? ` (bỏ qua ${skippedCount} từ bị trùng lặp)` : ''}.`,
      target_folder: {
        ...targetFolderDoc.toJSON(),
        card_count: cardCount,
        mastered_count: masteredCount,
        learning_count: learningCount
      },
      moved_count: movedCount,
      skipped_count: skippedCount
    });

  } catch (err) {
    console.error('Merge folders error:', err);
    res.status(500).json({ error: 'Lỗi khi gộp thư mục' });
  }
});

module.exports = router;
