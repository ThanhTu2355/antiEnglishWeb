import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FolderPlus, GitMerge, BookOpen, Award, Layers, Sparkles, 
  Edit3, Trash2, CheckCircle2, Search
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/useAuth';
import FolderModal from '../components/FolderModal';
import MergeFolderModal from '../components/MergeFolderModal';
import ConfirmModal from '../components/ConfirmModal';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { stats, refreshUser } = useAuth();
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modals
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [folderToEdit, setFolderToEdit] = useState(null);
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    loadFolders();
  }, []);

  async function loadFolders() {
    try {
      setLoading(true);
      const data = await api.folders.getAll();
      setFolders(data);
    } catch (err) {
      console.error('Failed to load folders:', err);
    } finally {
      setLoading(false);
    }
  }

  function showToast(msg) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  }

  function handleDeleteFolderClick(e, folder) {
    e.stopPropagation();
    setFolderToDelete(folder);
  }

  async function handleConfirmDeleteFolder() {
    if (!folderToDelete) return;
    try {
      setIsDeleting(true);
      await api.folders.delete(folderToDelete.id);
      showToast(`Đã xóa thư mục "${folderToDelete.name}"`);
      setFolderToDelete(null);
      await loadFolders();
      refreshUser?.();
    } catch (err) {
      showToast(err.message || 'Lỗi khi xóa thư mục');
    } finally {
      setIsDeleting(false);
    }
  }

  const filteredFolders = folders.filter(f => 
    f.name.toLowerCase().includes(search.toLowerCase()) || 
    (f.description && f.description.toLowerCase().includes(search.toLowerCase()))
  );

  const totalWords = folders.reduce((sum, f) => sum + (f.card_count || 0), 0);
  const masteredWords = folders.reduce((sum, f) => sum + (f.mastered_count || 0), 0);
  const masteryPercentage = totalWords > 0 ? Math.round((masteredWords / totalWords) * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in transition-colors duration-200">
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl shadow-emerald-900/20 flex items-center space-x-2 animate-bounce">
          <CheckCircle2 className="w-5 h-5" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Hero Stats Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 rounded-3xl p-6 sm:p-8 shadow-xl shadow-indigo-900/20 text-white border border-indigo-500/20">
        <div className="relative z-10 flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6">
          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white text-xs font-bold uppercase tracking-wider mb-3 backdrop-blur-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Trung tâm ôn luyện AntiEnglish</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Quản lý Từ vựng & Luyện tập
            </h1>
            <p className="text-sm text-indigo-200/90 mt-1 max-w-xl">
              Học theo phương pháp lặp lại ngắt quãng với Flashcard 3D sinh động và bài tập Điền nghĩa chuẩn xác.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 w-full xl:w-auto shrink-0">
            <div className="bg-black/20 backdrop-blur-sm border border-white/15 rounded-2xl p-3 sm:p-4 text-center">
              <span className="text-xs text-indigo-200 font-medium block">Thư mục</span>
              <span className="text-2xl font-extrabold text-white mt-1 block">{folders.length}</span>
            </div>

            <div className="bg-black/20 backdrop-blur-sm border border-white/15 rounded-2xl p-3 sm:p-4 text-center">
              <span className="text-xs text-indigo-200 font-medium block">Tổng từ</span>
              <span className="text-2xl font-extrabold text-amber-300 mt-1 block">{totalWords}</span>
            </div>

            <div className="bg-black/20 backdrop-blur-sm border border-white/15 rounded-2xl p-3 sm:p-4 text-center">
              <span className="text-xs text-rose-200 font-medium block">Chưa thuộc</span>
              <span className="text-2xl font-extrabold text-rose-300 mt-1 block">{totalWords - masteredWords}</span>
            </div>

            <div className="bg-black/20 backdrop-blur-sm border border-white/15 rounded-2xl p-3 sm:p-4 text-center">
              <span className="text-xs text-emerald-200 font-medium block">Đã thuộc</span>
              <span className="text-2xl font-extrabold text-emerald-400 mt-1 block">{masteryPercentage}%</span>
            </div>
          </div>
        </div>

        {/* Global Mastery progress bar */}
        <div className="mt-6 pt-5 border-t border-white/15 flex items-center gap-4">
          <div className="flex-1 bg-black/25 rounded-full h-2.5 overflow-hidden">
            <div 
              className="bg-emerald-400 h-full rounded-full transition-all duration-500" 
              style={{ width: `${masteryPercentage}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-white whitespace-nowrap">
            {masteredWords} / {totalWords} từ vựng đã nắm vững
          </span>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-theme-subtle absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm thư mục..."
            className="w-full pl-10 pr-4 py-2.5 bg-surface border border-theme rounded-2xl text-sm text-theme-main placeholder:text-theme-subtle shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
          {/* Merge Folders Button */}
          <button
            onClick={() => setIsMergeModalOpen(true)}
            disabled={folders.length < 2}
            title={folders.length < 2 ? 'Cần có ít nhất 2 thư mục để gộp' : 'Gộp các thư mục từ vựng'}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs sm:text-sm flex items-center space-x-2 shadow-md shadow-purple-600/20 transition-all cursor-pointer disabled:opacity-40"
          >
            <GitMerge className="w-4 h-4" />
            <span>Gộp Thư Mục</span>
          </button>

          {/* New Folder Button */}
          <button
            onClick={() => {
              setFolderToEdit(null);
              setIsFolderModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs sm:text-sm flex items-center space-x-2 shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
          >
            <FolderPlus className="w-4 h-4" />
            <span>Tạo Thư Mục Mới</span>
          </button>
        </div>
      </div>

      {/* Folders Grid */}
      {loading ? (
        <div className="py-20 text-center text-theme-subtle">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="font-medium">Đang tải danh sách thư mục...</p>
        </div>
      ) : filteredFolders.length === 0 ? (
        <div className="text-center py-16 bg-surface border border-theme rounded-3xl p-8 shadow-xs">
          <Layers className="w-12 h-12 text-theme-subtle mx-auto mb-3" />
          <h3 className="text-lg font-bold text-theme-main">Chưa có thư mục nào</h3>
          <p className="text-sm text-theme-muted max-w-md mx-auto mt-1 mb-6">
            Tạo thư mục đầu tiên để tổ chức từ vựng theo chủ đề như IELTS, TOEIC hoặc Giao tiếp.
          </p>
          <button
            onClick={() => {
              setFolderToEdit(null);
              setIsFolderModalOpen(true);
            }}
            className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-2xl shadow-md shadow-indigo-600/20 hover:bg-indigo-500 transition-all inline-flex items-center gap-2 cursor-pointer"
          >
            <FolderPlus className="w-4 h-4" />
            <span>Tạo Thư Mục Đầu Tiên</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFolders.map(folder => {
            const cardCount = folder.card_count || 0;
            const mastered = folder.mastered_count || 0;
            const unmastered = folder.unmastered_count !== undefined ? folder.unmastered_count : (cardCount - mastered);
            const percent = cardCount > 0 ? Math.round((mastered / cardCount) * 100) : 0;

            return (
              <div
                key={folder.id}
                onClick={() => navigate(`/folders/${folder.id}`)}
                className="group relative bg-surface border border-theme hover:border-indigo-500/60 rounded-3xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-pointer flex flex-col justify-between"
              >
                <div>
                  {/* Top row */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                        <Layers className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-theme-main text-base group-hover:text-indigo-400 transition-colors line-clamp-1">
                          {folder.name}
                        </h3>
                        <span className="text-xs text-theme-subtle font-medium">
                          {cardCount} từ {unmastered > 0 ? `• ${unmastered} chưa thuộc` : ''}
                        </span>
                      </div>
                    </div>

                    {/* Edit / Delete actions */}
                    <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => {
                          setFolderToEdit(folder);
                          setIsFolderModalOpen(true);
                        }}
                        title="Chỉnh sửa thư mục"
                        className="p-1.5 text-theme-subtle hover:text-indigo-400 hover:bg-surface-hover rounded-lg transition-colors cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteFolderClick(e, folder)}
                        title="Xóa thư mục"
                        className="p-1.5 text-theme-subtle hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-theme-muted line-clamp-2 min-h-[32px] mb-4">
                    {folder.description || 'Chưa có mô tả cho thư mục này.'}
                  </p>

                  {/* Mastery mini progress */}
                  <div className="space-y-1.5 mb-6">
                    <div className="flex justify-between text-[11px] text-theme-subtle font-medium">
                      <span>Độ thành thạo ({mastered}/{cardCount})</span>
                      <span className="text-emerald-400 font-bold">{percent}%</span>
                    </div>
                    <div className="w-full bg-input-theme rounded-full h-2 overflow-hidden border border-theme-subtle">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Bottom Action Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-4 border-t border-theme-subtle" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => navigate(`/flashcards/${folder.id}`)}
                    disabled={cardCount === 0}
                    className="py-2.5 px-3 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Học Flashcard</span>
                  </button>

                  <button
                    onClick={() => navigate(`/practice/${folder.id}`)}
                    disabled={cardCount === 0}
                    className="py-2.5 px-3 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-400 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-40"
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>Điền nghĩa</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Folder Confirmation Pop-up */}
      <ConfirmModal
        isOpen={!!folderToDelete}
        title="Xác nhận xóa thư mục"
        message={
          <span>
            Bạn có chắc chắn muốn xóa thư mục <strong className="text-theme-main font-bold">"{folderToDelete?.name}"</strong> cùng toàn bộ <span className="text-amber-400 font-bold">{folderToDelete?.card_count || 0} từ vựng</span> bên trong? Hành động này không thể hoàn tác.
          </span>
        }
        confirmText="Xác nhận xóa"
        cancelText="Hủy bỏ"
        type="danger"
        loading={isDeleting}
        onConfirm={handleConfirmDeleteFolder}
        onClose={() => setFolderToDelete(null)}
      />

      {/* Modals */}
      <FolderModal
        isOpen={isFolderModalOpen}
        onClose={() => setIsFolderModalOpen(false)}
        folderToEdit={folderToEdit}
        onSaved={() => {
          showToast(folderToEdit ? 'Đã cập nhật thư mục' : 'Đã tạo thư mục mới!');
          loadFolders();
          refreshUser?.();
        }}
      />

      <MergeFolderModal
        isOpen={isMergeModalOpen}
        onClose={() => setIsMergeModalOpen(false)}
        folders={folders}
        onMerged={(msg) => {
          showToast(msg);
          loadFolders();
          refreshUser?.();
        }}
      />
    </div>
  );
}
