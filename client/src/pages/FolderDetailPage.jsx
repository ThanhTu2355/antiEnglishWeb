import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Plus, UploadCloud, BookOpen, Award, 
  Search, Edit3, Trash2, CheckCircle2 
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/useAuth';
import CardModal from '../components/CardModal';
import BulkImportModal from '../components/BulkImportModal';
import ConfirmModal from '../components/ConfirmModal';
import TTSButton from '../components/TTSButton';
import { CEFR_LEVELS, getLevelBadge, getPartOfSpeechBadge } from '../utils/levels';

export default function FolderDetailPage() {
  const { id: folderId } = useParams();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const [folder, setFolder] = useState(null);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');

  // Modals
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [cardToEdit, setCardToEdit] = useState(null);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    loadData();
  }, [folderId]);

  async function loadData() {
    try {
      setLoading(true);
      const [fData, cData] = await Promise.all([
        api.folders.getById(folderId),
        api.cards.getAll({ folder_id: folderId })
      ]);
      setFolder(fData);
      setCards(cData);
    } catch (err) {
      console.error('Failed to load folder details:', err);
    } finally {
      setLoading(false);
    }
  }

  function showToast(msg) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  }

  function handleDeleteCardClick(card) {
    setCardToDelete(card);
  }

  async function handleConfirmDeleteCard() {
    if (!cardToDelete) return;
    try {
      setIsDeleting(true);
      await api.cards.delete(cardToDelete.id);
      showToast(`Đã xóa từ "${cardToDelete.word}"`);
      setCardToDelete(null);
      await loadData();
      refreshUser?.();
    } catch (err) {
      alert(err.message);
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleToggleStatus(card) {
    const nextStatus = card.status === 'mastered' ? 'new' : card.status === 'learning' ? 'mastered' : 'learning';
    try {
      await api.cards.updateStatus(card.id, nextStatus);
      setCards(prev => prev.map(c => c.id === card.id ? { ...c, status: nextStatus } : c));
      refreshUser?.();
    } catch (err) {
      console.error('Status toggle error:', err);
    }
  }

  const filteredCards = cards.filter(c => {
    const matchesSearch = 
      c.word.toLowerCase().includes(search.toLowerCase()) ||
      c.meaning.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'unmastered' ? c.status !== 'mastered' : c.status === statusFilter);
    const matchesLevel = levelFilter === 'all' || (c.level || 'B1') === levelFilter;
    return matchesSearch && matchesStatus && matchesLevel;
  });

  if (loading) {
    return (
      <div className="py-24 text-center text-theme-subtle">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="font-medium">Đang tải dữ liệu thư mục...</p>
      </div>
    );
  }

  if (!folder) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center text-theme-muted">
        <p className="text-rose-400 font-semibold">Không tìm thấy thư mục</p>
        <button onClick={() => navigate('/')} className="mt-4 px-4 py-2 bg-surface border border-theme text-theme-main rounded-xl">Quay lại</button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in transition-colors duration-200">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center space-x-2 animate-bounce">
          <CheckCircle2 className="w-5 h-5" />
          <span className="text-sm font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Breadcrumb & Navigation */}
      <div className="flex items-center space-x-2 text-sm text-theme-subtle font-medium">
        <button
          onClick={() => navigate('/')}
          className="flex items-center space-x-1.5 hover:text-indigo-400 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Danh sách thư mục</span>
        </button>
        <span>/</span>
        <span className="text-theme-main font-bold truncate max-w-xs">{folder.name}</span>
      </div>

      {/* Header Banner */}
      <div className="bg-surface border border-theme rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="space-y-2 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-theme-main break-words mr-1">{folder.name}</h1>
            <span className="px-3 py-1 bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 text-xs font-bold rounded-full shrink-0 whitespace-nowrap">
              {cards.length} từ vựng
            </span>
            <button
              onClick={() => setStatusFilter(statusFilter === 'mastered' ? 'all' : 'mastered')}
              className={`px-3 py-1 text-xs font-bold rounded-full border transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                statusFilter === 'mastered'
                  ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm'
                  : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
              }`}
              title="Bấm để lọc từ Đã thuộc"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Đã thuộc: {cards.filter(c => c.status === 'mastered').length}</span>
            </button>
            <button
              onClick={() => setStatusFilter(statusFilter === 'unmastered' ? 'all' : 'unmastered')}
              className={`px-3 py-1 text-xs font-bold rounded-full border transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                statusFilter === 'unmastered'
                  ? 'bg-rose-500 text-white border-rose-600 shadow-sm'
                  : 'bg-rose-500/15 text-rose-400 border-rose-500/30 hover:bg-rose-500/25'
              }`}
              title="Bấm để lọc từ Chưa thuộc"
            >
              <span>❌ Chưa thuộc: {cards.filter(c => c.status !== 'mastered').length}</span>
            </button>
          </div>
          <p className="text-sm text-theme-muted max-w-2xl">
            {folder.description || 'Chưa có mô tả cho thư mục này.'}
          </p>
        </div>

        {/* Study Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto shrink-0">
          <button
            onClick={() => navigate(`/flashcards/${folder.id}`)}
            disabled={cards.length === 0}
            className="flex-1 lg:flex-none px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-md shadow-indigo-600/20 flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-40 whitespace-nowrap"
          >
            <BookOpen className="w-4 h-4 shrink-0" />
            <span>Học Flashcard</span>
          </button>

          <button
            onClick={() => navigate(`/practice/${folder.id}`)}
            disabled={cards.length === 0}
            className="flex-1 lg:flex-none px-5 py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold text-sm shadow-md shadow-purple-600/20 flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-40 whitespace-nowrap"
          >
            <Award className="w-4 h-4 shrink-0" />
            <span>Điền nghĩa & Kiểm tra</span>
          </button>
        </div>
      </div>

      {/* Toolbar: Search, Filters & Add Words */}
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3 sm:gap-4">
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="w-4 h-4 text-theme-subtle absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm từ vựng hoặc nghĩa..."
              className="w-full pl-10 pr-4 py-2.5 bg-surface border border-theme rounded-2xl text-sm text-theme-main placeholder:text-theme-subtle shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2.5 bg-surface border border-theme rounded-2xl text-sm text-theme-main font-medium shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shrink-0"
          >
            <option value="all">Tất cả trạng thái ({cards.length})</option>
            <option value="unmastered">❌ Chưa thuộc ({cards.filter(c => c.status !== 'mastered').length})</option>
            <option value="mastered">✅ Đã thuộc ({cards.filter(c => c.status === 'mastered').length})</option>
            <option value="learning">Đang học ({cards.filter(c => c.status === 'learning').length})</option>
            <option value="new">Từ mới ({cards.filter(c => c.status === 'new').length})</option>
          </select>

          {/* Level filter */}
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="px-3.5 py-2.5 bg-surface border border-theme rounded-2xl text-sm text-theme-main font-medium shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shrink-0"
          >
            <option value="all">Tất cả cấp bậc ({cards.length})</option>
            {CEFR_LEVELS.map(lvl => {
              const count = cards.filter(c => (c.level || 'B1') === lvl.id).length;
              return (
                <option key={lvl.id} value={lvl.id}>
                  Cấp {lvl.id} ({count})
                </option>
              );
            })}
          </select>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 sm:gap-3 justify-end shrink-0">
          <button
            onClick={() => setIsBulkModalOpen(true)}
            className="px-4 py-2.5 bg-surface hover:bg-surface-hover text-theme-muted font-semibold text-sm rounded-2xl border border-theme shadow-xs flex items-center space-x-2 transition-colors cursor-pointer whitespace-nowrap"
          >
            <UploadCloud className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>Nhập hàng loạt</span>
          </button>

          <button
            onClick={() => {
              setCardToEdit(null);
              setIsCardModalOpen(true);
            }}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-2xl shadow-md shadow-indigo-600/20 flex items-center space-x-2 transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Thêm từ mới</span>
          </button>
        </div>
      </div>

      {/* Cards List */}
      {filteredCards.length === 0 ? (
        <div className="text-center py-16 bg-surface border border-theme rounded-3xl p-8 shadow-xs">
          <BookOpen className="w-12 h-12 text-theme-subtle mx-auto mb-3" />
          <h3 className="text-lg font-bold text-theme-main">Chưa có từ vựng nào phù hợp</h3>
          <p className="text-sm text-theme-muted max-w-sm mx-auto mt-1 mb-6">
            Thêm từ mới hoặc chọn "Nhập hàng loạt" để tạo nhanh danh sách từ vựng.
          </p>
          <button
            onClick={() => {
              setCardToEdit(null);
              setIsCardModalOpen(true);
            }}
            className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-2xl shadow-md shadow-indigo-600/20 hover:bg-indigo-500 transition-all inline-flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Thẻ Từ Vựng Đầu Tiên</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCards.map(card => {
            const statusConfig = 
              card.status === 'mastered' ? { label: 'Đã thuộc', bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' } :
              card.status === 'learning' ? { label: 'Chưa thuộc', bg: 'bg-rose-500/15 text-rose-400 border-rose-500/30' } :
              { label: 'Từ mới', bg: 'bg-tag-theme text-theme-subtle border-theme-subtle' };

            return (
              <div
                key={card.id}
                className="bg-surface border border-theme rounded-3xl p-5 hover:border-indigo-500/60 transition-all flex flex-col justify-between group shadow-xs hover:shadow-xl"
              >
                <div>
                  {/* Top card bar */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <TTSButton text={card.word} size={16} className="p-1.5" />
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border ${getLevelBadge(card.level).badgeClass}`}>
                        {card.level || 'B1'}
                      </span>
                      <span className="text-xs px-2.5 py-0.5 rounded-lg bg-tag-theme text-theme-muted font-semibold border border-theme-subtle">
                        {getPartOfSpeechBadge(card.part_of_speech)}
                      </span>
                    </div>

                    <button
                      onClick={() => handleToggleStatus(card)}
                      title="Bấm để đổi trạng thái học"
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border transition-all cursor-pointer ${statusConfig.bg}`}
                    >
                      {statusConfig.label}
                    </button>
                  </div>

                  {/* Word & Phonetic */}
                  <div className="mb-3">
                    <h3 className="text-2xl font-black text-theme-main group-hover:text-indigo-400 transition-colors">
                      {card.word}
                    </h3>
                    {card.phonetic && (
                      <span className="text-xs font-mono text-indigo-400 font-semibold block mt-0.5">
                        {card.phonetic}
                      </span>
                    )}
                  </div>

                  {/* Meaning */}
                  <div className="bg-indigo-500/10 rounded-2xl p-3 mb-3 border border-indigo-500/20">
                    <span className="text-sm font-bold text-indigo-300 block">
                      {card.meaning}
                    </span>
                  </div>

                  {/* Example if exists */}
                  {card.example_en && (
                    <div className="text-xs text-theme-muted space-y-1 mb-3">
                      <p className="italic text-theme-main font-medium">"{card.example_en}"</p>
                      {card.example_vi && <p className="text-theme-subtle">{card.example_vi}</p>}
                    </div>
                  )}

                  {/* Note if exists */}
                  {card.note && (
                    <div className="text-[11px] text-amber-300 bg-amber-500/10 px-2.5 py-1.5 rounded-xl border border-amber-500/20 font-medium">
                      💡 {card.note}
                    </div>
                  )}
                </div>

                {/* Bottom card actions */}
                <div className="flex items-center justify-end space-x-2 pt-3 border-t border-theme-subtle mt-4">
                  <button
                    onClick={() => {
                      setCardToEdit(card);
                      setIsCardModalOpen(true);
                    }}
                    className="p-1.5 text-theme-subtle hover:text-indigo-400 hover:bg-surface-hover rounded-lg transition-colors cursor-pointer"
                    title="Sửa từ"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteCardClick(card)}
                    className="p-1.5 text-theme-subtle hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                    title="Xóa từ"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Card Confirmation Pop-up */}
      <ConfirmModal
        isOpen={!!cardToDelete}
        title="Xác nhận xóa từ vựng"
        message={
          <span>
            Bạn có chắc chắn muốn xóa từ <strong className="text-theme-main font-bold">"{cardToDelete?.word}"</strong> (<span className="text-indigo-400 font-semibold">{cardToDelete?.meaning}</span>) khỏi thư mục này? Thao tác này không thể hoàn tác.
          </span>
        }
        confirmText="Xác nhận xóa"
        cancelText="Hủy bỏ"
        type="danger"
        loading={isDeleting}
        onConfirm={handleConfirmDeleteCard}
        onClose={() => setCardToDelete(null)}
      />

      {/* Modals */}
      <CardModal
        isOpen={isCardModalOpen}
        onClose={() => setIsCardModalOpen(false)}
        folderId={folderId}
        cardToEdit={cardToEdit}
        onSaved={() => {
          showToast(cardToEdit ? 'Đã cập nhật từ vựng' : 'Đã thêm từ mới!');
          loadData();
          refreshUser?.();
        }}
      />

      <BulkImportModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        folderId={folderId}
        onImported={() => {
          showToast('Đã nhập hàng loạt từ vựng!');
          loadData();
          refreshUser?.();
        }}
      />
    </div>
  );
}
