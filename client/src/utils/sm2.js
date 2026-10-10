/**
 * SuperMemo 2 (SM-2) Spaced Repetition Utility for Frontend
 */

export function calculateSM2Preview(card, rating) {
  const repetitions = Number(card?.repetitions) || 0;
  const interval = Number(card?.interval) || 0;
  const easeFactor = Number(card?.ease_factor) || 2.5;

  let quality = 4;
  if (rating === 'again' || rating === 'unmastered' || rating === 1) quality = 1;
  else if (rating === 'hard' || rating === 3) quality = 3;
  else if (rating === 'good' || rating === 'learning' || rating === 4) quality = 4;
  else if (rating === 'easy' || rating === 'mastered' || rating === 5) quality = 5;

  if (quality < 3) return 1;

  const goodEf = Math.max(1.3, Math.min(3.0, easeFactor));
  let goodInterval;
  if (repetitions === 0 || interval === 0) {
    goodInterval = 1;
  } else if (repetitions === 1) {
    if (interval <= 1) {
      goodInterval = 3;
    } else {
      goodInterval = Math.max(interval + 1, Math.round(interval * goodEf));
    }
  } else {
    goodInterval = Math.max(interval + 1, Math.round(interval * goodEf));
  }

  if (quality === 4) return goodInterval;

  if (quality === 3) {
    let hardInterval;
    if (repetitions === 0 || interval === 0 || interval <= 1) {
      hardInterval = 1;
    } else {
      hardInterval = Math.max(interval, Math.round(interval * 1.2));
    }
    if (goodInterval > 1) {
      hardInterval = Math.min(hardInterval, goodInterval - 1);
    }
    return hardInterval;
  }

  if (quality === 5) {
    const easyEf = Math.max(1.3, Math.min(3.0, Math.round((easeFactor + 0.1) * 100) / 100));
    if (repetitions === 0 || interval === 0) {
      return 4;
    }
    if (repetitions === 1 && interval <= 1) {
      return 7;
    }
    return Math.max(goodInterval + 1, Math.round(interval * easyEf * 1.3));
  }

  return 1;
}

export function formatInterval(days) {
  const d = Math.round(days || 0);
  if (d <= 1) return '1 ngày';
  if (d < 7) return `${d} ngày`;
  if (d === 7) return '1 tuần';
  if (d < 14) return `${d} ngày`;
  if (d === 14) return '2 tuần';
  if (d < 30) return `${d} ngày`;
  if (d === 30) return '1 tháng';
  if (d < 60) return `${Math.round(d / 30)} tháng`;
  return `${d} ngày`;
}

export function isCardDue(card) {
  // Thẻ mới chưa từng được đánh giá 1, 2, 3, 4 lần nào thì chưa vào chu kỳ ôn tập
  if (!card || !card.last_reviewed_at || !card.next_review_date) return false;
  const reviewDate = new Date(card.next_review_date);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  return reviewDate <= endOfToday;
}

export function formatReviewDueDate(dateString) {
  if (!dateString) return 'Chưa học';
  const date = new Date(dateString);
  const now = new Date();
  
  // Set to midnight for day comparison
  const dZero = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const nowZero = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((dZero - nowZero) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'Quá hạn ôn';
  if (diffDays === 0) return 'Hôm nay';
  if (diffDays === 1) return 'Ngày mai';
  if (diffDays < 7) return `${diffDays} ngày nữa`;
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}`;
}
