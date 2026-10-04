import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft, RotateCw, Volume2, Check, X, 
  Sparkles, Award, ArrowRight, BookOpen, Folder, Layers, XCircle, CheckCircle2, Clock, Calendar
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../api/client';
import { useAuth } from '../context/useAuth';
import TTSButton from '../components/TTSButton';
import { playWordAudio } from '../utils/audio';
import CustomSelect from '../components/CustomSelect';
import ConfirmModal from '../components/ConfirmModal';
import { CEFR_LEVELS, getLevelBadge } from '../utils/levels';
import { formatInterval, calculateSM2Preview, isCardDue } from '../utils/sm2';

export default function FlashcardStudyPage() {
  const { folderId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshUser } = useAuth();

  const isDueQuery = searchParams.get('due') === 'true';

  const [folders, setFolders] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState(folderId || 'all');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState(isDueQuery ? 'due' : 'all');
  const [cards, setCards] = useState([]);
  const [initialTotalCards, setInitialTotalCards] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [studyDone, setStudyDone] = useState(false);
  const [masteredCount, setMasteredCount] = useState(0);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [studyDirection, setStudyDirection] = useState('forward'); // 'forward' (EN -> VI) | 'reverse' (VI -> EN)

  function speakWord(text) {
    if (!text) return;
    playWordAudio(text, 'en-US');
  }

  useEffect(() => {
    if (folderId) {
      setSelectedFolderId(folderId);
    }
  }, [folderId]);

  useEffect(() => {
    if (searchParams.get('due') === 'true') {
      setSelectedStatus('due');
    }
  }, [searchParams]);

  useEffect(() => {
    loadFolders();
  }, []);

  useEffect(() => {
    loadCards();
  }, [selectedFolderId, selectedLevel, selectedStatus]);

  // Track active study session for exit confirmation pop-up
  useEffect(() => {
    const isSessionActive = !studyDone && cards.length > 0;
    window.__hasActiveStudySession = isSessionActive;

    if (isSessionActive) {
      // Push history entry to intercept browser back button
      window.history.pushState({ inStudySession: true }, '');

      function handlePopState() {
        window.history.pushState({ inStudySession: true }, '');
        setShowExitConfirm(true);
      }

      window.addEventListener('popstate', handlePopState);
      return () => {
        window.__hasActiveStudySession = false;
        window.removeEventListener('popstate', handlePopState);
      };
    } else {
      window.__hasActiveStudySession = false;
    }
  }, [studyDone, cards.length]);

  function handleBackClick() {
    if (!studyDone && cards.length > 0) {
      setShowExitConfirm(true);
    } else {
      navigate('/');
    }
  }

  // Keyboard shortcut listener
  useEffect(() => {
    function handleKeyDown(e) {
      if (studyDone || cards.length === 0) return;
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsFlipped(prev => !prev);
      } else if (e.code === 'ArrowRight') {
        handleNext();
      } else if (e.code === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === '1') {
        handleRate('again');
      } else if (e.key === '2') {
        handleRate('hard');
      } else if (e.key === '3') {
        handleRate('good');
      } else if (e.key === '4') {
        handleRate('easy');
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        const word = cards[currentIndex]?.word;
        if (word) {
          speakWord(word);
        }
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
      if (selectedStatus === 'due') {
        params.due = true;
      } else if (selectedStatus !== 'all') {
        params.status = selectedStatus;
      }
      const data = await api.cards.getAll(params);
      // Tự động xáo trộn ngẫu nhiên thứ tự các thẻ khi bắt đầu học
      const shuffledData = [...(data || [])];
      for (let i = shuffledData.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledData[i], shuffledData[j]] = [shuffledData[j], shuffledData[i]];
      }
      setCards(shuffledData);
      setInitialTotalCards(shuffledData.length);
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

  function handleNext(targetCards = cards) {
    if (currentIndex < targetCards.length - 1) {
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

  async function handleRate(rating) {
    if (cards.length === 0) return;
    const currentCard = cards[currentIndex];

    // Giải pháp 4: Tự động xếp từ 'Khó' (phím 2) hoặc 'Quên' (phím 1) vào cuối phiên học
    let updatedCards = cards;
    let shouldRequeue = false;
    let retryCard = null;

    if (rating === 'hard' && (currentCard._hardRetryCount || 0) < 1) {
      // Quy tắc "Cơ hội thứ hai": Lặp lại tối đa 1 lần trong phiên cho từ 'Khó' để tránh vòng lặp vô tận
      shouldRequeue = true;
      retryCard = {
        ...currentCard,
        _isRetry: true,
        _retryType: 'hard',
        _hardRetryCount: (currentCard._hardRetryCount || 0) + 1
      };
    } else if (rating === 'again' && (currentCard._againRetryCount || 0) < 2) {
      // Lặp lại tối đa 2 lần trong phiên cho từ 'Quên'
      shouldRequeue = true;
      retryCard = {
        ...currentCard,
        _isRetry: true,
        _retryType: 'again',
        _againRetryCount: (currentCard._againRetryCount || 0) + 1
      };
    }

    if (shouldRequeue && retryCard) {
      updatedCards = [...cards, retryCard];
      setCards(updatedCards);
    }

    try {
      const res = await api.cards.review(currentCard.id, rating);
      if (res?.card?.status === 'mastered' || rating === 'easy') {
        setMasteredCount(prev => prev + 1);
      }
      refreshUser?.();
      handleNext(updatedCards);
    } catch (err) {
      console.error(err);
      handleNext(updatedCards);
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
          {selectedStatus === 'due'
            ? '🎉 Tuyệt vời! Hiện tại bạn đã hoàn thành tất cả từ vựng cần ôn tập. Hãy quay lại vào ngày mai hoặc chọn "Tất cả trạng thái" để tiếp tục học!'
            : selectedStatus === 'unmastered'
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
            <p className="text-sm text-theme-muted mt-1">
              Đã ôn luyện toàn bộ {initialTotalCards || cards.length} thẻ từ vựng trong lượt này.
              {cards.length > (initialTotalCards || cards.length) && (
                <span className="text-amber-600 dark:text-amber-400 font-semibold block mt-1">
                  (Đã tự động lặp lại củng cố {cards.length - (initialTotalCards || cards.length)} lượt cho các từ khó/quên)
                </span>
              )}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="bg-input-theme rounded-2xl p-4 border border-theme-subtle">
              <span className="text-xs text-theme-subtle font-medium block">Đã ghi nhớ tốt</span>
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">+{masteredCount} từ</span>
            </div>
            <div className="bg-input-theme rounded-2xl p-4 border border-theme-subtle">
              <span className="text-xs text-theme-subtle font-medium block">Tổng số thẻ ôn</span>
              <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1 block">{initialTotalCards || cards.length} thẻ</span>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <button
              onClick={() => {
                loadCards();
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

  const folderOptions = [
    {
      value: 'all',
      label: 'Tất cả thư mục',
      icon: Layers,
      iconColor: 'text-indigo-400'
    },
    ...folders.map(f => ({
      value: f.id,
      label: f.name,
      icon: Folder,
      iconColor: 'text-indigo-400',
      count: f.card_count
    }))
  ];

  const levelOptions = [
    {
      value: 'all',
      label: 'Tất cả cấp bậc',
      icon: Award,
      iconColor: 'text-indigo-400'
    },
    ...CEFR_LEVELS.map(lvl => ({
      value: lvl.id,
      label: lvl.id === 'Other' ? 'Other (Khác)' : `Cấp ${lvl.id}`,
      badge: lvl.id,
      badgeClass: lvl.badgeClass
    }))
  ];

  const statusOptions = [
    {
      value: 'all',
      label: 'Tất cả trạng thái',
      icon: Layers,
      iconColor: 'text-indigo-400'
    },
    {
      value: 'due',
      label: '🔥 Đến hạn ôn',
      icon: Sparkles,
      iconColor: 'text-indigo-500'
    },
    {
      value: 'new',
      label: 'Chỉ từ mới',
      icon: Sparkles,
      iconColor: 'text-sky-400'
    },
    {
      value: 'learning',
      label: 'Chỉ từ đang học',
      icon: Clock,
      iconColor: 'text-amber-400'
    },
    {
      value: 'unmastered',
      label: 'Chỉ từ chưa thuộc',
      icon: XCircle,
      iconColor: 'text-rose-400'
    },
    {
      value: 'mastered',
      label: 'Chỉ từ đã thuộc',
      icon: CheckCircle2,
      iconColor: 'text-emerald-400'
    }
  ];

  const currentCard = cards[currentIndex] || null;
  const progressPercent = cards.length > 0 ? Math.round(((currentIndex + 1) / cards.length) * 100) : 0;
  const intervalHard = currentCard ? formatInterval(currentCard.projected_intervals?.hard || calculateSM2Preview(currentCard, 'hard')) : '1 ngày';
  const intervalGood = currentCard ? formatInterval(currentCard.projected_intervals?.good || calculateSM2Preview(currentCard, 'good')) : '3 ngày';
  const intervalEasy = currentCard ? formatInterval(currentCard.projected_intervals?.easy || calculateSM2Preview(currentCard, 'easy')) : '7 ngày';

  return (
    <div className="max-w-5xl xl:max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-fade-in transition-colors duration-200">
      {/* Top Header Controls */}
      <div className="max-w-2xl mx-auto w-full relative z-40 space-y-2.5 py-1">
        {/* Dòng điều khiển: Trên laptop dàn 1 hàng dãn đều bằng flashcard, trên di động tự tách 2 hàng gọn gàng */}
        <div className="sm:flex sm:items-center sm:gap-2 w-full space-y-2 sm:space-y-0">
          {/* Nhóm 1: Nút quay lại & Combobox Thư mục (Mobile: Hàng 1 / Laptop: hòa vào hàng 1 qua sm:contents) */}
          <div className="flex items-center gap-2 w-full sm:contents">
            <button
              onClick={handleBackClick}
              className="p-2.5 bg-surface hover:bg-surface-hover text-theme-muted rounded-2xl border border-theme shadow-xs transition-colors cursor-pointer shrink-0"
              title="Quay lại Trang chủ"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <CustomSelect
              value={selectedFolderId}
              onChange={(val) => {
                setSelectedFolderId(val);
                navigate(val === 'all' ? '/flashcards' : `/flashcards/${val}`);
              }}
              options={folderOptions}
              className="flex-1 sm:flex-1 min-w-0"
              buttonClassName="px-3 sm:px-3.5 text-xs sm:text-sm"
            />
          </div>

          {/* Nhóm 2: Combobox Cấp bậc & Trạng thái (Mobile: Hàng 2 grid 2 cột / Laptop: hòa vào hàng 1 qua sm:contents) */}
          <div className="grid grid-cols-2 gap-2 w-full sm:contents">
            <CustomSelect
              value={selectedLevel}
              onChange={setSelectedLevel}
              options={levelOptions}
              className="w-full sm:flex-1 min-w-0"
              buttonClassName="px-3 sm:px-3.5 text-xs sm:text-sm"
            />

            <CustomSelect
              value={selectedStatus}
              onChange={setSelectedStatus}
              options={statusOptions}
              className="w-full sm:flex-1 min-w-0"
              buttonClassName="px-3 sm:px-3.5 text-xs sm:text-sm"
            />
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="max-w-2xl mx-auto space-y-1.5">
        <div className="flex justify-between text-xs font-bold text-theme-subtle">
          <span>Tiến độ học</span>
          <span className="text-indigo-600 dark:text-indigo-400">Thẻ {currentIndex + 1} / {cards.length} ({progressPercent}%)</span>
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
          {studyDirection === 'forward' ? (
            /* =================== CHẾ ĐỘ XUÔI: EN ➔ VI =================== */
            <>
              {/* FRONT SIDE (English Word) */}
              <div className="absolute inset-0 backface-hidden bg-surface border-2 border-theme rounded-3xl p-4 sm:p-6 md:p-8 flex flex-col justify-between shadow-xl hover:border-indigo-500/60 hover:shadow-2xl transition-all">
                {/* Top row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
                    <span className={`inline-flex items-center justify-center h-6 px-2.5 text-[11px] font-bold rounded-full border leading-none shrink-0 ${getLevelBadge(currentCard.level).badgeClass}`}>
                      {getLevelBadge(currentCard.level).name}
                    </span>
                    <span className="inline-flex items-center justify-center h-6 px-2.5 text-[11px] font-bold rounded-full bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border border-indigo-500/30 leading-none shrink-0">
                      {(currentCard.part_of_speech || 'từ vựng').toLowerCase()}
                    </span>
                    <span className={`inline-flex items-center justify-center h-6 px-2.5 text-[11px] font-bold rounded-full border leading-none shrink-0 ${
                      currentCard.status === 'mastered' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30' :
                      currentCard.status === 'learning' ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30' :
                      currentCard.status === 'unmastered' ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30' :
                      'bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30'
                    }`}>
                      {
                        currentCard.status === 'mastered' ? 'Đã thuộc' :
                        currentCard.status === 'learning' ? 'Đang học' :
                        currentCard.status === 'unmastered' ? 'Chưa thuộc' :
                        'Từ mới'
                      }
                    </span>

                    {currentCard.interval > 0 && (
                      <span className="inline-flex items-center justify-center h-6 px-2.5 text-[11px] font-bold rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 leading-none shrink-0" title={`Lần ôn: ${currentCard.repetitions || 0}`}>
                        Chu kỳ: {formatInterval(currentCard.interval)}
                      </span>
                    )}

                    {isCardDue(currentCard) && (
                      <span className="inline-flex items-center justify-center h-6 px-2.5 text-[11px] font-bold rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 animate-pulse leading-none shrink-0">
                        Đến hạn
                      </span>
                    )}

                    {currentCard._isRetry && (
                      <span className={`inline-flex items-center justify-center h-6 px-2.5 text-[11px] font-bold rounded-full border leading-none gap-1 shrink-0 ${
                        currentCard._retryType === 'hard'
                          ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40'
                          : 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/40'
                      }`}>
                        <RotateCw className="w-3 h-3" />
                        <span>{currentCard._retryType === 'hard' ? 'Ôn lại từ khó' : 'Ôn lại từ quên'}</span>
                      </span>
                    )}
                  </div>

                  <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                    <TTSButton text={currentCard.word} size={18} className="p-2 sm:p-2.5 bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/25 rounded-xl" />
                  </div>
                </div>

                {/* Center: Main Word */}
                <div className="text-center my-auto space-y-3">
                  <h2 className="text-4xl sm:text-5xl font-black text-theme-main tracking-tight">
                    {currentCard.word}
                  </h2>
                  {currentCard.phonetic && (
                    <p className="text-xl font-mono text-indigo-600 dark:text-indigo-400 font-bold tracking-wide">
                      {currentCard.phonetic}
                    </p>
                  )}
                </div>

                {/* Bottom hint */}
                <div className="text-center text-xs text-theme-subtle font-medium flex items-center justify-center flex-wrap gap-2">
                  <span className="flex items-center gap-1">
                    <span>Bấm thẻ hoặc</span>
                    <kbd className="px-2 py-0.5 bg-input-theme border border-theme rounded text-theme-main font-mono text-[11px] font-bold">Space</kbd>
                    <span>xem nghĩa</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-2 py-0.5 bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 border border-indigo-500/30 rounded font-mono text-[11px] font-bold">M</kbd>
                    <span>nghe đọc</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <span>Phím</span>
                    <kbd className="px-1.5 py-0.5 bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-500/30 rounded font-mono text-[11px] font-bold">1</kbd>
                    <kbd className="px-1.5 py-0.5 bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 rounded font-mono text-[11px] font-bold">2</kbd>
                    <kbd className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 rounded font-mono text-[11px] font-bold">3</kbd>
                    <kbd className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 border border-indigo-500/30 rounded font-mono text-[11px] font-bold">4</kbd>
                    <span>đánh giá</span>
                  </span>
                </div>
              </div>

              {/* BACK SIDE (Vietnamese Meaning & Context) */}
              <div className="absolute inset-0 backface-hidden rotate-y-180 bg-surface border-2 border-indigo-500/50 rounded-3xl p-4 sm:p-6 md:p-8 flex flex-col justify-between shadow-xl">
                {/* Top row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
                    <span className={`inline-flex items-center justify-center h-6 px-2.5 text-[11px] font-bold rounded-full border leading-none shrink-0 ${getLevelBadge(currentCard.level).badgeClass}`}>
                      {getLevelBadge(currentCard.level).name}
                    </span>
                    <span className="inline-flex items-center justify-center h-6 px-2.5 text-[11px] font-bold rounded-full bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border border-indigo-500/30 leading-none shrink-0">
                      {(currentCard.part_of_speech || 'từ vựng').toLowerCase()}
                    </span>
                    <span className={`inline-flex items-center justify-center h-6 px-2.5 text-[11px] font-bold rounded-full border leading-none shrink-0 ${
                      currentCard.status === 'mastered' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30' :
                      currentCard.status === 'learning' ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30' :
                      currentCard.status === 'unmastered' ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30' :
                      'bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30'
                    }`}>
                      {
                        currentCard.status === 'mastered' ? 'Đã thuộc' :
                        currentCard.status === 'learning' ? 'Đang học' :
                        currentCard.status === 'unmastered' ? 'Chưa thuộc' :
                        'Từ mới'
                      }
                    </span>

                    {currentCard.interval > 0 && (
                      <span className="inline-flex items-center justify-center h-6 px-2.5 text-[11px] font-bold rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 leading-none shrink-0" title={`Lần ôn: ${currentCard.repetitions || 0}`}>
                        Chu kỳ: {formatInterval(currentCard.interval)}
                      </span>
                    )}

                    {isCardDue(currentCard) && (
                      <span className="inline-flex items-center justify-center h-6 px-2.5 text-[11px] font-bold rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 animate-pulse leading-none shrink-0">
                        Đến hạn
                      </span>
                    )}

                    {currentCard._isRetry && (
                      <span className={`inline-flex items-center justify-center h-6 px-2.5 text-[11px] font-bold rounded-full border leading-none gap-1 shrink-0 ${
                        currentCard._retryType === 'hard'
                          ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40'
                          : 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/40'
                      }`}>
                        <RotateCw className="w-3 h-3" />
                        <span>{currentCard._retryType === 'hard' ? 'Ôn lại từ khó' : 'Ôn lại từ quên'}</span>
                      </span>
                    )}
                  </div>
                  <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                    <TTSButton text={currentCard.word} size={18} className="p-2 sm:p-2.5 bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/25 rounded-xl" />
                  </div>
                </div>

                {/* Center: Vietnamese Meaning */}
                <div className="text-center my-auto space-y-4">
                  <div className="inline-block bg-indigo-500/10 border border-indigo-500/20 px-6 py-3.5 rounded-2xl shadow-xs">
                    <p className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-300">
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
                    <p className="text-xs text-amber-900 dark:text-amber-300 font-semibold bg-amber-500/15 px-3 py-1.5 rounded-xl border border-amber-500/30 inline-block">
                      💡 {currentCard.note}
                    </p>
                  )}
                </div>

                {/* Bottom hint */}
                <div className="text-center text-xs text-theme-subtle font-medium flex items-center justify-center flex-wrap gap-2">
                  <span>Bấm để lật lại mặt trước</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <span>Phím</span>
                    <kbd className="px-2 py-0.5 bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 border border-indigo-500/30 rounded font-mono text-[11px] font-bold">M</kbd>
                    <span>nghe đọc</span>
                  </span>
                </div>
              </div>
            </>
          ) : (
            /* =================== CHẾ ĐỘ NGƯỢC: VI ➔ EN =================== */
            <>
              {/* FRONT SIDE (Vietnamese Meaning) */}
              <div className="absolute inset-0 backface-hidden bg-surface border-2 border-theme rounded-3xl p-4 sm:p-6 md:p-8 flex flex-col justify-between shadow-xl hover:border-indigo-500/60 hover:shadow-2xl transition-all">
                {/* Top row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
                    <span className={`inline-flex items-center justify-center h-6 px-2.5 text-[11px] font-bold rounded-full border leading-none shrink-0 ${getLevelBadge(currentCard.level).badgeClass}`}>
                      {getLevelBadge(currentCard.level).name}
                    </span>
                    <span className="inline-flex items-center justify-center h-6 px-2.5 text-[11px] font-bold rounded-full bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border border-indigo-500/30 leading-none shrink-0">
                      {(currentCard.part_of_speech || 'từ vựng').toLowerCase()}
                    </span>
                    <span className={`inline-flex items-center justify-center h-6 px-2.5 text-[11px] font-bold rounded-full border leading-none shrink-0 ${
                      currentCard.status === 'mastered' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30' :
                      currentCard.status === 'learning' ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30' :
                      currentCard.status === 'unmastered' ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30' :
                      'bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30'
                    }`}>
                      {
                        currentCard.status === 'mastered' ? 'Đã thuộc' :
                        currentCard.status === 'learning' ? 'Đang học' :
                        currentCard.status === 'unmastered' ? 'Chưa thuộc' :
                        'Từ mới'
                      }
                    </span>

                    {currentCard.interval > 0 && (
                      <span className="inline-flex items-center justify-center h-6 px-2.5 text-[11px] font-bold rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 leading-none shrink-0" title={`Lần ôn: ${currentCard.repetitions || 0}`}>
                        Chu kỳ: {formatInterval(currentCard.interval)}
                      </span>
                    )}

                    {isCardDue(currentCard) && (
                      <span className="inline-flex items-center justify-center h-6 px-2.5 text-[11px] font-bold rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 animate-pulse leading-none shrink-0">
                        Đến hạn
                      </span>
                    )}

                    {currentCard._isRetry && (
                      <span className={`inline-flex items-center justify-center h-6 px-2.5 text-[11px] font-bold rounded-full border leading-none gap-1 shrink-0 ${
                        currentCard._retryType === 'hard'
                          ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40'
                          : 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/40'
                      }`}>
                        <RotateCw className="w-3 h-3" />
                        <span>{currentCard._retryType === 'hard' ? 'Ôn lại từ khó' : 'Ôn lại từ quên'}</span>
                      </span>
                    )}
                  </div>

                  <span className="text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/25 shrink-0 whitespace-nowrap">
                    Học ngược: VI ➔ EN
                  </span>
                </div>

                {/* Center: Vietnamese Meaning & Vietnamese context */}
                <div className="text-center my-auto space-y-4">
                  <div className="inline-block bg-indigo-500/10 border border-indigo-500/20 px-6 py-3.5 rounded-2xl shadow-xs">
                    <p className="text-2xl sm:text-3xl lg:text-4xl font-black text-indigo-600 dark:text-indigo-300">
                      {currentCard.meaning}
                    </p>
                  </div>

                  {/* Vietnamese Example as context prompt if available */}
                  {currentCard.example_vi && (
                    <div className="max-w-md mx-auto bg-input-theme/80 p-3.5 rounded-2xl border border-theme-subtle shadow-xs">
                      <p className="text-[11px] font-bold text-theme-subtle mb-1 uppercase tracking-wider">
                        Ngữ cảnh minh họa:
                      </p>
                      <p className="text-xs sm:text-sm text-theme-main font-medium italic">
                        "{currentCard.example_vi}"
                      </p>
                    </div>
                  )}
                </div>

                {/* Bottom hint */}
                <div className="text-center text-xs text-theme-subtle font-medium flex items-center justify-center flex-wrap gap-2">
                  <span className="flex items-center gap-1">
                    <span>Bấm thẻ hoặc</span>
                    <kbd className="px-2 py-0.5 bg-input-theme border border-theme rounded text-theme-main font-mono text-[11px] font-bold">Space</kbd>
                    <span>xem từ tiếng Anh</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <span>Phím</span>
                    <kbd className="px-1.5 py-0.5 bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-500/30 rounded font-mono text-[11px] font-bold">1</kbd>
                    <kbd className="px-1.5 py-0.5 bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 rounded font-mono text-[11px] font-bold">2</kbd>
                    <kbd className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 rounded font-mono text-[11px] font-bold">3</kbd>
                    <kbd className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 border border-indigo-500/30 rounded font-mono text-[11px] font-bold">4</kbd>
                    <span>đánh giá</span>
                  </span>
                </div>
              </div>

              {/* BACK SIDE (English Word Revealed & Details) */}
              <div className="absolute inset-0 backface-hidden rotate-y-180 bg-surface border-2 border-indigo-500/50 rounded-3xl p-4 sm:p-6 md:p-8 flex flex-col justify-between shadow-xl">
                {/* Top row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
                    <span className={`inline-flex items-center justify-center h-6 px-2.5 text-[11px] font-bold rounded-full border leading-none shrink-0 ${getLevelBadge(currentCard.level).badgeClass}`}>
                      {getLevelBadge(currentCard.level).name}
                    </span>
                    <span className="inline-flex items-center justify-center h-6 px-2.5 text-[11px] font-bold rounded-full bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border border-indigo-500/30 leading-none shrink-0">
                      {(currentCard.part_of_speech || 'từ vựng').toLowerCase()}
                    </span>
                    <span className={`inline-flex items-center justify-center h-6 px-2.5 text-[11px] font-bold rounded-full border leading-none shrink-0 ${
                      currentCard.status === 'mastered' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30' :
                      currentCard.status === 'learning' ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30' :
                      currentCard.status === 'unmastered' ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30' :
                      'bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30'
                    }`}>
                      {
                        currentCard.status === 'mastered' ? 'Đã thuộc' :
                        currentCard.status === 'learning' ? 'Đang học' :
                        currentCard.status === 'unmastered' ? 'Chưa thuộc' :
                        'Từ mới'
                      }
                    </span>

                    {currentCard.interval > 0 && (
                      <span className="inline-flex items-center justify-center h-6 px-2.5 text-[11px] font-bold rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 leading-none shrink-0" title={`Lần ôn: ${currentCard.repetitions || 0}`}>
                        Chu kỳ: {formatInterval(currentCard.interval)}
                      </span>
                    )}

                    {isCardDue(currentCard) && (
                      <span className="inline-flex items-center justify-center h-6 px-2.5 text-[11px] font-bold rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 animate-pulse leading-none shrink-0">
                        Đến hạn
                      </span>
                    )}

                    {currentCard._isRetry && (
                      <span className={`inline-flex items-center justify-center h-6 px-2.5 text-[11px] font-bold rounded-full border leading-none gap-1 shrink-0 ${
                        currentCard._retryType === 'hard'
                          ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40'
                          : 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/40'
                      }`}>
                        <RotateCw className="w-3 h-3" />
                        <span>{currentCard._retryType === 'hard' ? 'Ôn lại từ khó' : 'Ôn lại từ quên'}</span>
                      </span>
                    )}
                  </div>
                  <div onClick={(e) => e.stopPropagation()} className="shrink-0">
                    <TTSButton text={currentCard.word} size={18} className="p-2 sm:p-2.5 bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/25 rounded-xl" />
                  </div>
                </div>

                {/* Center: Revealed English Word & IPA & Examples */}
                <div className="text-center my-auto space-y-3">
                  <h2 className="text-4xl sm:text-5xl font-black text-theme-main tracking-tight">
                    {currentCard.word}
                  </h2>
                  {currentCard.phonetic && (
                    <p className="text-xl font-mono text-indigo-600 dark:text-indigo-400 font-bold tracking-wide">
                      {currentCard.phonetic}
                    </p>
                  )}

                  {/* Example sentence */}
                  {currentCard.example_en && (
                    <div className="max-w-md mx-auto space-y-1 bg-input-theme/80 p-3.5 rounded-2xl border border-theme-subtle shadow-xs text-center">
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
                    <p className="text-xs text-amber-900 dark:text-amber-300 font-semibold bg-amber-500/15 px-3 py-1.5 rounded-xl border border-amber-500/30 inline-block">
                      💡 {currentCard.note}
                    </p>
                  )}
                </div>

                {/* Bottom hint */}
                <div className="text-center text-xs text-theme-subtle font-medium flex items-center justify-center flex-wrap gap-2">
                  <span>Bấm để lật lại</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-2 py-0.5 bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 border border-indigo-500/30 rounded font-mono text-[11px] font-bold">M</kbd>
                    <span>nghe đọc</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <span>Phím</span>
                    <kbd className="px-1.5 py-0.5 bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-500/30 rounded font-mono text-[11px] font-bold">1</kbd>
                    <kbd className="px-1.5 py-0.5 bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 rounded font-mono text-[11px] font-bold">2</kbd>
                    <kbd className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 rounded font-mono text-[11px] font-bold">3</kbd>
                    <kbd className="px-1.5 py-0.5 bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 border border-indigo-500/30 rounded font-mono text-[11px] font-bold">4</kbd>
                    <span>đánh giá</span>
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Assessment Controls - SM-2 Spaced Repetition */}
      <div className="max-w-2xl mx-auto w-full space-y-2.5 pt-2">
        {/* 4 Nút Đánh giá SM-2 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
          {/* 1. Quên */}
          <button
            onClick={() => handleRate('again')}
            title="Quên từ - Ôn lại sau 1 ngày (Phím 1)"
            className="py-2.5 px-2 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-700 dark:text-rose-400 border border-rose-500/30 font-bold transition-all flex flex-col items-center justify-center cursor-pointer shadow-xs active:scale-95"
          >
            <div className="flex items-center space-x-1 text-xs sm:text-sm">
              <X className="w-3.5 h-3.5 shrink-0" />
              <span>Quên (1)</span>
            </div>
            <span className="text-[11px] opacity-80 font-medium mt-0.5">&lt; 1 ngày</span>
          </button>

          {/* 2. Khó */}
          <button
            onClick={() => handleRate('hard')}
            title={`Nhớ nhưng khó - Ôn lại sau ${intervalHard} (Phím 2)`}
            className="py-2.5 px-2 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-400 border border-amber-500/30 font-bold transition-all flex flex-col items-center justify-center cursor-pointer shadow-xs active:scale-95"
          >
            <div className="flex items-center space-x-1 text-xs sm:text-sm">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>Khó (2)</span>
            </div>
            <span className="text-[11px] opacity-80 font-medium mt-0.5">{intervalHard}</span>
          </button>

          {/* 3. Nhớ */}
          <button
            onClick={() => handleRate('good')}
            title={`Nhớ tốt - Ôn lại sau ${intervalGood} (Phím 3)`}
            className="py-2.5 px-2 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-bold transition-all flex flex-col items-center justify-center cursor-pointer shadow-xs active:scale-95"
          >
            <div className="flex items-center space-x-1 text-xs sm:text-sm">
              <Check className="w-3.5 h-3.5 shrink-0" />
              <span>Nhớ (3)</span>
            </div>
            <span className="text-[11px] opacity-80 font-medium mt-0.5">{intervalGood}</span>
          </button>

          {/* 4. Dễ */}
          <button
            onClick={() => handleRate('easy')}
            title={`Rất dễ và tự tin - Ôn lại sau ${intervalEasy} (Phím 4)`}
            className="py-2.5 px-2 rounded-2xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-700 dark:text-indigo-400 border border-indigo-500/30 font-bold transition-all flex flex-col items-center justify-center cursor-pointer shadow-xs active:scale-95"
          >
            <div className="flex items-center space-x-1 text-xs sm:text-sm">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>Dễ (4)</span>
            </div>
            <span className="text-[11px] opacity-80 font-medium mt-0.5">{intervalEasy}</span>
          </button>
        </div>

        {/* 2 Nút Điều hướng Thẻ trước & Kế tiếp */}
        <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="py-3 px-3 rounded-2xl bg-surface hover:bg-surface-hover text-theme-main text-xs sm:text-sm font-bold border border-theme shadow-xs transition-all disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1.5"
          >
            ← Thẻ trước
          </button>

          <button
            onClick={handleNext}
            className="py-3 px-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-600/25 transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            Kế tiếp →
          </button>
        </div>
      </div>

      {/* Exit Confirmation Modal */}
      <ConfirmModal
        isOpen={showExitConfirm}
        title="Rời khỏi phiên học?"
        message="Bạn đang trong phiên học từ vựng. Rời khỏi lúc này sẽ kết thúc lượt học hiện tại. Bạn có chắc chắn muốn quay về không?"
        confirmText="Rời khỏi"
        cancelText="Ở lại tiếp tục học"
        type="warning"
        onConfirm={() => {
          window.__hasActiveStudySession = false;
          setShowExitConfirm(false);
          navigate('/');
        }}
        onClose={() => setShowExitConfirm(false)}
      />
    </div>
  );
}
