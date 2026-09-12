import { curriculum } from "./curriculum.js";
import { newWordState } from "./review.js";

export const STORAGE_KEY = "dalbit-progress-v2";
export const LEGACY_KEY = "dalbit-progress-v1";
export const SCHEMA_VERSION = 2;

export function createProgress(now = new Date()) {
  return {
    version: SCHEMA_VERSION,
    words: {},
    sessions: [],
    stats: { correct: 0, attempts: 0 },
    createdAt: new Date(now).toISOString(),
    updatedAt: new Date(now).toISOString()
  };
}

function safeParse(raw) {
  try { return { value: JSON.parse(raw), error: null }; }
  catch (error) { return { value: null, error }; }
}

export function migrateV1(legacy, now = new Date()) {
  const progress = createProgress(now);
  const seen = new Set(Array.isArray(legacy?.seen) ? legacy.seen : []);
  for (const word of curriculum) {
    if (!seen.has(word.hangul)) continue;
    progress.words[word.id] = {
      ...newWordState(), level: 1, exposures: 1, nextReview: new Date(now).toISOString().slice(0, 10)
    };
  }
  progress.sessions = Array.isArray(legacy?.sessions)
    ? legacy.sessions.map((session) => ({ ...session, attempts: 8, correct: Math.round((session.score || 0) * 0.08) }))
    : [];
  progress.stats = {
    correct: Number.isFinite(legacy?.correct) ? legacy.correct : 0,
    attempts: Number.isFinite(legacy?.attempts) ? legacy.attempts : 0
  };
  progress.migratedFrom = LEGACY_KEY;
  return progress;
}

export function validateProgress(value) {
  if (!value || value.version !== SCHEMA_VERSION || !value.words || typeof value.words !== "object" || Array.isArray(value.words) || !Array.isArray(value.sessions)) {
    throw new Error("El archivo no contiene un progreso de Dalbit compatible.");
  }
  return {
    ...value,
    stats: {
      correct: Number.isFinite(value.stats?.correct) ? value.stats.correct : 0,
      attempts: Number.isFinite(value.stats?.attempts) ? value.stats.attempts : 0
    }
  };
}

export function loadProgress(storage = localStorage, now = new Date()) {
  const raw = storage.getItem(STORAGE_KEY);
  if (raw) {
    const parsed = safeParse(raw);
    if (parsed.value) {
      try { return { progress: validateProgress(parsed.value), notice: null }; }
      catch { /* Preserve the incompatible payload below. */ }
    }
    const backupKey = `${STORAGE_KEY}-corrupt-${Date.now()}`;
    storage.setItem(backupKey, raw);
    return { progress: createProgress(now), notice: `No se pudo leer el progreso. Se conservó una copia en ${backupKey}.` };
  }

  const legacyRaw = storage.getItem(LEGACY_KEY);
  if (legacyRaw) {
    const parsed = safeParse(legacyRaw);
    if (parsed.value) {
      const progress = migrateV1(parsed.value, now);
      storage.setItem(STORAGE_KEY, JSON.stringify(progress));
      return { progress, notice: "Tu progreso anterior se migró al nuevo motor de aprendizaje." };
    }
    const backupKey = `${LEGACY_KEY}-corrupt-${Date.now()}`;
    storage.setItem(backupKey, legacyRaw);
    return { progress: createProgress(now), notice: `El progreso anterior estaba dañado. Se conservó en ${backupKey}.` };
  }

  return { progress: createProgress(now), notice: null };
}

export function saveProgress(progress, storage = localStorage, now = new Date()) {
  const next = { ...progress, version: SCHEMA_VERSION, updatedAt: new Date(now).toISOString() };
  storage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function importProgress(raw, storage = localStorage, now = new Date()) {
  const parsed = safeParse(raw);
  if (!parsed.value) throw new Error("El archivo JSON no se pudo leer.");
  const progress = validateProgress(parsed.value);
  return saveProgress(progress, storage, now);
}

export function resetProgress(storage = localStorage, now = new Date()) {
  const fresh = createProgress(now);
  storage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  return fresh;
}
