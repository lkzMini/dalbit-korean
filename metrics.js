import { dateKey, getWordState, isDue } from "./review.js";

export function calculateStreak(sessions, now = new Date()) {
  const days = [...new Set(sessions.map((session) => session.date))].sort().reverse();
  if (!days.length) return 0;
  const cursor = new Date(now);
  cursor.setHours(12, 0, 0, 0);
  const today = dateKey(cursor);
  cursor.setDate(cursor.getDate() - (days[0] === today ? 0 : 1));
  let count = 0;
  for (const day of days) {
    if (day !== dateKey(cursor)) break;
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

export function calculateMetrics(progress, curriculum, now = new Date()) {
  const states = curriculum.map((word) => getWordState(progress, word.id));
  const recentSessions = progress.sessions.slice(-7);
  const recentAttempts = recentSessions.reduce((sum, session) => sum + (session.attempts || 0), 0);
  const recentCorrect = recentSessions.reduce((sum, session) => sum + (session.correct || 0), 0);
  return {
    newWords: states.filter((state) => state.exposures === 0).length,
    learning: states.filter((state) => state.exposures > 0 && state.level < 5).length,
    mastered: states.filter((state) => state.level === 5).length,
    due: states.filter((state) => isDue(state, dateKey(now))).length,
    recentAccuracy: recentAttempts ? Math.round((recentCorrect / recentAttempts) * 100) : null,
    streak: calculateStreak(progress.sessions, now),
    unitProgress: curriculum.reduce((result, word) => {
      const unit = result[word.unit] || { seen: 0, mastered: 0, total: 0 };
      const state = getWordState(progress, word.id);
      unit.total += 1;
      if (state.exposures > 0) unit.seen += 1;
      if (state.level === 5) unit.mastered += 1;
      result[word.unit] = unit;
      return result;
    }, {})
  };
}
