const lessonBank = [
  { prompt: "나", answer: "yo", options: ["yo", "tú", "persona", "país"], note: "나 (na) es la forma informal de decir ‘yo’." },
  { prompt: "너", answer: "tú", options: ["casa", "tú", "yo", "agua"], note: "너 (neo) significa ‘tú’ en contextos informales." },
  { prompt: "사람", answer: "persona", options: ["amor", "persona", "árbol", "idioma"], note: "사람 (saram) significa ‘persona’. Ya la habías leído antes." },
  { prompt: "물", answer: "agua", options: ["fuego", "comida", "agua", "escuela"], note: "물 (mul) significa ‘agua’." },
  { prompt: "집", answer: "casa", options: ["casa", "Corea", "libro", "nombre"], note: "집 (jip) significa ‘casa’ u ‘hogar’." },
  { prompt: "밥", answer: "arroz / comida", options: ["persona", "arroz / comida", "agua", "gracias"], note: "밥 (bap) es arroz cocido y, por extensión, una comida." },
  { prompt: "한국", answer: "Corea", options: ["Hangul", "Corea", "coreano", "escuela"], note: "한국 (Hanguk) es Corea. 한국어 es el idioma coreano." },
  { prompt: "안녕하세요", answer: "hola", options: ["adiós", "gracias", "hola", "sí"], note: "안녕하세요 (annyeonghaseyo) es el saludo cortés más común." },
  { prompt: "학교", answer: "escuela", options: ["escuela", "casa", "amigo", "trabajo"], note: "학교 (hakgyo) significa ‘escuela’." },
  { prompt: "책", answer: "libro", options: ["árbol", "nombre", "libro", "comida"], note: "책 (chaek) significa ‘libro’." },
  { prompt: "친구", answer: "amigo/a", options: ["profesor", "persona", "amigo/a", "familia"], note: "친구 (chingu) significa ‘amigo’ o ‘amiga’." },
  { prompt: "감사합니다", answer: "gracias", options: ["perdón", "hola", "gracias", "bien"], note: "감사합니다 (gamsahamnida) es una forma cortés de dar las gracias." }
];

const STORAGE_KEY = "dalbit-progress-v1";
const defaultState = { sessions: [], seen: [], correct: 0, attempts: 0 };
let saved = loadState();
let session = [];
let current = 0;
let score = 0;
let missed = [];
let startedAt = null;
let timerId = null;

const $ = (selector) => document.querySelector(selector);
const els = {
  start: $("#startButton"), secondaryStart: $("#secondaryStart"), placeholder: $("#lessonPlaceholder"),
  quiz: $("#quiz"), result: $("#result"), prompt: $("#quizPrompt"), hint: $("#quizHint"),
  type: $("#quizType"), answers: $("#answers"), feedback: $("#feedback"), feedbackTitle: $("#feedbackTitle"),
  feedbackText: $("#feedbackText"), next: $("#nextButton"), fill: $("#progressFill"),
  counter: $("#lessonCounter"), timer: $("#lessonTimer"), score: $("#resultScore"), ring: $("#resultRing"),
  resultTitle: $("#resultTitle"), resultText: $("#resultText"), retry: $("#retryButton"), close: $("#closeResult"),
  streak: $("#streakValue"), words: $("#wordValue"), accuracy: $("#accuracyValue"), bars: $("#weekBars"),
  vocabProgress: $("#vocabProgress"), today: $("#todayLabel"), resumeNote: $("#resumeNote")
};

function loadState() {
  try { return { ...defaultState, ...JSON.parse(localStorage.getItem(STORAGE_KEY)) }; }
  catch { return { ...defaultState }; }
}

function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(saved)); }
function localDate(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function streakCount() {
  const days = [...new Set(saved.sessions.map(s => s.date))].sort().reverse();
  if (!days.length) return 0;
  const cursor = new Date();
  const today = localDate(cursor);
  cursor.setDate(cursor.getDate() - (days[0] === today ? 0 : 1));
  let count = 0;
  for (const day of days) {
    if (day !== localDate(cursor)) break;
    count++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

function updateDashboard() {
  els.streak.textContent = streakCount();
  els.words.textContent = saved.seen.length;
  els.accuracy.textContent = saved.attempts ? `${Math.round(saved.correct / saved.attempts * 100)}%` : "—";
  els.vocabProgress.style.width = `${Math.min(saved.seen.length / 30 * 100, 100)}%`;
  els.bars.innerHTML = "";
  for (let offset = 6; offset >= 0; offset--) {
    const date = new Date(); date.setDate(date.getDate() - offset);
    const active = saved.sessions.some(s => s.date === localDate(date));
    const bar = document.createElement("i");
    if (active) bar.className = "done";
    els.bars.appendChild(bar);
  }
  const todayDone = saved.sessions.some(s => s.date === localDate());
  if (todayDone) {
    els.start.querySelector("span").textContent = "Practicar otra vez";
    els.resumeNote.textContent = "La sesión de hoy ya está completa. Repetir sigue sumando precisión.";
  }
}

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function begin(customQuestions) {
  session = customQuestions?.length ? [...customQuestions, ...shuffle(lessonBank.filter(x => !customQuestions.includes(x)))].slice(0, 8) : shuffle(lessonBank).slice(0, 8);
  current = 0; score = 0; missed = []; startedAt = Date.now();
  els.placeholder.hidden = true; els.result.hidden = true; els.quiz.hidden = false;
  clearInterval(timerId); timerId = setInterval(updateTimer, 1000); updateTimer();
  renderQuestion();
  document.querySelector("#sesion").scrollIntoView({ behavior: "smooth", block: "start" });
}

function updateTimer() {
  const seconds = Math.floor((Date.now() - startedAt) / 1000);
  els.timer.textContent = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function renderQuestion() {
  const item = session[current];
  els.counter.textContent = `${current + 1} / ${session.length}`;
  els.fill.style.width = `${current / session.length * 100}%`;
  els.prompt.textContent = item.prompt;
  els.hint.textContent = "¿Qué significa esta palabra?";
  els.type.textContent = current < 3 ? "RECONOCIMIENTO" : current < 6 ? "VOCABULARIO" : "CONSOLIDACIÓN";
  els.answers.innerHTML = "";
  els.feedback.hidden = true; els.feedback.className = "feedback";

  shuffle(item.options).forEach((option, index) => {
    const button = document.createElement("button");
    button.className = "answer";
    button.type = "button";
    button.innerHTML = `<span>${option}</span><b>${String.fromCharCode(65 + index)}</b>`;
    button.addEventListener("click", () => answer(option, button));
    els.answers.appendChild(button);
  });
}

function answer(choice, chosenButton) {
  const item = session[current];
  const correct = choice === item.answer;
  saved.attempts++;
  if (correct) { score++; saved.correct++; } else { missed.push(item); }
  if (!saved.seen.includes(item.prompt)) saved.seen.push(item.prompt);
  [...els.answers.children].forEach(button => {
    button.disabled = true;
    if (button.querySelector("span").textContent === item.answer) button.classList.add("correct");
  });
  if (!correct) chosenButton.classList.add("wrong");
  els.feedbackTitle.textContent = correct ? "Correcto" : "Casi";
  els.feedbackText.textContent = item.note;
  els.feedback.className = correct ? "feedback" : "feedback wrong";
  els.feedback.hidden = false;
  els.next.focus({ preventScroll: true });
  saveState(); updateDashboard();
}

function nextQuestion() {
  current++;
  if (current < session.length) renderQuestion(); else finish();
}

function finish() {
  clearInterval(timerId);
  const percentage = Math.round(score / session.length * 100);
  saved.sessions.push({ date: localDate(), score: percentage, duration: Math.floor((Date.now() - startedAt) / 1000) });
  saved.sessions = saved.sessions.slice(-60);
  saveState(); updateDashboard();
  els.quiz.hidden = true; els.result.hidden = false; els.counter.textContent = `${session.length} / ${session.length}`; els.fill.style.width = "100%";
  els.score.textContent = `${percentage}%`; els.ring.style.setProperty("--score", `${percentage * 3.6}deg`);
  els.resultTitle.textContent = percentage >= 88 ? "Excelente sesión." : percentage >= 63 ? "Buen reinicio." : "Ya hay una base.";
  els.resultText.textContent = missed.length ? `Reconociste ${score} de ${session.length}. Repetirás ${missed.length} palabra${missed.length === 1 ? "" : "s"} que todavía necesitan otra vuelta.` : "Reconociste las ocho palabras. Mañana conviene sumar una capa nueva.";
  els.retry.hidden = missed.length === 0;
}

function closeResult() {
  els.result.hidden = true; els.placeholder.hidden = false;
  document.querySelector("#inicio").scrollIntoView({ behavior: "smooth" });
}

els.start.addEventListener("click", () => begin());
els.secondaryStart.addEventListener("click", () => begin());
els.next.addEventListener("click", nextQuestion);
els.retry.addEventListener("click", () => begin(missed));
els.close.addEventListener("click", closeResult);
document.addEventListener("keydown", (event) => {
  if (!els.feedback.hidden && (event.key === "Enter" || event.key === " ")) nextQuestion();
  if (!els.quiz.hidden && els.feedback.hidden && /^[1-4a-d]$/i.test(event.key)) {
    const index = /\d/.test(event.key) ? Number(event.key) - 1 : event.key.toLowerCase().charCodeAt(0) - 97;
    els.answers.children[index]?.click();
  }
});

els.today.textContent = new Intl.DateTimeFormat("es-AR", { weekday: "short", day: "2-digit", month: "short" }).format(new Date());
updateDashboard();
