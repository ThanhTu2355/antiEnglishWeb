import React, { useState, useEffect } from 'react';
import { X, BookPlus, Sparkles, Loader2, Wand2 } from 'lucide-react';
import { api } from '../api/client';
import TTSButton from './TTSButton';
import { CEFR_LEVELS } from '../utils/levels';
import { lookupEnglishWord } from '../utils/dictionary';

const SAMPLE_WORDS = [
  { word: 'resilience', phonetic: '/rɪˈzɪl.jəns/', meaning: 'khả năng phục hồi, kiên cường', pos: 'noun', level: 'C1', en: 'Courage and resilience are needed to face adversity.', vi: 'Lòng can đảm và sự kiên cường là cần thiết để đối mặt nghịch cảnh.', n: 'Gốc từ: resilire (bật lại)' },
  { word: 'meticulous', phonetic: '/məˈtɪk.jə.ləs/', meaning: 'tỉ mỉ, cẩn thận từng chi tiết', pos: 'adjective', level: 'C1', en: 'He was meticulous in following the checklist.', vi: 'Anh ấy rất tỉ mỉ trong việc làm theo danh sách kiểm tra.', n: 'Đồng nghĩa: thorough, detailed' },
  { word: 'lucid', phonetic: '/ˈluː.sɪd/', meaning: 'rõ ràng, mạch lạc, sáng sủa', pos: 'adjective', level: 'B2', en: 'She gave a clear and lucid explanation of the concept.', vi: 'Cô ấy đã đưa ra lời giải thích mạch lạc và dễ hiểu về khái niệm đó.', n: 'Trái nghĩa: vague, confusing' },
  { word: 'alleviate', phonetic: '/əˈliː.vi.eɪt/', meaning: 'làm giảm bớt, xoa dịu (nỗi đau, khó khăn)', pos: 'verb', level: 'C1', en: 'The medicine helped alleviate the symptoms.', vi: 'Thuốc đã giúp làm giảm bớt các triệu chứng.', n: 'Đồng nghĩa: relieve, ease' },
  { word: 'ubiquitous', phonetic: '/juːˈbɪk.wɪ.təs/', meaning: 'có mặt ở khắp nơi, phổ biến', pos: 'adjective', level: 'C2', en: 'Smartphones have become ubiquitous in daily life.', vi: 'Điện thoại thông minh đã trở nên phổ biến khắp nơi trong đời sống.', n: 'Đồng nghĩa: omnipresent' },
  { word: 'curiosity', phonetic: '/ˌkjʊr.iˈɑː.sə.t̬i/', meaning: 'sự tò mò, lòng hiếu kỳ', pos: 'noun', level: 'B1', en: 'Children have a natural curiosity about the world.', vi: 'Trẻ em có tính tò mò tự nhiên về thế giới xung quanh.', n: 'Tính từ: curious' },
  { word: 'essential', phonetic: '/ɪˈsen.ʃəl/', meaning: 'thiết yếu, cực kỳ quan trọng', pos: 'adjective', level: 'A2', en: 'Water is essential for all living beings.', vi: 'Nước là thiết yếu cho mọi sinh vật sống.', n: 'Đồng nghĩa: vital, crucial' },
];

export default function CardModal({ isOpen, onClose, folderId, cardToEdit, onSaved }) {
  const [word, setWord] = useState('');
  const [phonetic, setPhonetic] = useState('');
  const [meaning, setMeaning] = useState('');
  const [partOfSpeech, setPartOfSpeech] = useState('noun');
  const [level, setLevel] = useState('B1');
  const [exampleEn, setExampleEn] = useState('');
  const [exampleVi, setExampleVi] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Auto lookup states
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupNotice, setLookupNotice] = useState('');
  const [manuallyChangedPhonetic, setManuallyChangedPhonetic] = useState(false);
  const [manuallyChangedLevel, setManuallyChangedLevel] = useState(false);
  const [manuallyChangedPOS, setManuallyChangedPOS] = useState(false);

  useEffect(() => {
    if (cardToEdit) {
      setWord(cardToEdit.word || '');
      setPhonetic(cardToEdit.phonetic || '');
      setMeaning(cardToEdit.meaning || '');
      setPartOfSpeech(cardToEdit.part_of_speech || 'noun');
      setLevel(cardToEdit.level || 'B1');
      setExampleEn(cardToEdit.example_en || '');
      setExampleVi(cardToEdit.example_vi || '');
      setNote(cardToEdit.note || '');
    } else {
      setWord('');
      setPhonetic('');
      setMeaning('');
      setPartOfSpeech('noun');
      setLevel('B1');
      setExampleEn('');
      setExampleVi('');
      setNote('');
    }
    setError('');
    setIsLookingUp(false);
    setLookupNotice('');
    setManuallyChangedPhonetic(false);
    setManuallyChangedLevel(false);
    setManuallyChangedPOS(false);
  }, [cardToEdit, isOpen]);

  // Debounced auto-lookup when entering English word
  useEffect(() => {
    if (!isOpen || cardToEdit) return;
    const cleanWord = word.trim();
    if (cleanWord.length < 2) {
      setLookupNotice('');
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsLookingUp(true);
        const info = await lookupEnglishWord(cleanWord);
        if (info) {
          if (!manuallyChangedPhonetic && info.phonetic) {
            setPhonetic(info.phonetic);
          }
          if (!manuallyChangedLevel && info.level) {
            setLevel(info.level);
          }
          if (!manuallyChangedPOS && info.partOfSpeech) {
            setPartOfSpeech(info.partOfSpeech);
          }
          setLookupNotice(`Đã tự động nhận diện: ${info.phonetic ? info.phonetic + ' • ' : ''}Cấp bậc ${info.level}`);
        }
      } catch (err) {
        console.warn('Auto lookup failed:', err);
      } finally {
        setIsLookingUp(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [word, isOpen, cardToEdit, manuallyChangedPhonetic, manuallyChangedLevel, manuallyChangedPOS]);

  // Manual trigger for instant lookup
  async function handleManualLookup() {
    const cleanWord = word.trim();
    if (!cleanWord) return;
    try {
      setIsLookingUp(true);
      const info = await lookupEnglishWord(cleanWord);
      if (info) {
        if (info.phonetic) setPhonetic(info.phonetic);
        if (info.level) setLevel(info.level);
        if (info.partOfSpeech) setPartOfSpeech(info.partOfSpeech);
        setLookupNotice(`Đã cập nhật: ${info.phonetic ? info.phonetic + ' • ' : ''}Cấp bậc ${info.level}`);
      }
    } catch (err) {
      console.warn('Manual lookup failed:', err);
    } finally {
      setIsLookingUp(false);
    }
  }

  if (!isOpen) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!word.trim() || !meaning.trim()) {
      setError('Vui lòng nhập Từ vựng tiếng Anh và Nghĩa tiếng Việt');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const payload = {
        folder_id: folderId || cardToEdit?.folder_id,
        word: word.trim(),
        phonetic: phonetic.trim(),
        meaning: meaning.trim(),
        part_of_speech: partOfSpeech,
        level: level || 'B1',
        example_en: exampleEn.trim(),
        example_vi: exampleVi.trim(),
        note: note.trim(),
      };

      if (cardToEdit) {
        await api.cards.update(cardToEdit.id || cardToEdit._id, payload);
      } else {
        await api.cards.create(payload);
      }

      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const fillSample = () => {
    const pick = SAMPLE_WORDS[Math.floor(Math.random() * SAMPLE_WORDS.length)];
    setWord(pick.word);
    setPhonetic(pick.phonetic);
    setMeaning(pick.meaning);
    setPartOfSpeech(pick.pos);
    setLevel(pick.level || 'B1');
    setExampleEn(pick.en);
    setExampleVi(pick.vi);
    setNote(pick.n);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-lg bg-surface border border-theme rounded-3xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-theme bg-surface">
          <div className="flex items-center space-x-2">
            <BookPlus className="w-5 h-5 text-indigo-400" />
            <h3 className="text-lg font-bold text-theme-main">
              {cardToEdit ? 'Chỉnh sửa thẻ từ vựng' : 'Thêm thẻ từ vựng mới'}
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            {!cardToEdit && (
              <button
                type="button"
                onClick={fillSample}
                title="Tự động điền thử từ mẫu"
                className="text-xs px-2.5 py-1.5 rounded-lg bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500/25 border border-indigo-500/30 font-bold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Điền thử mẫu</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="text-theme-subtle hover:text-theme-main p-1.5 rounded-xl hover:bg-surface-hover transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-400 text-sm font-semibold">
              {error}
            </div>
          )}

          {/* Word & IPA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-theme-main uppercase tracking-wider">
                  Từ vựng tiếng Anh <span className="text-rose-400">*</span>
                </label>
                {word.trim().length >= 2 && (
                  <button
                    type="button"
                    onClick={handleManualLookup}
                    disabled={isLookingUp}
                    className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer transition-colors"
                    title="Tự động tra phiên âm IPA và cấp bậc CEFR"
                  >
                    {isLookingUp ? (
                      <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />
                    ) : (
                      <Wand2 className="w-3 h-3 text-amber-400" />
                    )}
                    <span>{isLookingUp ? 'Đang tra...' : 'Tra tự động'}</span>
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={word}
                  onChange={(e) => setWord(e.target.value)}
                  placeholder="VD: comprehend"
                  className="w-full pl-3.5 pr-10 py-2.5 bg-input-theme border border-theme rounded-xl text-theme-main font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {word.trim() && (
                  <div className="absolute right-2 top-2">
                    <TTSButton text={word} size={14} className="p-1 text-theme-subtle hover:text-indigo-400" />
                  </div>
                )}
              </div>
              {lookupNotice && (
                <p className="text-[11px] text-emerald-400 font-semibold mt-1 flex items-center gap-1 animate-fade-in">
                  <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                  <span className="truncate">{lookupNotice}</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-theme-main uppercase tracking-wider mb-1">
                Phiên âm IPA
              </label>
              <input
                type="text"
                value={phonetic}
                onChange={(e) => {
                  setPhonetic(e.target.value);
                  setManuallyChangedPhonetic(true);
                }}
                placeholder="/ˌkɒm.prɪˈhend/"
                className="w-full px-3.5 py-2.5 bg-input-theme border border-theme rounded-xl text-theme-main font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Meaning, Level & Part of speech */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-theme-main uppercase tracking-wider mb-1">
                Nghĩa tiếng Việt <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={meaning}
                onChange={(e) => setMeaning(e.target.value)}
                placeholder="hiểu, lĩnh hội sâu sắc"
                className="w-full px-3.5 py-2.5 bg-input-theme border border-theme rounded-xl text-theme-main font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-theme-main uppercase tracking-wider mb-1">
                  Cấp bậc CEFR
                </label>
                <select
                  value={level}
                  onChange={(e) => {
                    setLevel(e.target.value);
                    setManuallyChangedLevel(true);
                  }}
                  className="w-full px-3 py-2.5 bg-input-theme border border-theme rounded-xl text-theme-main font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer text-sm"
                >
                  {CEFR_LEVELS.map(lvl => (
                    <option key={lvl.id} value={lvl.id}>{lvl.id}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-theme-main uppercase tracking-wider mb-1">
                  Loại từ
                </label>
                <select
                  value={partOfSpeech}
                  onChange={(e) => {
                    setPartOfSpeech(e.target.value);
                    setManuallyChangedPOS(true);
                  }}
                  className="w-full px-3 py-2.5 bg-input-theme border border-theme rounded-xl text-theme-main font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer text-sm"
                >
                  <option value="noun">Danh từ (n)</option>
                  <option value="verb">Động từ (v)</option>
                  <option value="adjective">Tính từ (adj)</option>
                  <option value="adverb">Trạng từ (adv)</option>
                  <option value="preposition">Giới từ (prep)</option>
                  <option value="phrase">Cụm từ (phrase)</option>
                  <option value="idiom">Thành ngữ (idiom)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Example English */}
          <div>
            <label className="block text-xs font-bold text-theme-main uppercase tracking-wider mb-1">
              Câu ví dụ tiếng Anh
            </label>
            <input
              type="text"
              value={exampleEn}
              onChange={(e) => setExampleEn(e.target.value)}
              placeholder="She couldn't fully comprehend what had happened."
              className="w-full px-3.5 py-2.5 bg-input-theme border border-theme rounded-xl text-theme-main text-sm italic focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Example Vietnamese */}
          <div>
            <label className="block text-xs font-bold text-theme-main uppercase tracking-wider mb-1">
              Dịch câu ví dụ
            </label>
            <input
              type="text"
              value={exampleVi}
              onChange={(e) => setExampleVi(e.target.value)}
              placeholder="Cô ấy không thể hiểu hết những gì vừa xảy ra."
              className="w-full px-3.5 py-2.5 bg-input-theme border border-theme rounded-xl text-theme-muted text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Note / Mnemonic */}
          <div>
            <label className="block text-xs font-bold text-theme-main uppercase tracking-wider mb-1">
              Mẹo ghi nhớ / Ghi chú thêm
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Gốc từ, từ đồng nghĩa hoặc câu chuyện ngắn để nhớ lâu..."
              className="w-full px-3.5 py-2.5 bg-input-theme border border-theme rounded-xl text-theme-main placeholder:text-theme-subtle text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          {/* Footer actions */}
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
              {loading ? 'Đang lưu...' : cardToEdit ? 'Lưu thay đổi' : 'Thêm thẻ từ vựng'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
