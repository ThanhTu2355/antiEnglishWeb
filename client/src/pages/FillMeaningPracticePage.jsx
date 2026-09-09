import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Award, Sparkles, CheckCircle2, XCircle, 
  Flame, HelpCircle, ArrowRight, RotateCw, Folder, Layers
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../api/client';
import { useAuth } from '../context/useAuth';
import TTSButton from '../components/TTSButton';
import ConfirmModal from '../components/ConfirmModal';
import CustomSelect from '../components/CustomSelect';
import { CEFR_LEVELS, getLevelBadge } from '../utils/levels';

export default function FillMeaningPracticePage() {
  const { folderId } = useParams();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const [folders, setFolders] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState(folderId || 'all');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all'); // 'all' | 'unmastered' | 'mastered'
  const [mode, setMode] = useState('fill_meaning'); // 'fill_meaning' | 'fill_word' | 'multiple_choice'
  const [limit, setLimit] = useState(10);

  useEffect(() => {
    if (folderId) {
      setSelectedFolderId(folderId);
    }
  }, [folderId]);

  // Quiz state
  const [quizState, setQuizState] = useState('setup'); // 'setup' | 'playing' | 'result'
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [checkedResult, setCheckedResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isQuitModalOpen, setIsQuitModalOpen] = useState(false);

  // Results tracking
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [historyResults, setHistoryResults] = useState([]);

  // Hint state
  const [showHint, setShowHint] = useState(false);

  const inputRef = useRef(null);

  useEffect(() => {
    loadFolders();
  }, []);

  // Track active study session for exit confirmation pop-up
  useEffect(() => {
    const isSessionActive = quizState === 'playing';
    window.__hasActiveStudySession = isSessionActive;

    if (isSessionActive) {
      // Push history entry to intercept browser back button
      window.history.pushState({ inPracticeSession: true }, '');

      function handlePopState() {
        window.history.pushState({ inPracticeSession: true }, '');
        setIsQuitModalOpen(true);
      }

      window.addEventListener('popstate', handlePopState);
      return () => {
        window.__hasActiveStudySession = false;
        window.removeEventListener('popstate', handlePopState);
      };
    } else {
      window.__hasActiveStudySession = false;
    }
  }, [quizState]);

  async function loadFolders() {
    try {
      const data = await api.folders.getAll();
      setFolders(data);
    } catch (err) {
      console.error('Failed to load folders:', err);
    }
  }

  async function startQuiz() {
    try {
      setLoading(true);
      setError('');
      const params = {
        mode,
        limit,
        folder_id: selectedFolderId === 'all' ? undefined : selectedFolderId,
        level: selectedLevel === 'all' ? undefined : selectedLevel,
        status: selectedStatus === 'all' ? undefined : selectedStatus
      };

      const res = await api.practice.getQuestions(params);
      const questionList = Array.isArray(res) ? res : (res?.questions || []);
      if (!questionList || questionList.length === 0) {
        let msg = 'Không có từ vựng nào trong thư mục này để luyện tập. Hãy thêm từ trước!';
        if (selectedStatus === 'unmastered') {
          msg = 'Tuyệt vời! Bạn không có từ vựng nào "Chưa thuộc" phù hợp với bộ lọc đã chọn.';
        } else if (selectedLevel !== 'all') {
          msg = `Không có từ vựng nào thuộc cấp bậc ${selectedLevel} trong thư mục đã chọn để luyện tập.`;
        }
        setError(msg);
        return;
      }

      setQuestions(questionList);
      setCurrentIndex(0);
      setUserAnswer('');
      setCheckedResult(null);
      setScore(0);
      setStreak(0);
      setHistoryResults([]);
      setShowHint(false);
      setQuizState('playing');
    } catch (err) {
      setError(err.message || 'Lỗi khi tạo bài kiểm tra');
    } finally {
      setLoading(false);
    }
  }

  // Focus input on new question
  useEffect(() => {
    if (quizState === 'playing' && mode !== 'multiple_choice') {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [currentIndex, quizState, mode]);

  async function handleCheckAnswer(answerOverride) {
    if (checkedResult !== null) return; // already answered
    const currentQ = questions[currentIndex];
    if (!currentQ) return;
    const answerToTest = answerOverride !== undefined ? answerOverride : userAnswer;

    if (!answerToTest.trim()) return;

    try {
      setLoading(true);
      const res = await api.practice.checkAnswer({
        card_id: currentQ.id || currentQ.card_id,
        user_answer: answerToTest,
        mode: currentQ.mode || mode
      });

      setCheckedResult(res);

      if (res.is_correct) {
        setScore(prev => prev + 1);
        setStreak(prev => prev + 1);
        confetti({
          particleCount: 35,
          spread: 60,
          origin: { y: 0.8 }
        });
      } else {
        setStreak(0);
      }

      setHistoryResults(prev => [
        ...prev,
        {
          question: currentQ,
          userAnswer: answerToTest,
          isCorrect: res.is_correct,
          expectedAnswer: res.expected_answer
        }
      ]);
    } catch (err) {
      console.error('Check error:', err);
      setError('Lỗi kiểm tra đáp án: ' + (err.message || 'Vui lòng thử lại'));
    } finally {
      setLoading(false);
    }
  }

  function handleNextQuestion() {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setUserAnswer('');
      setCheckedResult(null);
      setShowHint(false);
    } else {
      finishQuiz();
    }
  }

  async function finishQuiz() {
    setQuizState('result');
    confetti({
      particleCount: 100,
      spread: 80,
      origin: { y: 0.6 }
    });

    try {
      await api.practice.submitQuiz({
        score,
        total_questions: questions.length,
        mode,
        folder_id: selectedFolderId === 'all' ? null : selectedFolderId
      });
      refreshUser?.();
    } catch (err) {
      console.error('Failed to submit score:', err);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      if (checkedResult) {
        handleNextQuestion();
      } else {
        handleCheckAnswer();
      }
    }
  }

  const folderPracticeOptions = [
    {
      value: 'all',
      label: 'Tất cả thư mục từ vựng của bạn',
      icon: Layers,
      iconColor: 'text-purple-400'
    },
    ...folders.map(f => ({
      value: f.id,
      label: f.name,
      icon: Folder,
      iconColor: 'text-purple-400',
      count: f.card_count || 0
    }))
  ];

  // --- SCREEN 1: SETUP ---
  if (quizState === 'setup') {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-fade-in transition-colors duration-200">
        <div className="flex items-center space-x-2 text-sm text-theme-subtle font-medium">
          <button onClick={() => navigate('/')} className="flex items-center space-x-1 hover:text-indigo-400 transition-colors cursor-pointer">
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại</span>
          </button>
          <span>/</span>
          <span className="text-theme-main font-bold">Tạo bài điền nghĩa & Luyện tập</span>
        </div>

        <div className="bg-surface border border-theme rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center text-white shadow-md shadow-purple-600/20">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-theme-main">Tạo Bài Luyện Tập Điền Nghĩa</h2>
              <p className="text-xs text-theme-subtle font-medium">Tùy chỉnh nội dung và hình thức kiểm tra ghi nhớ từ vựng</p>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-400 text-sm font-semibold">
              {error}
            </div>
          )}

          {/* 1. Select Folder */}
          <div>
            <label className="block text-xs font-bold text-theme-main uppercase tracking-wider mb-2">
              1. Chọn thư mục từ vựng để luyện tập
            </label>
            <CustomSelect
              value={selectedFolderId}
              onChange={(val) => {
                setSelectedFolderId(val);
                navigate(val === 'all' ? '/practice' : `/practice/${val}`);
              }}
              options={folderPracticeOptions}
              className="w-full"
              size="lg"
            />
          </div>

          {/* Level Filter */}
          <div>
            <label className="block text-xs font-bold text-theme-main uppercase tracking-wider mb-2">
              2. Lọc theo Cấp bậc CEFR
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              <button
                type="button"
                onClick={() => setSelectedLevel('all')}
                className={`py-2 px-2 text-xs font-extrabold rounded-xl border transition-all cursor-pointer ${
                  selectedLevel === 'all'
                    ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                    : 'bg-surface border-theme text-theme-muted hover:bg-surface-hover'
                }`}
              >
                Tất cả
              </button>
              {CEFR_LEVELS.map(lvl => (
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() => setSelectedLevel(lvl.id)}
                  className={`py-2 px-2 text-xs font-extrabold rounded-xl border transition-all cursor-pointer ${
                    selectedLevel === lvl.id
                      ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                      : 'bg-surface border-theme text-theme-muted hover:bg-surface-hover'
                  }`}
                >
                  {lvl.id}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Status Filter */}
          <div>
            <label className="block text-xs font-bold text-theme-main uppercase tracking-wider mb-2">
              3. Phân loại từ vựng
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSelectedStatus('all')}
                className={`py-2.5 px-3 text-xs sm:text-sm font-extrabold rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  selectedStatus === 'all'
                    ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                    : 'bg-surface border-theme text-theme-muted hover:bg-surface-hover'
                }`}
              >
                <span>Tất cả từ</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedStatus('unmastered')}
                className={`py-2.5 px-3 text-xs sm:text-sm font-extrabold rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  selectedStatus === 'unmastered'
                    ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                    : 'bg-surface border-theme text-theme-muted hover:bg-surface-hover'
                }`}
              >
                <span>❌ Chỉ từ chưa thuộc</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedStatus('mastered')}
                className={`py-2.5 px-3 text-xs sm:text-sm font-extrabold rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  selectedStatus === 'mastered'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-surface border-theme text-theme-muted hover:bg-surface-hover'
                }`}
              >
                <span>✅ Chỉ từ đã thuộc</span>
              </button>
            </div>
          </div>

          {/* 4. Select Practice Mode */}
          <div>
            <label className="block text-xs font-bold text-theme-main uppercase tracking-wider mb-2">
              4. Chọn hình thức kiểm tra
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setMode('fill_meaning')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  mode === 'fill_meaning'
                    ? 'bg-purple-500/15 border-purple-500 text-purple-300 shadow-sm'
                    : 'bg-surface border-theme text-theme-muted hover:border-purple-500/50 hover:bg-surface-hover'
                }`}
              >
                <span className="block text-sm font-extrabold mb-1">✍️ Gõ Điền Nghĩa</span>
                <span className="block text-xs text-theme-subtle font-medium">Xem từ tiếng Anh & gõ nghĩa tiếng Việt</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('fill_word')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  mode === 'fill_word'
                    ? 'bg-purple-500/15 border-purple-500 text-purple-300 shadow-sm'
                    : 'bg-surface border-theme text-theme-muted hover:border-purple-500/50 hover:bg-surface-hover'
                }`}
              >
                <span className="block text-sm font-extrabold mb-1">🔤 Gõ Từ Vựng</span>
                <span className="block text-xs text-theme-subtle font-medium">Xem nghĩa tiếng Việt & gõ từ tiếng Anh</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('multiple_choice')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                  mode === 'multiple_choice'
                    ? 'bg-purple-500/15 border-purple-500 text-purple-300 shadow-sm'
                    : 'bg-surface border-theme text-theme-muted hover:border-purple-500/50 hover:bg-surface-hover'
                }`}
              >
                <span className="block text-sm font-extrabold mb-1">🎯 Trắc Nghiệm</span>
                <span className="block text-xs text-theme-subtle font-medium">Chọn nhanh 1 trong 4 đáp án đúng</span>
              </button>
            </div>
          </div>

          {/* 5. Number of Questions */}
          <div>
            <label className="block text-xs font-bold text-theme-main uppercase tracking-wider mb-2">
              5. Số lượng câu hỏi ({limit === 'all' ? 'Tất cả câu' : `${limit} câu`})
            </label>
            <div className="grid grid-cols-5 gap-2">
              {[5, 10, 15, 20, 'all'].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setLimit(val)}
                  className={`py-2.5 rounded-xl border font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                    limit === val
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-surface border-theme text-theme-muted hover:bg-surface-hover'
                  }`}
                >
                  {val === 'all' ? 'Tất cả câu' : `${val} câu`}
                </button>
              ))}
            </div>
          </div>

          {/* Start Button */}
          <button
            onClick={startQuiz}
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:opacity-95 text-white font-bold text-base shadow-lg shadow-purple-600/25 flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-5 h-5" />
            <span>{loading ? 'Đang tạo bài kiểm tra...' : 'Bắt đầu Luyện tập ngay'}</span>
          </button>
        </div>
      </div>
    );
  }

  // --- SCREEN 3: RESULTS ---
  if (quizState === 'result') {
    const accuracy = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;

    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-fade-in transition-colors duration-200">
        <div className="bg-surface border border-theme rounded-3xl p-8 text-center shadow-xl space-y-6">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-600/25">
            <Award className="w-10 h-10 text-white" />
          </div>

          <div>
            <h2 className="text-3xl font-black text-theme-main">Kết Quả Bài Luyện Tập</h2>
            <p className="text-sm text-theme-muted mt-1 font-medium">
              {accuracy >= 80 ? 'Xuất sắc! Vốn từ vựng của bạn rất vững chắc!' :
               accuracy >= 50 ? 'Khá tốt! Hãy ôn lại một vài từ bạn còn phân vân nhé.' :
               'Cố gắng lên! Ôn lại flashcard thêm một chút sẽ tiến bộ rất nhanh.'}
            </p>
          </div>

          {/* Score metrics */}
          <div className="grid grid-cols-3 gap-3 py-2">
            <div className="bg-input-theme rounded-2xl p-4 border border-theme-subtle">
              <span className="text-xs text-theme-subtle font-medium block">Điểm số</span>
              <span className="text-2xl font-black text-indigo-400 mt-1 block">{score} / {questions.length}</span>
            </div>
            <div className="bg-input-theme rounded-2xl p-4 border border-theme-subtle">
              <span className="text-xs text-theme-subtle font-medium block">Độ chính xác</span>
              <span className="text-2xl font-black text-emerald-400 mt-1 block">{accuracy}%</span>
            </div>
            <div className="bg-input-theme rounded-2xl p-4 border border-theme-subtle">
              <span className="text-xs text-theme-subtle font-medium block">Chuỗi cao nhất</span>
              <span className="text-2xl font-black text-amber-400 mt-1 block">🔥 {streak}</span>
            </div>
          </div>

          {/* Question Review List */}
          <div className="text-left space-y-3 pt-4 border-t border-theme-subtle">
            <h3 className="text-sm font-bold text-theme-main uppercase tracking-wider">
              Chi tiết câu trả lời:
            </h3>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {historyResults.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs sm:text-sm ${
                    item.isCorrect
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                  }`}
                >
                  <div className="space-y-0.5 truncate mr-3">
                    <div className="flex items-center space-x-2">
                      <span className="font-extrabold text-theme-main">{item.question.word}</span>
                      <span className="text-xs text-theme-subtle font-mono">({item.question.phonetic})</span>
                    </div>
                    <p className="text-xs text-theme-muted">
                      Nghĩa đúng: <span className="font-bold text-theme-main">{item.expectedAnswer}</span>
                    </p>
                    {!item.isCorrect && item.userAnswer && (
                      <p className="text-[11px] text-rose-400 font-semibold">
                        Bạn đã trả lời: "{item.userAnswer}"
                      </p>
                    )}
                  </div>

                  <div className="flex-shrink-0">
                    {item.isCorrect ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-400" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-theme-subtle">
            <button
              onClick={() => setQuizState('setup')}
              className="py-3 px-4 rounded-2xl bg-surface hover:bg-surface-hover text-theme-main font-bold text-sm transition-all border border-theme flex items-center justify-center space-x-2 cursor-pointer"
            >
              <RotateCw className="w-4 h-4" />
              <span>Tạo bài mới</span>
            </button>

            <button
              onClick={startQuiz}
              className="py-3 px-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-md shadow-purple-600/20 transition-all flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Làm lại bài này</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- SCREEN 2: IN-PROGRESS QUIZ ---
  const currentQ = questions[currentIndex];
  if (!currentQ && quizState === 'playing') {
    return (
      <div className="py-24 text-center text-theme-subtle">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="font-medium">Đang chuẩn bị câu hỏi...</p>
      </div>
    );
  }
  const progressPercent = questions.length > 0 ? Math.round(((currentIndex + 1) / questions.length) * 100) : 0;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-fade-in transition-colors duration-200">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setIsQuitModalOpen(true)}
          className="p-2.5 bg-surface hover:bg-surface-hover text-theme-muted rounded-xl border border-theme shadow-xs transition-colors cursor-pointer"
          title="Thoát bài tập"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3">
          {streak >= 2 && (
            <div className="flex items-center space-x-1 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold animate-pulse shadow-xs">
              <Flame className="w-3.5 h-3.5" />
              <span>Chuỗi {streak}</span>
            </div>
          )}

          <div className="px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 text-xs font-extrabold shadow-xs">
            Điểm: {score}
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-bold text-theme-subtle">
          <span>Câu {currentIndex + 1} / {questions.length}</span>
          <span>{progressPercent}%</span>
        </div>
        <div className="w-full bg-input-theme rounded-full h-2 overflow-hidden border border-theme-subtle">
          <div
            className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Main Question Card */}
      <div className="bg-surface border border-theme rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="text-center space-y-3 pb-2">
          <div className="flex items-center justify-center gap-2">
            <div className="inline-block px-3 py-1 rounded-full bg-input-theme border border-theme-subtle text-[11px] font-bold text-theme-subtle uppercase tracking-wider">
              <span>
                {mode === 'fill_meaning' ? 'Gõ nghĩa tiếng Việt tương ứng:' :
                 mode === 'fill_word' ? 'Gõ từ tiếng Anh tương ứng:' :
                 'Chọn nghĩa tiếng Việt đúng nhất:'}
              </span>
            </div>
            {currentQ.level && (
              <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${getLevelBadge(currentQ.level).badgeClass}`}>
                {currentQ.level}
              </span>
            )}
          </div>

          {mode === 'fill_meaning' || mode === 'multiple_choice' ? (
            <div className="space-y-2">
              <div className="flex items-center justify-center space-x-3">
                <h2 className="text-3xl sm:text-4xl font-black text-theme-main">
                  {currentQ.word}
                </h2>
                <TTSButton text={currentQ.word} size={20} className="p-2 bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500/25 rounded-xl" />
              </div>
              {currentQ.phonetic && (
                <p className="text-base font-mono text-purple-400 font-bold">{currentQ.phonetic}</p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-black text-theme-main">
                {currentQ.meaning}
              </h2>
              {currentQ.part_of_speech && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 font-bold border border-indigo-500/30">
                  {currentQ.part_of_speech}
                </span>
              )}
            </div>
          )}

          {/* Context Example sentence */}
          {currentQ.example_en && (
            <div className="max-w-md mx-auto p-3.5 rounded-2xl bg-input-theme border border-theme-subtle text-xs sm:text-sm italic text-theme-muted font-medium mt-3">
              "{currentQ.example_en}"
            </div>
          )}
        </div>

        {/* Input or Options based on Mode */}
        {mode === 'multiple_choice' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {currentQ.options?.map((option, idx) => {
              let btnClass = 'bg-surface border border-theme text-theme-main hover:border-purple-500/60 hover:bg-surface-hover shadow-xs';
              if (checkedResult) {
                if (option === checkedResult.expected_answer) {
                  btnClass = 'bg-emerald-500/20 border-2 border-emerald-500 text-emerald-300 font-bold ring-2 ring-emerald-500/50';
                } else if (option === userAnswer && !checkedResult.is_correct) {
                  btnClass = 'bg-rose-500/20 border-2 border-rose-500 text-rose-300 line-through';
                } else {
                  btnClass = 'opacity-30 bg-surface border-theme text-theme-subtle';
                }
              }

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={checkedResult !== null || loading}
                  onClick={() => {
                    setUserAnswer(option);
                    handleCheckAnswer(option);
                  }}
                  className={`p-4 rounded-2xl text-left text-sm font-bold transition-all cursor-pointer flex items-center justify-between ${btnClass}`}
                >
                  <span>{option}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3 pt-2">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                disabled={checkedResult !== null}
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  mode === 'fill_meaning'
                    ? 'Nhập nghĩa tiếng Việt (VD: từ bỏ, kiên cường...)'
                    : 'Gõ từ tiếng Anh...'
                }
                className={`w-full px-5 py-3.5 bg-input-theme border-2 rounded-2xl text-base text-theme-main placeholder:text-theme-subtle font-semibold focus:outline-none transition-all shadow-xs ${
                  checkedResult
                    ? checkedResult.is_correct
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                      : 'border-rose-500 bg-rose-500/10 text-rose-300'
                    : 'border-theme focus:border-purple-500'
                }`}
              />
            </div>

            {/* Hint toggler */}
            {!checkedResult && (
              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => setShowHint(true)}
                  className="text-theme-subtle hover:text-amber-400 flex items-center gap-1 transition-colors cursor-pointer font-medium"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Cần gợi ý?</span>
                </button>
                {showHint && (
                  <span className="text-amber-400 font-bold bg-amber-500/15 px-2 py-0.5 rounded border border-amber-500/30">
                    Gợi ý: Bắt đầu bằng chữ "{mode === 'fill_meaning' ? currentQ.meaning.charAt(0) : currentQ.word.charAt(0)}"
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Feedback Area when Answer Checked */}
        {checkedResult && (
          <div
            className={`p-4 rounded-2xl border-2 animate-fade-in ${
              checkedResult.is_correct
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
            }`}
          >
            <div className="flex items-start space-x-3">
              {checkedResult.is_correct ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-6 h-6 text-rose-400 flex-shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <p className="text-sm font-bold">
                  {checkedResult.is_correct ? 'Chính xác! 🎉' : 'Chưa chính xác!'}
                </p>
                <p className="text-xs text-theme-muted">
                  Đáp án chuẩn: <span className="font-extrabold text-theme-main">{checkedResult.expected_answer}</span>
                </p>
                {checkedResult.note && (
                  <p className="text-[11px] text-amber-400 font-medium pt-1">💡 {checkedResult.note}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action button */}
        <div>
          {checkedResult ? (
            <button
              onClick={handleNextQuestion}
              className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-md shadow-indigo-600/25 flex items-center justify-center space-x-2 transition-all cursor-pointer"
            >
              <span>{currentIndex < questions.length - 1 ? 'Câu tiếp theo (Enter)' : 'Xem kết quả tổng kết (Enter)'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : mode !== 'multiple_choice' ? (
            <button
              onClick={() => handleCheckAnswer()}
              disabled={!userAnswer.trim() || loading}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-md shadow-purple-600/25 flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:opacity-40"
            >
              <span>Kiểm tra đáp án (Enter)</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* Quit Confirmation Modal */}
      <ConfirmModal
        isOpen={isQuitModalOpen}
        title="Rời khỏi phiên học?"
        message="Bạn đang trong phiên học từ vựng. Rời khỏi lúc này sẽ kết thúc lượt học hiện tại. Bạn có chắc chắn muốn quay về không?"
        confirmText="Rời khỏi"
        cancelText="Ở lại tiếp tục học"
        type="warning"
        onConfirm={() => {
          window.__hasActiveStudySession = false;
          setIsQuitModalOpen(false);
          navigate('/');
        }}
        onClose={() => setIsQuitModalOpen(false)}
      />
    </div>
  );
}
