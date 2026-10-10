/**
 * SuperMemo 2 (SM-2) Spaced Repetition Algorithm
 * 
 * Ratings / Qualities:
 * - 'again' / 1: Quên (Không nhớ từ, cần học lại)
 * - 'hard'  / 3: Khó (Nhớ nhưng mất nhiều thời gian, chu kỳ tăng chậm)
 * - 'good'  / 4: Nhớ (Nhớ bình thường, chu kỳ chuẩn)
 * - 'easy'  / 5: Dễ (Nhớ tức thì và tự tin, chu kỳ tăng vượt trội)
 */

function calculateSM2(card, rating) {
  const repetitions = Number(card?.repetitions) || 0;
  const interval = Number(card?.interval) || 0;
  const easeFactor = Number(card?.ease_factor) || 2.5;

  let quality = 4;
  if (rating === 'again' || rating === 'unmastered' || rating === 1) quality = 1;
  else if (rating === 'hard' || rating === 3) quality = 3;
  else if (rating === 'good' || rating === 'learning' || rating === 4) quality = 4;
  else if (rating === 'easy' || rating === 'mastered' || rating === 5) quality = 5;

  // 1. Calculate new Ease Factor (EF)
  // EF' = EF + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  let newEaseFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (newEaseFactor < 1.3) newEaseFactor = 1.3;
  if (newEaseFactor > 3.0) newEaseFactor = 3.0;
  newEaseFactor = Math.round(newEaseFactor * 100) / 100;

  let newRepetitions = repetitions;
  let newInterval = 1;

  if (quality < 3) {
    // Forgot / Again: reset repetitions and set interval to 1 day
    newRepetitions = 0;
    newInterval = 1;
  } else {
    // Remembered
    newRepetitions = repetitions + 1;

    // Calculate baseline Good interval first so Hard and Easy can be relative and strictly ordered
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

    if (quality === 3) {
      // Hard: interval increases more gently
      if (repetitions === 0 || interval === 0 || interval <= 1) {
        newInterval = 1;
      } else {
        newInterval = Math.max(interval, Math.round(interval * 1.2));
      }
      // Guarantee Hard is strictly less than Good when Good > 1
      if (goodInterval > 1) {
        newInterval = Math.min(newInterval, goodInterval - 1);
      }
    } else if (quality === 4) {
      // Good: standard SM-2 intervals
      newInterval = goodInterval;
    } else if (quality === 5) {
      // Easy: accelerated interval, always strictly greater than Good
      if (repetitions === 0 || interval === 0) {
        newInterval = 4;
      } else if (repetitions === 1 && interval <= 1) {
        newInterval = 7;
      } else {
        newInterval = Math.max(goodInterval + 1, Math.round(interval * newEaseFactor * 1.3));
      }
    }
  }

  // Calculate next review date
  // Standard Spaced Repetition (Anki model):
  // Schedule to start of target calendar day (00:00:00) so user can review anytime on that day
  const now = new Date();
  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);
  nextReviewDate.setHours(0, 0, 0, 0);

  // Status mapping compatible with existing stats
  let newStatus = 'learning';
  if (quality < 3) {
    newStatus = 'unmastered';
  } else if (newInterval >= 14 || (newRepetitions >= 3 && newInterval >= 7)) {
    newStatus = 'mastered';
  } else if (newRepetitions > 0) {
    newStatus = 'learning';
  }

  return {
    repetitions: newRepetitions,
    interval: newInterval,
    ease_factor: newEaseFactor,
    next_review_date: nextReviewDate,
    last_reviewed_at: now,
    status: newStatus
  };
}

function getProjectedIntervals(card) {
  return {
    again: calculateSM2(card, 'again').interval,
    hard: calculateSM2(card, 'hard').interval,
    good: calculateSM2(card, 'good').interval,
    easy: calculateSM2(card, 'easy').interval
  };
}

module.exports = {
  calculateSM2,
  getProjectedIntervals
};
