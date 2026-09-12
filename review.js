export const MASTERY_LEVELS = ["nueva", "inicial", "aprendiendo", "familiar", "consolidada", "dominada"];
export const REVIEW_INTERVAL_DAYS = [0, 1, 3, 7, 14, 30];

export function dateKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDays(value, days) {
  const date = new Date(value);
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return dateKey(date);
}

export function newWordState() {
  return {
    level: 0,
    nextReview: null,
    correct: 0,
    errors: 0,
    lapses: 0,
    exposures: 0,
    recentFailures: 0,
    lastReviewed: null
  };
}

export function getWordState(progress, wordId) {
  return { ...newWordState(), ...(progress.words[wordId] || {}) };
}

export function isDue(wordState, today = dateKey()) {
  return Boolean(wordState.nextReview && wordState.nextReview <= today);
}

export function reviewWord(wordState, correct, now = new Date()) {
  const state = { ...newWordState(), ...wordState };
  state.exposures += 1;
  state.lastReviewed = new Date(now).toISOString();

  if (correct) {
    state.correct += 1;
    state.level = Math.min(5, state.level + 1);
    state.recentFailures = Math.max(0, state.recentFailures - 1);
    state.nextReview = addDays(now, REVIEW_INTERVAL_DAYS[state.level]);
  } else {
    state.errors += 1;
    state.lapses += state.level >= 2 ? 1 : 0;
    state.level = Math.max(0, state.level - 1);
    state.recentFailures = Math.min(5, state.recentFailures + 1);
    state.nextReview = dateKey(now);
  }

  return state;
}

export function canType(wordState) {
  return wordState.exposures >= 3 && wordState.level >= 1;
}

