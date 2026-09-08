const express = require('express');
const { db } = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// Get all folders for the authenticated user
router.get('/', (req, res) => {
  try {
    const userId = req.user.id;
    const folders = db.prepare(`
      SELECT 
        f.*,
        COUNT(c.id) as card_count,
        SUM(CASE WHEN c.status = 'mastered' THEN 1 ELSE 0 END) as mastered_count,
        SUM(CASE WHEN c.status != 'mastered' THEN 1 ELSE 0 END) as unmastered_count,
        SUM(CASE WHEN c.status = 'learning' THEN 1 ELSE 0 END) as learning_count
      FROM folders f
      LEFT JOIN cards c ON f.id = c.folder_id
      WHERE f.user_id = ?
      GROUP BY f.id
      ORDER BY f.updated_at DESC, f.id DESC
    `).all(userId);

    res.json(folders);
  } catch (err) {
    console.error('Get folders error:', err);
    res.status(500).json({ error: 'Không thể lấy danh sách thư mục' });
  }
});

// Get single folder
router.get('/:id', (req, res) => {
  try {
    const folderId = req.params.id;
    const userId = req.user.id;

    const folder = db.prepare(`
      SELECT 
        f.*,
        COUNT(c.id) as card_count,
        SUM(CASE WHEN c.status = 'mastered' THEN 1 ELSE 0 END) as mastered_count,
        SUM(CASE WHEN c.status != 'mastered' THEN 1 ELSE 0 END) as unmastered_count,
        SUM(CASE WHEN c.status = 'learning' THEN 1 ELSE 0 END) as learning_count
      FROM folders f
      LEFT JOIN cards c ON f.id = c.folder_id
      WHERE f.id = ? AND f.user_id = ?
      GROUP BY f.id
    `).get(folderId, userId);

    if (!folder) {
      return res.status(404).json({ error: 'Không tìm thấy thư mục' });
    }

    res.json(folder);
  } catch (err) {
    console.error('Get folder detail error:', err);
    res.status(500).json({ error: 'Lỗi máy chủ' });
  }
});

// Create folder
router.post('/', (req, res) => {
  try {
    const userId = req.user.id;
    const { name, description = '', color = 'indigo', icon = 'folder' } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Tên thư mục không được để trống' });
    }

    const result = db.prepare(`
      INSERT INTO folders (user_id, name, description, color, icon)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, name.trim(), description.trim(), color, icon);

    const newFolder = db.prepare('SELECT * FROM folders WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({
      message: 'Tạo thư mục thành công!',
      folder: { ...newFolder, card_count: 0, mastered_count: 0, learning_count: 0 }
    });
  } catch (err) {
    console.error('Create folder error:', err);
    res.status(500).json({ error: 'Lỗi khi tạo thư mục' });
  }
});

// Update folder
router.put('/:id', (req, res) => {
  try {
    const folderId = req.params.id;
    const userId = req.user.id;
    const { name, description = '', color = 'indigo', icon = 'folder' } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Tên thư mục không được để trống' });
    }

    const folder = db.prepare('SELECT id FROM folders WHERE id = ? AND user_id = ?').get(folderId, userId);
    if (!folder) {
      return res.status(404).json({ error: 'Không tìm thấy thư mục cần sửa' });
    }

    db.prepare(`
      UPDATE folders
      SET name = ?, description = ?, color = ?, icon = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `).run(name.trim(), description.trim(), color, icon, folderId, userId);

    const updated = db.prepare('SELECT * FROM folders WHERE id = ?').get(folderId);
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
router.delete('/:id', (req, res) => {
  try {
    const folderId = req.params.id;
    const userId = req.user.id;

    const folder = db.prepare('SELECT id FROM folders WHERE id = ? AND user_id = ?').get(folderId, userId);
    if (!folder) {
      return res.status(404).json({ error: 'Không tìm thấy thư mục cần xóa' });
    }

    // Delete cards in this folder first (or CASCADE handles it)
    db.prepare('DELETE FROM cards WHERE folder_id = ? AND user_id = ?').run(folderId, userId);
    db.prepare('DELETE FROM folders WHERE id = ? AND user_id = ?').run(folderId, userId);

    res.json({ message: 'Đã xóa thư mục thành công' });
  } catch (err) {
    console.error('Delete folder error:', err);
    res.status(500).json({ error: 'Lỗi khi xóa thư mục' });
  }
});

// MERGE FOLDERS (Gộp thư mục)
router.post('/merge', (req, res) => {
  try {
    const userId = req.user.id;
    let { 
      source_folder_ids,       // Array of IDs, e.g. [1, 2]
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

    // Determine target folder
    let finalTargetId = target_folder_id;

    if (create_new_folder) {
      if (!new_folder_name || !new_folder_name.trim()) {
        return res.status(400).json({ error: 'Vui lòng nhập tên thư mục mới cần tạo để gộp' });
      }

      const createRes = db.prepare(`
        INSERT INTO folders (user_id, name, description, color, icon)
        VALUES (?, ?, ?, ?, ?)
      `).run(userId, new_folder_name.trim(), new_folder_desc ? new_folder_desc.trim() : 'Thư mục được gộp tự động', new_folder_color, 'layers');

      finalTargetId = Number(createRes.lastInsertRowid);
    } else {
      if (!finalTargetId) {
        return res.status(400).json({ error: 'Vui lòng chọn thư mục đích' });
      }

      const targetFolder = db.prepare('SELECT id, name FROM folders WHERE id = ? AND user_id = ?').get(finalTargetId, userId);
      if (!targetFolder) {
        return res.status(404).json({ error: 'Thư mục đích không tồn tại hoặc không thuộc quyền sở hữu của bạn' });
      }
    }

    // Get all existing words in target folder to avoid duplicates if deduplicate is true
    const existingCardsInTarget = db.prepare('SELECT LOWER(TRIM(word)) as word_lower FROM cards WHERE folder_id = ?').all(finalTargetId);
    const existingWordsSet = new Set(existingCardsInTarget.map(c => c.word_lower));

    let movedCount = 0;
    let skippedCount = 0;

    const insertCardStmt = db.prepare(`
      INSERT INTO cards (folder_id, user_id, word, phonetic, meaning, part_of_speech, level, example_en, example_vi, note, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Process each source folder
    for (const srcId of source_folder_ids) {
      // Don't merge a folder into itself
      if (Number(srcId) === Number(finalTargetId)) continue;

      // Verify ownership
      const srcFolder = db.prepare('SELECT id FROM folders WHERE id = ? AND user_id = ?').get(srcId, userId);
      if (!srcFolder) continue;

      const srcCards = db.prepare('SELECT * FROM cards WHERE folder_id = ? AND user_id = ?').all(srcId, userId);

      for (const card of srcCards) {
        const wordKey = card.word.trim().toLowerCase();
        if (deduplicate && existingWordsSet.has(wordKey)) {
          skippedCount++;
          continue;
        }

        insertCardStmt.run(
          finalTargetId,
          userId,
          card.word,
          card.phonetic,
          card.meaning,
          card.part_of_speech,
          card.level || 'B1',
          card.example_en,
          card.example_vi,
          card.note,
          card.status
        );
        existingWordsSet.add(wordKey);
        movedCount++;
      }

      // If user chose to delete source folders
      if (delete_source) {
        db.prepare('DELETE FROM cards WHERE folder_id = ? AND user_id = ?').run(srcId, userId);
        db.prepare('DELETE FROM folders WHERE id = ? AND user_id = ?').run(srcId, userId);
      }
    }

    // Touch target folder updated_at
    db.prepare('UPDATE folders SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(finalTargetId);

    const targetFolderData = db.prepare(`
      SELECT 
        f.*,
        COUNT(c.id) as card_count,
        SUM(CASE WHEN c.status = 'mastered' THEN 1 ELSE 0 END) as mastered_count,
        SUM(CASE WHEN c.status = 'learning' THEN 1 ELSE 0 END) as learning_count
      FROM folders f
      LEFT JOIN cards c ON f.id = c.folder_id
      WHERE f.id = ?
      GROUP BY f.id
    `).get(finalTargetId);

    res.json({
      message: `Gộp thư mục thành công! Đã thêm ${movedCount} từ vựng mới${skippedCount > 0 ? ` (bỏ qua ${skippedCount} từ bị trùng lặp)` : ''}.`,
      target_folder: targetFolderData,
      moved_count: movedCount,
      skipped_count: skippedCount
    });

  } catch (err) {
    console.error('Merge folders error:', err);
    res.status(500).json({ error: 'Lỗi khi gộp thư mục' });
  }
});

module.exports = router;
