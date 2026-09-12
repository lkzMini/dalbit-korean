import { canType, dateKey, getWordState, isDue } from "./review.js";

function byPriority(a, b) {
  return a.priority - b.priority || a.order - b.order || a.word.id.localeCompare(b.word.id);
}

export function selectSessionWords(curriculum, progress, options = {}) {
  const size = options.size ?? 8;
  const newLimit = options.newLimit ?? 2;
  const today = options.today ?? dateKey();
  const ranked = curriculum.map((word, order) => {
    const state = getWordState(progress, word.id);
    let priority = 5;
    if (isDue(state, today)) priority = 0;
    else if (state.recentFailures > 0) priority = 1;
    else if (state.level > 0 && state.level < 5) priority = 2;
    else if (state.level === 5) priority = 4;
    return { word, state, priority, order };
  });

  const selected = [];
  const selectedIds = new Set();
  const add = (candidate) => {
    if (!candidate || selectedIds.has(candidate.word.id) || selected.length >= size) return;
    selected.push(candidate);
    selectedIds.add(candidate.word.id);
  };

  ranked.filter((item) => item.priority < 4 && item.state.exposures > 0).sort(byPriority).forEach(add);
  ranked.filter((item) => item.state.exposures === 0).slice(0, newLimit).forEach(add);
  ranked.filter((item) => item.state.exposures > 0).sort(byPriority).forEach(add);

  return selected.slice(0, size).map(({ word, state }, index) => ({
    word,
    state,
    type: chooseExerciseType(state, index)
  }));
}

export function chooseExerciseType(state, index = 0) {
  if (canType(state)) return index % 3 === 0 ? "typing" : index % 2 === 0 ? "audio" : "es-to-ko";
  if (state.exposures >= 1) return index % 3 === 2 ? "audio" : index % 2 === 0 ? "ko-to-es" : "es-to-ko";
  return "ko-to-es";
}

export function distractorsFor(word, curriculum, direction = "meaning", count = 3) {
  const field = direction === "hangul" ? "hangul" : "meaning";
  const sameUnit = curriculum.filter((candidate) => candidate.id !== word.id && candidate.unit === word.unit);
  const others = curriculum.filter((candidate) => candidate.id !== word.id && candidate.unit !== word.unit);
  return [...sameUnit, ...others].slice(0, count).map((candidate) => candidate[field]);
}

export function buildExercise(item, curriculum) {
  const { word, type } = item;
  if (type === "typing") {
    return { type, prompt: word.meaning, answer: word.hangul, options: [] };
  }
  if (type === "es-to-ko") {
    return {
      type,
      prompt: word.meaning,
      answer: word.hangul,
      options: [word.hangul, ...distractorsFor(word, curriculum, "hangul")]
    };
  }
  return {
    type,
    prompt: word.hangul,
    answer: word.meaning,
    options: [word.meaning, ...distractorsFor(word, curriculum, "meaning")]
  };
}
