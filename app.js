import { curriculum, units } from "./curriculum.js";
import { calculateMetrics } from "./metrics.js";
import { MASTERY_LEVELS, dateKey, getWordState, reviewWord } from "./review.js";
import { buildExercise, selectSessionWords } from "./session.js";
import { importProgress, loadProgress, resetProgress, saveProgress } from "./storage.js";

const $ = (selector) => document.querySelector(selector);
const els = {
  start: $("#startButton"), secondaryStart: $("#secondaryStart"), placeholder: $("#lessonPlaceholder"),
  quiz: $("#quiz"), result: $("#result"), prompt: $("#quizPrompt"), hint: $("#quizHint"),
  romanization: $("#quizRomanization"), type: $("#quizType"), answers: $("#answers"),
  typingForm: $("#typingForm"), typingInput: $("#typingInput"), audio: $("#audioButton"),
  feedback: $("#feedback"), feedbackTitle: $("#feedbackTitle"), feedbackText: $("#feedbackText"),
  feedbackExample: $("#feedbackExample"), next: $("#nextButton"), fill: $("#progressFill"),
  counter: $("#lessonCounter"), timer: $("#lessonTimer"), score: $("#resultScore"), ring: $("#resultRing"),
  resultTitle: $("#resultTitle"), resultText: $("#resultText"), another: $("#anotherSession"), close: $("#closeResult"),
  streak: $("#streakValue"), newWords: $("#newValue"), learning: $("#learningValue"),
  mastered: $("#masteredValue"), due: $("#dueValue"), accuracy: $("#accuracyValue"),
  bars: $("#weekBars"), weekLabels: $("#weekLabels"), unitGrid: $("#unitGrid"),
  vocabGrid: $("#vocabGrid"), vocabEmpty: $("#vocabEmpty"), statusFilter: $("#statusFilter"),
  unitFilter: $("#unitFilter"), romanizationToggle: $("#romanizationToggle"), today: $("#todayLabel"),
  resumeNote: $("#resumeNote"), sessionPreview: $("#sessionPreview"), export: $("#exportButton"),
  import: $("#importInput"), reset: $("#resetButton"), toast: $("#toast")
};

const loaded = loadProgress();
let progress = loaded.progress;
let session = [];
let current = 0;
let correctCount = 0;
let answered = false;
let startedAt = null;
let timerId = null;
let showRomanization = false;
let toastTimer = null;

function showToast(message, kind = "info") {
  clearTimeout(toastTimer);
  els.toast.textContent = message;
  els.toast.dataset.kind = kind;
  els.toast.hidden = false;
  toastTimer = setTimeout(() => { els.toast.hidden = true; }, 6000);
}

function koreanVoice() {
  if (!("speechSynthesis" in window)) return null;
  return window.speechSynthesis.getVoices().find((voice) => voice.lang.toLowerCase().startsWith("ko")) || null;
}

function speakCurrent() {
  const item = session[current];
  const voice = koreanVoice();
  if (!item || !voice) {
    showToast("Este navegador no tiene una voz coreana disponible. La sesión continúa en modo visual.");
    return false;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(item.word.hangul);
  utterance.lang = "ko-KR";
  utterance.voice = voice;
  utterance.rate = 0.82;
  window.speechSynthesis.speak(utterance);
  return true;
}

function exerciseLabel(type) {
  return {
    "ko-to-es": "HANGUL → ESPAÑOL",
    "es-to-ko": "ESPAÑOL → HANGUL",
    audio: "RECONOCIMIENTO AUDITIVO",
    typing: "ESCRITURA EN HANGUL"
  }[type];
}

function deterministicOptions(options, wordId) {
  const offset = [...wordId].reduce((sum, character) => sum + character.charCodeAt(0), 0) % options.length;
  return [...options.slice(offset), ...options.slice(0, offset)];
}

function updateDashboard() {
  const metrics = calculateMetrics(progress, curriculum);
  els.newWords.textContent = metrics.newWords;
  els.learning.textContent = metrics.learning;
  els.mastered.textContent = metrics.mastered;
  els.due.textContent = metrics.due;
  els.accuracy.textContent = metrics.recentAccuracy === null ? "—" : `${metrics.recentAccuracy}%`;
  els.streak.textContent = metrics.streak;

  els.weekLabels.innerHTML = "";
  els.bars.innerHTML = "";
  for (let offset = 6; offset >= 0; offset -= 1) {
    const day = new Date();
    day.setDate(day.getDate() - offset);
    const key = dateKey(day);
    const count = progress.sessions.filter((item) => item.date === key).length;
    const label = document.createElement("span");
    label.textContent = new Intl.DateTimeFormat("es", { weekday: "narrow" }).format(day);
    const bar = document.createElement("i");
    bar.className = count ? "done" : "";
    bar.style.setProperty("--activity", String(Math.min(1, 0.45 + count * 0.2)));
    bar.title = `${key}: ${count} sesión${count === 1 ? "" : "es"}`;
    els.weekLabels.appendChild(label);
    els.bars.appendChild(bar);
  }

  const todayDone = progress.sessions.some((item) => item.date === dateKey());
  els.start.querySelector("span").textContent = todayDone ? "Continuar practicando" : "Empezar sesión";
  els.resumeNote.textContent = metrics.due
    ? `${metrics.due} palabra${metrics.due === 1 ? "" : "s"} pendiente${metrics.due === 1 ? "" : "s"} de repaso hoy.`
    : todayDone ? "La sesión diaria está completa. Podés consolidar un poco más." : "No hay deuda de repaso: hoy vas a sumar una base nueva.";

  renderUnits(metrics.unitProgress);
  renderVocabulary();
  updateSessionPreview();
}

function renderUnits(unitProgress) {
  els.unitGrid.innerHTML = "";
  for (const unit of units) {
    const stats = unitProgress[unit.id];
    const percentage = Math.round((stats.seen / stats.total) * 100);
    const article = document.createElement("article");
    article.className = "unit-card";
    article.innerHTML = `<div class="unit-card-head"><span>UNIDAD ${String(unit.id).padStart(2, "0")}</span><strong>${percentage}%</strong></div><h3>${unit.title}</h3><p>${unit.description}</p><div class="unit-stats"><span>${stats.seen}/${stats.total} vistas</span><span>${stats.mastered} dominadas</span></div><div class="path-progress"><span style="width:${percentage}%"></span></div>`;
    els.unitGrid.appendChild(article);
  }
}

function matchesStatus(state, filter) {
  if (filter === "all") return true;
  if (filter === "seen") return state.exposures > 0;
  if (filter === "new") return state.exposures === 0;
  if (filter === "mastered") return state.level === 5;
  return state.exposures > 0 && state.level < 5;
}

function renderVocabulary() {
  const status = els.statusFilter.value;
  const unit = els.unitFilter.value;
  const visible = curriculum.filter((word) => {
    const state = getWordState(progress, word.id);
    return matchesStatus(state, status) && (unit === "all" || word.unit === Number(unit));
  });
  els.vocabGrid.innerHTML = "";
  els.vocabEmpty.hidden = visible.length > 0;
  for (const word of visible) {
    const state = getWordState(progress, word.id);
    const card = document.createElement("article");
    card.className = "vocab-card";
    card.innerHTML = `<div><strong lang="ko">${word.hangul}</strong><span class="vocab-romanization" ${showRomanization ? "" : "hidden"}>${word.romanization}</span></div><p>${word.meaning}</p><span class="level-tag">${MASTERY_LEVELS[state.level]} · nivel ${state.level}</span>`;
    els.vocabGrid.appendChild(card);
  }
}

function updateSessionPreview() {
  const preview = selectSessionWords(curriculum, progress);
  const reviews = preview.filter((item) => item.state.exposures > 0).length;
  const newCount = preview.length - reviews;
  els.sessionPreview.textContent = `${reviews} repaso${reviews === 1 ? "" : "s"} y ${newCount} palabra${newCount === 1 ? "" : "s"} nueva${newCount === 1 ? "" : "s"}, sin duplicados.`;
}

function updateTimer() {
  const seconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
  els.timer.textContent = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function begin() {
  session = selectSessionWords(curriculum, progress).map((item) => ({ ...item, exercise: buildExercise(item, curriculum) }));
  current = 0;
  correctCount = 0;
  answered = false;
  startedAt = Date.now();
  els.placeholder.hidden = true;
  els.result.hidden = true;
  els.quiz.hidden = false;
  clearInterval(timerId);
  timerId = setInterval(updateTimer, 1000);
  updateTimer();
  renderQuestion();
  $("#sesion").scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderQuestion() {
  answered = false;
  const item = session[current];
  let exercise = item.exercise;
  if (exercise.type === "audio" && !koreanVoice()) exercise = buildExercise({ ...item, type: "ko-to-es" }, curriculum);
  item.activeExercise = exercise;

  els.counter.textContent = `${current + 1} / ${session.length}`;
  els.fill.style.width = `${(current / session.length) * 100}%`;
  els.type.textContent = exerciseLabel(exercise.type);
  els.answers.innerHTML = "";
  els.feedback.hidden = true;
  els.feedback.className = "feedback";
  els.typingForm.hidden = exercise.type !== "typing";
  els.answers.hidden = exercise.type === "typing";
  els.audio.hidden = exercise.type !== "audio";
  els.romanization.hidden = true;
  els.romanization.textContent = item.word.romanization;

  if (exercise.type === "audio") {
    els.prompt.textContent = "듣기";
    els.hint.textContent = "Escuchá y elegí el significado.";
    setTimeout(speakCurrent, 180);
  } else if (exercise.type === "typing") {
    els.prompt.textContent = exercise.prompt;
    els.hint.textContent = "Usá el teclado coreano; la escritura aparece después de varias exposiciones.";
    els.typingInput.value = "";
    setTimeout(() => els.typingInput.focus(), 0);
  } else {
    els.prompt.textContent = exercise.prompt;
    els.hint.textContent = exercise.type === "ko-to-es" ? "¿Qué significa esta palabra?" : "¿Cómo se escribe en Hangul?";
  }

  if (exercise.type !== "typing") {
    deterministicOptions(exercise.options, item.word.id).forEach((option, index) => {
      const button = document.createElement("button");
      button.className = "answer";
      button.type = "button";
      button.innerHTML = `<span>${option}</span><b>${String.fromCharCode(65 + index)}</b>`;
      button.addEventListener("click", () => submitAnswer(option, button));
      els.answers.appendChild(button);
    });
  }
}

function submitAnswer(choice, chosenButton = null) {
  if (answered) return;
  answered = true;
  const item = session[current];
  const exercise = item.activeExercise;
  const normalizedChoice = String(choice).trim().normalize("NFC");
  const correct = normalizedChoice === exercise.answer.normalize("NFC");
  if (correct) correctCount += 1;

  progress.words[item.word.id] = reviewWord(getWordState(progress, item.word.id), correct);
  progress.stats.attempts += 1;
  if (correct) progress.stats.correct += 1;
  progress = saveProgress(progress);

  [...els.answers.children].forEach((button) => {
    button.disabled = true;
    if (button.querySelector("span").textContent === exercise.answer) button.classList.add("correct");
  });
  if (!correct && chosenButton) chosenButton.classList.add("wrong");
  els.typingInput.disabled = true;
  els.typingForm.querySelector("button").disabled = true;

  els.feedbackTitle.textContent = correct ? "Correcto" : "Todavía no";
  els.feedbackText.textContent = correct
    ? `${item.word.hangul} significa “${item.word.meaning}”.`
    : `La respuesta correcta es ${exercise.answer}. ${item.word.hangul} significa “${item.word.meaning}”.`;
  els.feedbackExample.textContent = item.word.example ? `${item.word.example.ko} · ${item.word.example.es}` : "";
  els.feedbackExample.hidden = !item.word.example;
  els.romanization.hidden = !showRomanization;
  els.feedback.className = correct ? "feedback" : "feedback wrong";
  els.feedback.hidden = false;
  els.next.focus({ preventScroll: true });
  updateDashboard();
}

function nextQuestion() {
  if (!answered) return;
  current += 1;
  els.typingInput.disabled = false;
  els.typingForm.querySelector("button").disabled = false;
  if (current < session.length) renderQuestion(); else finish();
}

function finish() {
  clearInterval(timerId);
  const attempts = session.length;
  const percentage = Math.round((correctCount / attempts) * 100);
  progress.sessions.push({
    date: dateKey(), correct: correctCount, attempts, score: percentage,
    duration: Math.max(1, Math.floor((Date.now() - startedAt) / 1000))
  });
  progress.sessions = progress.sessions.slice(-180);
  progress = saveProgress(progress);
  updateDashboard();

  els.quiz.hidden = true;
  els.result.hidden = false;
  els.counter.textContent = `${attempts} / ${attempts}`;
  els.fill.style.width = "100%";
  els.score.textContent = `${percentage}%`;
  els.ring.style.setProperty("--score", `${percentage * 3.6}deg`);
  els.resultTitle.textContent = percentage >= 88 ? "Excelente consolidación." : percentage >= 63 ? "Buen avance." : "La base ya está trabajando.";
  els.resultText.textContent = `Acertaste ${correctCount} de ${attempts}. Los errores ya quedaron adelantados para el próximo repaso.`;
}

function closeResult() {
  els.result.hidden = true;
  els.placeholder.hidden = false;
  $("#inicio").scrollIntoView({ behavior: "smooth" });
}

function exportData() {
  const blob = new Blob([JSON.stringify(progress, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `dalbit-progreso-${dateKey()}.json`;
  link.click();
  URL.revokeObjectURL(url);
  showToast("Copia de progreso exportada.");
}

async function handleImport(event) {
  const [file] = event.target.files;
  if (!file) return;
  try {
    const raw = await file.text();
    if (!window.confirm("La importación reemplazará el progreso actual. ¿Querés continuar?")) return;
    progress = importProgress(raw);
    updateDashboard();
    showToast("Progreso importado correctamente.");
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    event.target.value = "";
  }
}

function handleReset() {
  const confirmation = window.prompt("Para borrar todo el progreso, escribí REINICIAR.");
  if (confirmation !== "REINICIAR") {
    if (confirmation !== null) showToast("No se reinició el progreso: la confirmación no coincide.");
    return;
  }
  progress = resetProgress();
  updateDashboard();
  showToast("El progreso se reinició.");
}

els.start.addEventListener("click", begin);
els.secondaryStart.addEventListener("click", begin);
els.another.addEventListener("click", begin);
els.next.addEventListener("click", nextQuestion);
els.close.addEventListener("click", closeResult);
els.audio.addEventListener("click", speakCurrent);
els.typingForm.addEventListener("submit", (event) => { event.preventDefault(); submitAnswer(els.typingInput.value); });
els.statusFilter.addEventListener("change", renderVocabulary);
els.unitFilter.addEventListener("change", renderVocabulary);
els.romanizationToggle.addEventListener("click", () => {
  showRomanization = !showRomanization;
  els.romanizationToggle.setAttribute("aria-pressed", String(showRomanization));
  els.romanizationToggle.textContent = showRomanization ? "Ocultar romanización" : "Mostrar romanización";
  renderVocabulary();
});
els.export.addEventListener("click", exportData);
els.import.addEventListener("change", handleImport);
els.reset.addEventListener("click", handleReset);

document.addEventListener("keydown", (event) => {
  if (!els.feedback.hidden && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault();
    nextQuestion();
  }
  if (!els.quiz.hidden && els.feedback.hidden && !els.answers.hidden && /^[1-4a-d]$/i.test(event.key)) {
    const index = /\d/.test(event.key) ? Number(event.key) - 1 : event.key.toLowerCase().charCodeAt(0) - 97;
    els.answers.children[index]?.click();
  }
});

for (const unit of units) {
  const option = document.createElement("option");
  option.value = unit.id;
  option.textContent = `${unit.id}. ${unit.title}`;
  els.unitFilter.appendChild(option);
}

els.today.textContent = new Intl.DateTimeFormat("es", { weekday: "short", day: "2-digit", month: "short" }).format(new Date());
updateDashboard();
if (loaded.notice) showToast(loaded.notice);
