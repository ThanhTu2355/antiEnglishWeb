import React, { useState } from 'react';
import { X, GitMerge, AlertCircle, Trash2 } from 'lucide-react';
import { api } from '../api/client';

export default function MergeFolderModal({ isOpen, onClose, folders, onMerged }) {
  const [selectedSourceIds, setSelectedSourceIds] = useState([]);
  const [targetType, setTargetType] = useState('existing'); // 'existing' | 'new'
  const [targetFolderId, setTargetFolderId] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDesc, setNewFolderDesc] = useState('');
  const [deleteSource, setDeleteSource] = useState(false);
  const [deduplicate, setDeduplicate] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const toggleSourceFolder = (id) => {
    setSelectedSourceIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Calculate total cards in selected source folders
  const totalCardsInSources = folders
    .filter(f => selectedSourceIds.includes(f.id))
    .reduce((sum, f) => sum + (f.card_count || 0), 0);

  // Remaining folders available as target
  const availableTargetFolders = folders.filter(f => !selectedSourceIds.includes(f.id));

  async function handleMerge(e) {
    e.preventDefault();
    if (selectedSourceIds.length === 0) {
      setError('Vui lòng chọn ít nhất 1 thư mục nguồn để gộp');
      return;
    }

    if (targetType === 'existing' && !targetFolderId) {
      setError('Vui lòng chọn thư mục đích để chứa các từ vựng gộp');
      return;
    }

    if (targetType === 'new' && !newFolderName.trim()) {
      setError('Vui lòng nhập tên cho thư mục mới');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const payload = {
        source_folder_ids: selectedSourceIds,
        create_new_folder: targetType === 'new',
        target_folder_id: targetType === 'existing' ? Number(targetFolderId) : null,
        new_folder_name: newFolderName.trim(),
        new_folder_desc: newFolderDesc.trim(),
        delete_source: deleteSource,
        deduplicate: deduplicate
      };

      const result = await api.folders.merge(payload);
      onMerged(result.message);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-xl bg-surface border border-theme rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-theme bg-surface">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-500/15 text-purple-400 border border-purple-500/30 rounded-xl">
              <GitMerge className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-theme-main">Gộp thư mục từ vựng</h3>
              <p className="text-xs text-theme-subtle font-medium">Kết hợp từ vựng từ nhiều thư mục thành một bộ tập trung</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-theme-subtle hover:text-theme-main p-1.5 rounded-xl hover:bg-surface-hover transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleMerge} className="p-6 overflow-y-auto space-y-6">
          {error && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-400 text-sm font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Step 1: Select Source Folders */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-theme-main uppercase tracking-wider">
                1. Chọn các thư mục nguồn cần gộp:
              </label>
              <span className="text-xs text-purple-400 font-bold bg-purple-500/15 px-2 py-0.5 rounded border border-purple-500/30">
                Đã chọn {selectedSourceIds.length} thư mục ({totalCardsInSources} từ)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto p-1">
              {folders.map(folder => {
                const isSelected = selectedSourceIds.includes(folder.id);
                return (
                  <div
                    key={folder.id}
                    onClick={() => toggleSourceFolder(folder.id)}
                    className={`p-3 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-purple-500/15 border-purple-500 text-purple-300 shadow-xs'
                        : 'bg-surface border-theme text-theme-main hover:bg-surface-hover'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 truncate">
                      <div className="w-3 h-3 rounded-full bg-indigo-500 flex-shrink-0" />
                      <span className="text-sm font-bold truncate">{folder.name}</span>
                    </div>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-tag-theme text-theme-subtle font-semibold flex-shrink-0 ml-2 border border-theme-subtle">
                      {folder.card_count || 0} từ
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 2: Choose Destination */}
          <div className="border-t border-theme-subtle pt-5">
            <label className="block text-xs font-bold text-theme-main uppercase tracking-wider mb-3">
              2. Đích đến sau khi gộp:
            </label>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                type="button"
                onClick={() => setTargetType('existing')}
                className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                  targetType === 'existing'
                    ? 'bg-indigo-500/15 border-indigo-500 text-indigo-300'
                    : 'bg-surface border-theme text-theme-muted hover:bg-surface-hover'
                }`}
              >
                <span className="block text-sm font-bold mb-1">Gộp vào thư mục có sẵn</span>
                <span className="block text-xs text-theme-subtle">Chọn 1 thư mục hiện tại làm đích</span>
              </button>

              <button
                type="button"
                onClick={() => setTargetType('new')}
                className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                  targetType === 'new'
                    ? 'bg-indigo-500/15 border-indigo-500 text-indigo-300'
                    : 'bg-surface border-theme text-theme-muted hover:bg-surface-hover'
                }`}
              >
                <span className="block text-sm font-bold mb-1">Tạo thư mục mới</span>
                <span className="block text-xs text-theme-subtle">Tập hợp từ vựng vào một bộ mới</span>
              </button>
            </div>

            {targetType === 'existing' ? (
              <div>
                <label className="block text-xs font-bold text-theme-main mb-1">Chọn thư mục nhận:</label>
                {availableTargetFolders.length === 0 ? (
                  <p className="text-xs text-amber-300 p-3 bg-amber-500/15 rounded-xl border border-amber-500/30 font-medium">
                    Bạn đã chọn hết tất cả thư mục làm nguồn. Vui lòng chọn "Tạo thư mục mới" hoặc bỏ chọn bớt thư mục nguồn.
                  </p>
                ) : (
                  <select
                    value={targetFolderId}
                    onChange={(e) => setTargetFolderId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-input-theme border border-theme rounded-xl text-theme-main text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Chọn thư mục đích --</option>
                    {availableTargetFolders.map(f => (
                      <option key={f.id} value={f.id}>
                        {f.name} (hiện có {f.card_count || 0} từ)
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  type="text"
                  required
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Tên thư mục mới sau khi gộp..."
                  className="w-full px-4 py-2.5 bg-input-theme border border-theme rounded-xl text-theme-main placeholder:text-theme-subtle text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <input
                  type="text"
                  value={newFolderDesc}
                  onChange={(e) => setNewFolderDesc(e.target.value)}
                  placeholder="Mô tả thư mục mới (tùy chọn)..."
                  className="w-full px-4 py-2.5 bg-input-theme border border-theme rounded-xl text-theme-main placeholder:text-theme-subtle text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}
          </div>

          {/* Step 3: Options */}
          <div className="border-t border-theme-subtle pt-5 space-y-3">
            <label className="block text-xs font-bold text-theme-main uppercase tracking-wider">
              3. Tùy chọn nâng cao:
            </label>

            <label className="flex items-center space-x-3 p-3 rounded-2xl bg-input-theme border border-theme-subtle cursor-pointer hover:border-theme transition-colors">
              <input
                type="checkbox"
                checked={deduplicate}
                onChange={(e) => setDeduplicate(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="text-xs font-bold text-theme-main block">Tự động loại bỏ từ trùng lặp</span>
                <span className="text-[11px] text-theme-subtle block">Nếu từ vựng đã tồn tại ở thư mục đích, chỉ giữ lại 1 bản ghi</span>
              </div>
            </label>

            <label className="flex items-center space-x-3 p-3 rounded-2xl bg-input-theme border border-theme-subtle cursor-pointer hover:border-theme transition-colors">
              <input
                type="checkbox"
                checked={deleteSource}
                onChange={(e) => setDeleteSource(e.target.checked)}
                className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
              />
              <div>
                <span className="text-xs font-bold text-rose-400 block flex items-center gap-1">
                  <Trash2 className="w-3.5 h-3.5" />
                  Xóa các thư mục nguồn sau khi gộp thành công
                </span>
                <span className="text-[11px] text-theme-subtle block">Dọn dẹp thư mục cũ để tránh lộn xộn danh sách</span>
              </div>
            </label>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-theme-subtle">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-theme hover:bg-surface-hover text-theme-muted hover:text-theme-main text-sm font-semibold transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading || selectedSourceIds.length === 0}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-sm font-bold shadow-md shadow-purple-600/25 transition-all cursor-pointer disabled:opacity-40"
            >
              {loading ? 'Đang hợp nhất...' : 'Bắt đầu Gộp Thư Mục'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
