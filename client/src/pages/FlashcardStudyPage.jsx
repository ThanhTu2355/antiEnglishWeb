import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, RotateCw, Volume2, Shuffle, Check, X, 
  Sparkles, Award, ArrowRight, BookOpen
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../api/client';
import { useAuth } from '../context/useAuth';
import TTSButton from '../components/TTSButton';
import { CEFR_LEVELS, getLevelBadge, getPartOfSpeechBadge } from '../utils/levels';

export default function FlashcardStudyPage() {
  const { folderId } = useParams();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const [folders, setFolders] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState(folderId || 'all');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [studyDone, setStudyDone] = useState(false);
  const [masteredCount, setMasteredCount] = useState(0);

  useEffect(() => {
    if (folderId) {
      setSelectedFolderId(folderId);
    }
  }, [folderId]);

  useEffect(() => {
    loadFolders();
  }, []);

  useEffect(() => {
    loadCards();
  }, [selectedFolderId, selectedLevel, selectedStatus]);

  // Keyboard shortcut listener
  useEffect(() => {
    function handleKeyDown(e) {
      if (studyDone || cards.length === 0) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped(prev => !prev);
      } else if (e.code === 'ArrowRight') {
        handleNext();
      } else if (e.code === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === '1') {
        handleRate('learning');
      } else if (e.key === '2') {
        handleRate('mastered');
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [studyDone, cards, currentIndex]);

  async function loadFolders() {
    try {
      const data = await api.folders.getAll();
      setFolders(data);
    } catch (err) {
      console.error(err);
    }
  }

  async function loadCards() {
    try {
      setLoading(true);
      const params = {};
      if (selectedFolderId !== 'all') params.folder_id = selectedFolderId;
      if (selectedLevel !== 'all') params.level = selectedLevel;
      if (selectedStatus !== 'all') params.status = selectedStatus;
      const data = await api.cards.getAll(params);
      setCards(data);
      setCurrentIndex(0);
      setIsFlipped(false);
      setStudyDone(false);
      setMasteredCount(0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function handleShuffle() {
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
  }

  function handleNext() {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setIsFlipped(false);
    } else {
      triggerCompletion();
    }
  }

  function handlePrev() {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setIsFlipped(false);
    }
  }

  async function handleRate(status) {
    if (cards.length === 0) return;
    const currentCard = cards[currentIndex];

    try {
      await api.cards.updateStatus(currentCard.id, status);
      if (status === 'mastered') {
        setMasteredCount(prev => prev + 1);
      }
      refreshUser?.();
      handleNext();
    } catch (err) {
      console.error(err);
      handleNext();
    }
  }

  function triggerCompletion() {
    setStudyDone(true);
    refreshUser?.();
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  }

  if (loading) {
    return (
      <div className="py-24 text-center text-theme-subtle">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="font-medium">Đang chuẩn bị bộ thẻ Flashcard...</p>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center bg-surface border border-theme rounded-3xl p-8 mt-10 shadow-sm">
        <BookOpen className="w-12 h-12 text-theme-subtle mx-auto mb-3" />
        <h3 className="text-lg font-bold text-theme-main">Chưa có từ vựng nào để học</h3>
        <p className="text-sm text-theme-muted mt-1 mb-6">
          {selectedStatus === 'unmastered'
            ? 'Tuyệt vời! Bạn không có từ vựng nào thuộc nhóm "Chưa thuộc" theo bộ lọc này.'
            : selectedLevel !== 'all' 
            ? `Không có từ vựng nào thuộc cấp bậc ${selectedLevel} trong thư mục này.` 
            : 'Vui lòng thêm từ vựng vào thư mục trước khi bắt đầu học Flashcard.'}
        </p>
        <div className="flex items-center justify-center space-x-3 flex-wrap gap-2">
          {selectedStatus !== 'all' && (
            <button
              onClick={() => setSelectedStatus('all')}
              className="px-5 py-2.5 bg-surface hover:bg-surface-hover border border-theme text-theme-main text-sm font-semibold rounded-2xl transition-all cursor-pointer"
            >
              Xem tất cả trạng thái
            </button>
          )}
          {selectedLevel !== 'all' && (
            <button
              onClick={() => setSelectedLevel('all')}
              className="px-5 py-2.5 bg-surface hover:bg-surface-hover border border-theme text-theme-main text-sm font-semibold rounded-2xl transition-all cursor-pointer"
            >
              Xem tất cả cấp bậc
            </button>
          )}
          <button
            onClick={() => navigate('/')}
            className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-2xl shadow-md shadow-indigo-600/20 hover:bg-indigo-500 transition-all cursor-pointer"
          >
            Quay lại Thư mục
          </button>
        </div>
      </div>
    );
  }

  const currentCard = cards[currentIndex];
  const progressPercent = Math.round(((currentIndex + 1) / cards.length) * 100);

  // Completion Screen
  if (studyDone) {
    return (
      <div className="max-w-lg mx-auto py-12 px-4 animate-fade-in transition-colors duration-200">
        <div className="bg-surface border border-theme rounded-3xl p-8 text-center shadow-xl space-y-6">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-emerald-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
            <Sparkles className="w-10 h-10 text-white" />
          </div>

          <div>
            <h2 className="text-2xl font-black text-theme-main">Tuyệt vời! Bạn đã hoàn thành!</h2>
            <p className="text-sm text-theme-muted mt-1">Đã ôn luyện toàn bộ {cards.length} thẻ từ vựng trong lượt này.</p>
          </div>

          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="bg-input-theme rounded-2xl p-4 border border-theme-subtle">
              <span className="text-xs text-theme-subtle font-medium block">Đã ghi nhớ tốt</span>
              <span className="text-2xl font-black text-emerald-400 mt-1 block">+{masteredCount} từ</span>
            </div>
            <div className="bg-input-theme rounded-2xl p-4 border border-theme-subtle">
              <span className="text-xs text-theme-subtle font-medium block">Tổng số thẻ ôn</span>
              <span className="text-2xl font-black text-indigo-400 mt-1 block">{cards.length} thẻ</span>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <button
              onClick={() => {
                setCurrentIndex(0);
                setIsFlipped(false);
                setStudyDone(false);
                setMasteredCount(0);
              }}
              className="w-full py-3 rounded-2xl bg-surface hover:bg-surface-hover text-theme-main font-bold text-sm transition-all border border-theme flex items-center justify-center space-x-2 cursor-pointer"
            >
              <RotateCw className="w-4 h-4" />
              <span>Học lại lần nữa</span>
            </button>

            <button
              onClick={() => navigate(selectedFolderId !== 'all' ? `/practice/${selectedFolderId}` : '/practice')}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold text-sm shadow-md shadow-purple-600/20 transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Award className="w-4 h-4" />
              <span>Làm bài tập Điền nghĩa ngay</span>
            </button>

            <button
              onClick={() => navigate('/')}
              className="text-xs text-theme-subtle hover:text-theme-main py-2 block w-full transition-colors cursor-pointer font-medium"
            >
              Quay về danh sách thư mục
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-fade-in transition-colors duration-200">
      {/* Top Header Controls */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
          <button
            onClick={() => navigate('/')}
            className="p-2.5 bg-surface hover:bg-surface-hover text-theme-muted rounded-xl border border-theme shadow-xs transition-colors cursor-pointer shrink-0"
            title="Quay lại"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Folder selector */}
          <select
            value={selectedFolderId}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedFolderId(val);
              navigate(val === 'all' ? '/flashcards' : `/flashcards/${val}`);
            }}
            className="px-3.5 py-2.5 bg-surface border border-theme rounded-xl text-xs sm:text-sm text-theme-main font-bold shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shrink-0 max-w-[180px] sm:max-w-xs truncate"
          >
            <option value="all">Tất cả thư mục</option>
            {folders.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>

          {/* Level selector */}
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="px-3 py-2.5 bg-surface border border-theme rounded-xl text-xs sm:text-sm text-theme-main font-bold shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shrink-0"
          >
            <option value="all">Tất cả cấp bậc</option>
            {CEFR_LEVELS.map(lvl => (
              <option key={lvl.id} value={lvl.id}>Cấp {lvl.id}</option>
            ))}
          </select>

          {/* Status selector */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2.5 bg-surface border border-theme rounded-xl text-xs sm:text-sm text-theme-main font-bold shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shrink-0"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="unmastered">❌ Chỉ từ chưa thuộc</option>
            <option value="mastered">✅ Chỉ từ đã thuộc</option>
          </select>
        </div>

        {/* Action icons */}
        <div className="flex items-center space-x-2 shrink-0 self-end md:self-auto">
          <button
            onClick={handleShuffle}
            title="Xáo trộn thứ tự thẻ"
            className="px-3.5 py-2.5 bg-surface hover:bg-surface-hover text-theme-main rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer border border-theme shadow-xs whitespace-nowrap"
          >
            <Shuffle className="w-3.5 h-3.5 text-indigo-400" />
            <span>Xáo trộn</span>
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-bold text-theme-subtle">
          <span>Tiến độ học</span>
          <span className="text-indigo-400">Thẻ {currentIndex + 1} / {cards.length} ({progressPercent}%)</span>
        </div>
        <div className="w-full bg-input-theme rounded-full h-2.5 overflow-hidden border border-theme-subtle">
          <div
            className="bg-indigo-600 h-full rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* 3D Flashcard Component */}
      <div className="perspective-1000 w-full max-w-2xl mx-auto min-h-[380px] sm:min-h-[420px] select-none">
        <div
          onClick={() => setIsFlipped(!isFlipped)}
          className={`relative w-full h-[380px] sm:h-[420px] transform-style-3d transition-transform duration-500 cursor-pointer ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
        >
          {/* FRONT SIDE (English Word) */}
          <div className="absolute inset-0 backface-hidden bg-surface border-2 border-theme rounded-3xl p-8 flex flex-col justify-between shadow-xl hover:border-indigo-500/60 hover:shadow-2xl transition-all">
            {/* Top row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full border ${getLevelBadge(currentCard.level).badgeClass}`}>
                  {currentCard.level || 'B1'}
                </span>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 uppercase tracking-wider">
                  {getPartOfSpeechBadge(currentCard.part_of_speech)}
                </span>
              </div>

              <div onClick={(e) => e.stopPropagation()}>
                <TTSButton text={currentCard.word} size={20} className="p-2.5 bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500/25 rounded-xl" />
              </div>
            </div>

            {/* Center: Main Word */}
            <div className="text-center my-auto space-y-3">
              <h2 className="text-4xl sm:text-5xl font-black text-theme-main tracking-tight">
                {currentCard.word}
              </h2>
              {currentCard.phonetic && (
                <p className="text-xl font-mono text-indigo-400 font-bold tracking-wide">
                  {currentCard.phonetic}
                </p>
              )}
            </div>

            {/* Bottom hint */}
            <div className="text-center text-xs text-theme-subtle font-medium flex items-center justify-center gap-1.5">
              <span>Bấm vào thẻ hoặc nhấn</span>
              <kbd className="px-2 py-0.5 bg-input-theme border border-theme rounded text-theme-main font-mono text-[11px] font-bold">
                Space
              </kbd>
              <span>để xem nghĩa</span>
            </div>
          </div>

          {/* BACK SIDE (Vietnamese Meaning & Context) */}
          <div className="absolute inset-0 backface-hidden rotate-y-180 bg-surface border-2 border-indigo-500/50 rounded-3xl p-8 flex flex-col justify-between shadow-xl">
            {/* Top row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full border ${getLevelBadge(currentCard.level).badgeClass}`}>
                  {currentCard.level || 'B1'}
                </span>
                <span className="text-base font-extrabold text-theme-main">{currentCard.word}</span>
                {currentCard.phonetic && (
                  <span className="text-xs font-mono text-theme-subtle font-semibold">({currentCard.phonetic})</span>
                )}
              </div>
              <div onClick={(e) => e.stopPropagation()}>
                <TTSButton text={currentCard.word} size={18} className="p-2 bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/25 rounded-xl" />
              </div>
            </div>

            {/* Center: Vietnamese Meaning */}
            <div className="text-center my-auto space-y-4">
              <div className="inline-block bg-input-theme border border-indigo-500/30 px-6 py-3 rounded-2xl shadow-xs">
                <p className="text-2xl sm:text-3xl font-black text-indigo-300">
                  {currentCard.meaning}
                </p>
              </div>

              {/* Example sentence */}
              {currentCard.example_en && (
                <div className="max-w-md mx-auto space-y-1 bg-input-theme/80 p-4 rounded-2xl border border-theme-subtle shadow-xs">
                  <p className="text-xs sm:text-sm italic text-theme-main font-medium">
                    "{currentCard.example_en}"
                  </p>
                  {currentCard.example_vi && (
                    <p className="text-xs text-theme-subtle">
                      {currentCard.example_vi}
                    </p>
                  )}
                </div>
              )}

              {/* Note */}
              {currentCard.note && (
                <p className="text-xs text-amber-300 font-semibold bg-amber-500/15 px-3 py-1.5 rounded-xl border border-amber-500/30 inline-block">
                  💡 {currentCard.note}
                </p>
              )}
            </div>

            {/* Bottom hint */}
            <div className="text-center text-xs text-theme-subtle font-medium flex items-center justify-center gap-1">
              <span>Bấm để lật lại mặt trước</span>
            </div>
          </div>
        </div>
      </div>

      {/* Assessment Controls */}
      <div className="max-w-2xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="py-3 px-4 rounded-2xl bg-surface hover:bg-surface-hover text-theme-main text-xs sm:text-sm font-bold border border-theme shadow-xs transition-all disabled:opacity-40 cursor-pointer"
        >
          ← Thẻ trước (←)
        </button>

        <button
          onClick={() => handleRate('learning')}
          className="py-3 px-4 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 text-xs sm:text-sm font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs"
        >
          <X className="w-4 h-4" />
          <span>Chưa thuộc (1)</span>
        </button>

        <button
          onClick={() => handleRate('mastered')}
          className="py-3 px-4 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs sm:text-sm font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs"
        >
          <Check className="w-4 h-4" />
          <span>Đã thuộc (2)</span>
        </button>

        <button
          onClick={handleNext}
          className="py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
        >
          Thẻ kế tiếp (→)
        </button>
      </div>
    </div>
  );
}
