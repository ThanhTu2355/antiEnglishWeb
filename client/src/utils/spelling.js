/**
 * Utility to check English spelling and vocabulary validity
 * Uses regex for format checking and Datamuse API for fast dictionary validation.
 */

export async function checkEnglishSpelling(input) {
  const text = (input || '').trim();
  if (!text) {
    return { valid: false, message: 'Vui lòng nhập từ vựng tiếng Anh' };
  }

  // 1. Kiểm tra ký tự tiếng Việt có dấu
  const vietnameseRegex = /[àáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;
  if (vietnameseRegex.test(text)) {
    return {
      valid: false,
      message: 'Từ tiếng Anh chứa ký tự tiếng Việt có dấu.'
    };
  }

  // 2. Ký tự không hợp lệ (cho phép chữ cái a-z, dấu cách, dấu gạch nối -, nháy đơn ', và dấu câu kết thúc)
  const invalidCharsRegex = /[^a-zA-Z\s\-'\.,!?]/;
  if (invalidCharsRegex.test(text)) {
    return {
      valid: false,
      message: 'Từ tiếng Anh chứa ký tự không hợp lệ.'
    };
  }

  // 3. Kiểm tra từng từ đơn lẻ qua Datamuse API (nhanh < 250ms)
  async function checkSingleWord(w) {
    const clean = w.toLowerCase().replace(/[^a-z\-']/g, '');
    // Bỏ qua các từ đơn cực ngắn như 'a', 'I'
    if (!clean || clean.length <= 1) return { valid: true };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const res = await fetch(`https://api.datamuse.com/words?sp=${encodeURIComponent(clean)}&max=2`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) return { valid: true }; // Dự phòng nếu dịch vụ ngoài tạm gián đoạn

      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const isExact = data.some(item => item.word.toLowerCase() === clean);
        if (isExact) return { valid: true };

        return {
          valid: false,
          suggestion: data[0].word
        };
      }

      return { valid: false, suggestion: null };
    } catch {
      // Trong trường hợp offline / mất mạng, không chặn người dùng
      return { valid: true };
    }
  }

  const cleanText = text.toLowerCase().replace(/[.,!?]+$/, '').trim();

  // A. Trường hợp từ đơn (không có dấu cách)
  if (!cleanText.includes(' ')) {
    const res = await checkSingleWord(cleanText);
    if (!res.valid) {
      const suggest = res.suggestion ? ` (Gợi ý: "${res.suggestion}")` : '';
      return {
        valid: false,
        suggestion: res.suggestion,
        message: `Từ tiếng Anh "${text}" bị sai chính tả${suggest}.`
      };
    }
    return { valid: true };
  }

  // B. Trường hợp cụm từ / thành ngữ (nhiều từ)
  // Thử kiểm tra cả cụm trước (Datamuse có rất nhiều collocations như 'give up', 'well-known')
  const wholeCheck = await checkSingleWord(cleanText);
  if (wholeCheck.valid) return { valid: true };

  // Kiểm tra từng từ trong cụm từ
  const words = cleanText.split(/\s+/);
  for (const w of words) {
    const single = await checkSingleWord(w);
    if (!single.valid) {
      const suggest = single.suggestion ? ` (Gợi ý: "${single.suggestion}")` : '';
      return {
        valid: false,
        suggestion: single.suggestion,
        message: `Từ "${w}" trong cụm từ bị sai chính tả${suggest}.`
      };
    }
  }

  return { valid: true };
}
