import React, { useState, useEffect } from 'react';
import { X, Folder } from 'lucide-react';
import { api } from '../api/client';

const COLORS = [
  { id: 'indigo', name: 'Xanh Chàm', bg: 'bg-indigo-500' },
  { id: 'purple', name: 'Tím', bg: 'bg-purple-500' },
  { id: 'emerald', name: 'Xanh Lá', bg: 'bg-emerald-500' },
  { id: 'rose', name: 'Hồng Đỏ', bg: 'bg-rose-500' },
  { id: 'amber', name: 'Vàng Cam', bg: 'bg-amber-500' },
  { id: 'sky', name: 'Xanh Dương', bg: 'bg-sky-500' },
];

export default function FolderModal({ isOpen, onClose, folderToEdit, onSaved }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('indigo');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (folderToEdit) {
      setName(folderToEdit.name || '');
      setDescription(folderToEdit.description || '');
      setColor(folderToEdit.color || 'indigo');
    } else {
      setName('');
      setDescription('');
      setColor('indigo');
    }
    setError('');
  }, [folderToEdit, isOpen]);

  if (!isOpen) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Vui lòng nhập tên thư mục');
      return;
    }

    try {
      setLoading(true);
      setError('');
      if (folderToEdit) {
        await api.folders.update(folderToEdit.id, {
          name: name.trim(),
          description: description.trim(),
          color
        });
      } else {
        await api.folders.create({
          name: name.trim(),
          description: description.trim(),
          color
        });
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-md bg-surface border border-theme rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-theme bg-surface">
          <h3 className="text-lg font-bold text-theme-main flex items-center gap-2">
            <Folder className="w-5 h-5 text-indigo-400" />
            {folderToEdit ? 'Chỉnh sửa thư mục' : 'Tạo thư mục từ vựng mới'}
          </h3>
          <button
            onClick={onClose}
            className="text-theme-subtle hover:text-theme-main p-1.5 rounded-xl hover:bg-surface-hover transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-400 text-sm font-semibold">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-theme-main uppercase tracking-wider mb-1.5">
              Tên thư mục <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: IELTS Band 7.0, Từ vựng chuyên ngành..."
              className="w-full px-4 py-2.5 bg-input-theme border border-theme rounded-xl text-theme-main placeholder:text-theme-subtle font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-theme-main uppercase tracking-wider mb-1.5">
              Mô tả ngắn
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ghi chú về mục tiêu học tập của thư mục này..."
              className="w-full px-4 py-2.5 bg-input-theme border border-theme rounded-xl text-theme-main placeholder:text-theme-subtle focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none text-sm"
            />
          </div>

          {/* Color Tag */}
          <div>
            <label className="block text-xs font-bold text-theme-main uppercase tracking-wider mb-2">
              Màu chủ đề
            </label>
            <div className="flex items-center space-x-3">
              {COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setColor(c.id)}
                  title={c.name}
                  className={`w-7 h-7 rounded-full ${c.bg} transition-all cursor-pointer ${
                    color === c.id ? 'ring-4 ring-indigo-500/50 scale-110' : 'opacity-70 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
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
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold shadow-md shadow-indigo-600/25 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Đang lưu...' : folderToEdit ? 'Cập nhật' : 'Tạo thư mục'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
