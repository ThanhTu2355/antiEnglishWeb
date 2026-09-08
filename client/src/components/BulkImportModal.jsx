import React, { useState } from 'react';
import { X, UploadCloud, Sparkles, Check } from 'lucide-react';
import { api } from '../api/client';
import { CEFR_LEVELS } from '../utils/levels';

const PRESETS = [
  {
    name: 'IELTS Academic Writing Task 2 (10 từ)',
    data: `deteriorate | trở nên tồi tệ hơn, suy thoái | The economic situation continues to deteriorate. | C1
mitigate | làm dịu bớt, giảm nhẹ hậu quả | Urgent steps are needed to mitigate climate change. | C1
indispensable | không thể thiếu được, thiết yếu | Internet has become indispensable in education. | B2
predominant | chiếm ưu thế, chủ đạo | English is the predominant language in international business. | C1
substantiate | chứng minh, cung cấp bằng chứng | There is little evidence to substantiate these claims. | C2
lucrative | có lợi nhuận cao, sinh lời | He decided to pursue a lucrative career in finance. | B2
inevitable | không thể tránh khỏi | Change is an inevitable part of career development. | B2
prevalent | thịnh hành, lan tỏa rộng rãi | Obesity is prevalent in many modern societies. | C1
feasible | khả thi, có thể thực hiện được | Solar energy is a feasible alternative to coal. | B2
unprecedented | chưa từng có tiền lệ | The project was completed with unprecedented speed. | C2`
  },
  {
    name: 'Công Sở & Phỏng Vấn (8 từ)',
    data: `collaborate | hợp tác làm việc cùng nhau | We frequently collaborate with international teams. | B1
streamline | tinh gọn hóa, tối ưu quy trình | We need to streamline our approval process to save time. | B2
proactive | chủ động, đón đầu vấn đề | Being proactive helps prevent urgent emergencies. | B2
deadline | hạn chót hoàn thành | The team worked overtime to meet the project deadline. | A2
benchmark | tiêu chuẩn chuẩn mực để so sánh | Our performance sets a high benchmark for the industry. | C1
synergy | sự cộng hưởng, tăng hiệu quả khi kết hợp | The merger created great synergy between the two firms. | C1
proficiency | sự thành thạo, tinh thông | Proficiency in English is required for this role. | B2
innovative | mang tính đổi mới, sáng tạo | She proposed an innovative solution to the customer issue. | B2`
  }
];

export default function BulkImportModal({ isOpen, onClose, folderId, onImported }) {
  const [rawText, setRawText] = useState('');
  const [defaultLevel, setDefaultLevel] = useState('B1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  // Parsing lines: word | meaning | example (optional) | level (optional)
  const parseLines = (text) => {
    const validLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    return text
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && line.includes('|'))
      .map(line => {
        const parts = line.split('|').map(p => p.trim());
        const word = parts[0] || '';
        const meaning = parts[1] || '';
        let example_en = parts[2] || '';
        let level = defaultLevel;

        if (parts.length >= 4) {
          if (parts[3]) {
            const rawLvl = parts[3].toUpperCase();
            if (validLevels.includes(rawLvl)) {
              level = rawLvl;
            }
          }
        } else if (parts.length === 3) {
          const rawLvl = parts[2].toUpperCase();
          if (validLevels.includes(rawLvl)) {
            level = rawLvl;
            example_en = '';
          }
        }

        return {
          word,
          meaning,
          example_en,
          part_of_speech: 'noun',
          level
        };
      })
      .filter(card => card.word && card.meaning);
  };

  const parsedCards = parseLines(rawText);

  async function handleImport(e) {
    e.preventDefault();
    if (parsedCards.length === 0) {
      setError('Vui lòng nhập ít nhất 1 dòng từ vựng hợp lệ theo định dạng: Từ | Nghĩa');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await api.cards.bulkCreate({
        folder_id: Number(folderId),
        default_level: defaultLevel,
        cards: parsedCards
      });
      onImported();
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
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-theme bg-surface">
          <div className="flex items-center space-x-2">
            <UploadCloud className="w-5 h-5 text-indigo-400" />
            <h3 className="text-lg font-bold text-theme-main">Nhập hàng loạt từ vựng</h3>
          </div>
          <button
            onClick={onClose}
            className="text-theme-subtle hover:text-theme-main p-1.5 rounded-xl hover:bg-surface-hover transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleImport} className="p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-400 text-sm font-semibold">
              {error}
            </div>
          )}

          {/* Presets */}
          <div>
            <span className="text-xs font-bold text-theme-main uppercase tracking-wider block mb-2">
              Bộ từ vựng mẫu sẵn có (1-click để nạp):
            </span>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setRawText(preset.data)}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>{preset.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Default Level Selector */}
          <div>
            <label className="block text-xs font-bold text-theme-main uppercase tracking-wider mb-1">
              Cấp bậc CEFR mặc định (nếu dòng không ghi cấp bậc):
            </label>
            <select
              value={defaultLevel}
              onChange={(e) => setDefaultLevel(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-input-theme border border-theme rounded-xl text-theme-main font-bold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              {CEFR_LEVELS.map(lvl => (
                <option key={lvl.id} value={lvl.id}>
                  {lvl.label}
                </option>
              ))}
            </select>
          </div>

          {/* Text Area */}
          <div>
            <label className="block text-xs font-bold text-theme-main uppercase tracking-wider mb-1">
              Dán danh sách từ (Mỗi dòng một từ: <span className="text-indigo-400 font-mono">Từ | Nghĩa | Ví dụ (tuỳ chọn) | Cấp bậc (tuỳ chọn)</span>):
            </label>
            <textarea
              rows={8}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={`VD:\nresilient | kiên cường, dẻo dai | They are resilient. | C1\ninnovative | mang tính đổi mới | An innovative solution. | B2\ncollaborate | hợp tác làm việc | We collaborate well. | B1`}
              className="w-full px-4 py-3 bg-input-theme border border-theme rounded-xl text-theme-main font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Preview count */}
          <div className="flex items-center justify-between text-xs px-4 py-2.5 bg-input-theme rounded-xl border border-theme-subtle text-theme-muted font-medium">
            <span>Số từ nhận diện được:</span>
            <span className="font-black text-emerald-400 text-sm">{parsedCards.length} từ</span>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-theme-subtle">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-theme-muted hover:text-theme-main hover:bg-surface-hover rounded-xl transition-colors cursor-pointer border border-theme"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading || parsedCards.length === 0}
              className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50 cursor-pointer flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>{loading ? 'Đang thêm...' : `Lưu ${parsedCards.length} từ vào thư mục`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
