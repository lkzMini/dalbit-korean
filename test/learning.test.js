import test from "node:test";
import assert from "node:assert/strict";

import { curriculum } from "../curriculum.js";
import { calculateMetrics, calculateStreak } from "../metrics.js";
import { dateKey, newWordState, reviewWord } from "../review.js";
import { selectSessionWords } from "../session.js";
import { LEGACY_KEY, STORAGE_KEY, importProgress, loadProgress } from "../storage.js";

const now = new Date("2026-09-12T15:00:00.000Z");

function progress(words = {}) {
  return {
    version: 2,
    words,
    sessions: [],
    stats: { correct: 0, attempts: 0 },
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  };
}

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    values
  };
}

test("el currículo contiene seis unidades de diez palabras", () => {
  assert.equal(curriculum.length, 60);
  for (let unit = 1; unit <= 6; unit += 1) {
    assert.equal(curriculum.filter((word) => word.unit === unit).length, 10);
  }
  assert.ok(curriculum.every((word) => word.hangul && word.meaning && word.romanization));
});

test("prioriza palabras vencidas", () => {
  const words = {
    "u1-01": { ...newWordState(), level: 2, exposures: 2, nextReview: "2026-09-11" },
    "u1-02": { ...newWordState(), level: 2, exposures: 2, nextReview: "2026-09-20" }
  };
  const selected = selectSessionWords(curriculum, progress(words), { size: 3, newLimit: 1, today: "2026-09-12" });
  assert.equal(selected[0].word.id, "u1-01");
});

test("incorpora como máximo la cantidad indicada de palabras nuevas cuando hay repasos suficientes", () => {
  const words = Object.fromEntries(curriculum.slice(0, 8).map((word) => [word.id, {
    ...newWordState(), level: 2, exposures: 2, nextReview: "2026-09-12"
  }]));
  const selected = selectSessionWords(curriculum, progress(words), { size: 8, newLimit: 2, today: "2026-09-12" });
  assert.equal(selected.filter((item) => item.state.level === 0).length, 0);

  const onlySixReviews = progress(Object.fromEntries(Object.entries(words).slice(0, 6)));
  const mixed = selectSessionWords(curriculum, onlySixReviews, { size: 8, newLimit: 2, today: "2026-09-12" });
  assert.equal(mixed.filter((item) => item.state.level === 0).length, 2);

  const firstSession = selectSessionWords(curriculum, progress(), { size: 8, newLimit: 2, today: "2026-09-12" });
  assert.equal(firstSession.length, 2);
  assert.equal(firstSession.filter((item) => item.state.level === 0).length, 2);
});

test("una respuesta correcta eleva dominio y programa el próximo repaso", () => {
  const updated = reviewWord({ ...newWordState(), level: 1, exposures: 1 }, true, now);
  assert.equal(updated.level, 2);
  assert.equal(updated.correct, 1);
  assert.equal(updated.nextReview, "2026-09-15");
});

test("un error adelanta el repaso, baja dominio y registra lapso", () => {
  const updated = reviewWord({ ...newWordState(), level: 3, exposures: 4 }, false, now);
  assert.equal(updated.level, 2);
  assert.equal(updated.nextReview, dateKey(now));
  assert.equal(updated.errors, 1);
  assert.equal(updated.lapses, 1);
  assert.equal(updated.recentFailures, 1);
});

test("la sesión nunca contiene palabras duplicadas", () => {
  const selected = selectSessionWords(curriculum, progress(), { size: 8, newLimit: 2, today: "2026-09-12" });
  assert.equal(new Set(selected.map((item) => item.word.id)).size, selected.length);
});

test("una palabra fallada en su primera exposición tiene prioridad sobre palabras nuevas", () => {
  const failed = reviewWord(newWordState(), false, now);
  const selected = selectSessionWords(curriculum, progress({ "u4-10": failed }), { size: 3, newLimit: 2, today: "2026-09-12" });
  assert.equal(selected[0].word.id, "u4-10");
  assert.equal(selected.filter((item) => item.state.exposures === 0).length, 2);
});

test("migra dalbit-progress-v1 sin perder totales ni sesiones", () => {
  const legacy = { seen: ["나", "책"], correct: 11, attempts: 16, sessions: [{ date: "2026-09-11", score: 75, duration: 90 }] };
  const storage = memoryStorage({ [LEGACY_KEY]: JSON.stringify(legacy) });
  const result = loadProgress(storage, now);
  assert.equal(result.progress.version, 2);
  assert.equal(result.progress.words["u1-01"].exposures, 1);
  assert.equal(result.progress.words["u2-02"].level, 1);
  assert.deepEqual(result.progress.stats, { correct: 11, attempts: 16 });
  assert.equal(result.progress.sessions.length, 1);
  assert.ok(storage.getItem(STORAGE_KEY));
});

test("conserva una copia si el almacenamiento está dañado", () => {
  const storage = memoryStorage({ [STORAGE_KEY]: "{mal json" });
  const result = loadProgress(storage, now);
  assert.match(result.notice, /conservó una copia/);
  assert.ok([...storage.values.keys()].some((key) => key.startsWith(`${STORAGE_KEY}-corrupt-`)));
});

test("rechaza importaciones con esquema incompatible", () => {
  assert.throws(() => importProgress(JSON.stringify({ version: 1 }), memoryStorage(), now), /compatible/);
});

test("calcula racha permitiendo que la última actividad sea ayer", () => {
  const sessions = [{ date: "2026-09-09" }, { date: "2026-09-10" }, { date: "2026-09-11" }];
  assert.equal(calculateStreak(sessions, now), 3);
});

test("calcula métricas recientes y progreso por unidad", () => {
  const state = progress({
    "u1-01": { ...newWordState(), level: 5, exposures: 6, nextReview: "2026-09-12" },
    "u1-02": { ...newWordState(), level: 2, exposures: 2, nextReview: "2026-09-20" }
  });
  state.sessions = [{ date: "2026-09-12", attempts: 8, correct: 6 }];
  const metrics = calculateMetrics(state, curriculum, now);
  assert.equal(metrics.mastered, 1);
  assert.equal(metrics.learning, 1);
  assert.equal(metrics.newWords, 58);
  assert.equal(metrics.due, 1);
  assert.equal(metrics.recentAccuracy, 75);
  assert.deepEqual(metrics.unitProgress[1], { seen: 2, mastered: 1, total: 10 });
});
