const db = firebase.firestore();

const name = localStorage.getItem("reading_name");
const klass = localStorage.getItem("reading_class");
if (!name || !klass) {
  window.location.href = "index.html";
}

const elevId = `${klass}_${name.trim().toLowerCase().replace(/\s+/g, "_")}`;

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

let levels = [];
let ordjaktData = { unlockedLevel: 1, levelStats: {} };

let currentLevel = null;
let shuffledWords = [];
let batches = [];
let batchIndex = 0;
/** @type {("pending"|"done"|"skip")[]} */
let wordStates = [];
let timerMs = 0;
let timerRunning = true;
let timerPaused = false;
let timerInterval = null;
let recognition = null;
let recognitionActive = false;

const levelScreen = document.getElementById("levelScreen");
const gameScreen = document.getElementById("gameScreen");
const resultScreen = document.getElementById("resultScreen");
const bannerMeta = document.getElementById("bannerMeta");
const wordGrid = document.getElementById("wordGrid");
const micStatus = document.getElementById("micStatus");
const batchNum = document.getElementById("batchNum");
const targetTimeLabel = document.getElementById("targetTimeLabel");
const timerDisplay = document.getElementById("timerDisplay");
const timerToggleBtn = document.getElementById("timerToggleBtn");
const nextBatchBtn = document.getElementById("nextBatchBtn");
const gameTitle = document.getElementById("gameTitle");

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalize(s) {
  return String(s || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function transcriptMatches(transcript, target) {
  const nw = normalize(target);
  if (!nw) return false;
  const nt = normalize(transcript);
  if (nt === nw) return true;
  const tokens = nt.split(/[.,!?;:()\s]+/).filter(Boolean);
  if (tokens.some((t) => t === nw)) return true;
  if (nw.length <= 2) {
    return tokens.some((t) => t === nw);
  }
  try {
    const re = new RegExp("\\b" + escapeRegExp(nw) + "\\b");
    if (re.test(nt)) return true;
    const reDef = new RegExp("\\b" + escapeRegExp(nw) + "(et|en|a|n|t|s|na|ns)?\\b");
    if (reDef.test(nt)) return true;
  } catch (_) {
    /* ignore */
  }
  return false;
}

function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function formatTime(sec) {
  const s = Math.floor(sec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

function loadLevels(cb) {
  if (window.ordjaktLevels && window.ordjaktLevels.length > 0) {
    levels = window.ordjaktLevels.slice();
    cb();
    return;
  }
  const base = window.location.href.replace(/\/[^/]*$/, "/");
  const script = document.createElement("script");
  script.src = base + "texts/ordjakt-levels.js?v=1";
  script.onload = () => {
    levels = (window.ordjaktLevels || []).slice();
    cb();
  };
  script.onerror = () => alert("Kunde inte ladda ordlistan.");
  document.body.appendChild(script);
}

async function loadFirebaseOrdjakt() {
  const ref = db.collection("readingResults").doc(elevId);
  const snap = await ref.get();
  if (snap.exists) {
    const d = snap.data();
    if (d.ordjakt && typeof d.ordjakt === "object") {
      ordjaktData = {
        unlockedLevel: Math.max(1, Number(d.ordjakt.unlockedLevel) || 1),
        levelStats: d.ordjakt.levelStats && typeof d.ordjakt.levelStats === "object" ? d.ordjakt.levelStats : {},
      };
    }
  }
}

async function saveOrdjaktResult(levelId, passed, timeSeconds) {
  const ref = db.collection("readingResults").doc(elevId);
  const snap = await ref.get();
  const data = snap.exists ? snap.data() : { namn: name, klass: klass };
  const ordjakt = data.ordjakt && typeof data.ordjakt === "object"
    ? { ...data.ordjakt, levelStats: { ...(data.ordjakt.levelStats || {}) } }
    : { unlockedLevel: 1, levelStats: {} };

  const key = String(levelId);
  const prev = ordjakt.levelStats[key] || {};
  const attempts = (Number(prev.attempts) || 0) + 1;
  let bestTimeSeconds = prev.bestTimeSeconds != null ? Number(prev.bestTimeSeconds) : null;
  if (passed) {
    if (bestTimeSeconds == null || timeSeconds < bestTimeSeconds) bestTimeSeconds = timeSeconds;
  }

  ordjakt.levelStats[key] = {
    ...prev,
    attempts,
    passed: Boolean(prev.passed) || passed,
    bestTimeSeconds: bestTimeSeconds != null ? bestTimeSeconds : prev.bestTimeSeconds,
    lastPlayedAt: new Date().toISOString(),
  };

  let unlocked = Math.max(1, Number(ordjakt.unlockedLevel) || 1);
  if (passed) unlocked = Math.max(unlocked, levelId + 1);
  ordjakt.unlockedLevel = unlocked;

  await ref.set(
    { ...data, ordjakt, senaste: new Date().toISOString() },
    { merge: true }
  );
  ordjaktData = ordjakt;
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function startTimerLoop() {
  stopTimer();
  timerInterval = setInterval(() => {
    if (timerRunning && !timerPaused) timerMs += 100;
    timerDisplay.textContent = formatTime(timerMs / 1000);
  }, 100);
}

function stopRecognition() {
  if (recognition && recognitionActive) {
    try {
      recognition.stop();
    } catch (_) {
      /* ignore */
    }
  }
  recognitionActive = false;
}

function setupRecognition() {
  if (!SpeechRecognition) {
    micStatus.textContent = "Röstigenkänning stöds inte i den här webbläsaren. Använd Chrome eller Edge, eller markera ord med klick.";
    micStatus.classList.add("error");
    return;
  }
  micStatus.textContent = "Mikrofon: lyssnar …";
  micStatus.classList.remove("error");

  recognition = new SpeechRecognition();
  recognition.lang = "sv-SE";
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 3;

  recognition.onresult = (ev) => {
    const batch = batches[batchIndex];
    if (!batch) return;
    let any = false;
    for (let i = ev.resultIndex; i < ev.results.length; i++) {
      const res = ev.results[i];
      const text = res[0].transcript;
      for (let j = 0; j < batch.length; j++) {
        const globalIdx = batchIndex * 10 + j;
        if (wordStates[globalIdx] !== "pending") continue;
        const w = shuffledWords[globalIdx];
        if (transcriptMatches(text, w)) {
          wordStates[globalIdx] = "done";
          any = true;
        }
      }
    }
    if (any) {
      renderWordChips();
      if (batchComplete()) {
        stopRecognition();
        nextBatchBtn.style.display = "block";
      }
    }
  };

  recognition.onerror = (ev) => {
    if (ev.error === "no-speech" || ev.error === "aborted") return;
    micStatus.textContent = "Mikrofon: " + (ev.error || "fel") + " – du kan fortfarande klicka på ord.";
    micStatus.classList.add("error");
  };

  recognition.onend = () => {
    recognitionActive = false;
    if (gameScreen.style.display === "none") return;
    const batch = batches[batchIndex];
    if (!batch || batchComplete()) return;
    try {
      recognition.start();
      recognitionActive = true;
    } catch (_) {
      /* ignore */
    }
  };

  try {
    recognition.start();
    recognitionActive = true;
  } catch (e) {
    micStatus.textContent = "Kunde inte starta mikrofon. Kontrollera behörighet eller klicka på orden.";
    micStatus.classList.add("error");
  }
}

function renderWordChips() {
  wordGrid.innerHTML = "";
  const batch = batches[batchIndex];
  if (!batch) return;
  batch.forEach((_, j) => {
    const globalIdx = batchIndex * 10 + j;
    const w = shuffledWords[globalIdx];
    const st = wordStates[globalIdx];
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "word-chip";
    btn.textContent = w;
    if (st === "done") {
      btn.classList.add("done");
    } else if (st === "skip") {
      btn.classList.add("skip");
    } else {
      btn.classList.add("pending");
      btn.onclick = () => {
        if (wordStates[globalIdx] !== "pending") return;
        wordStates[globalIdx] = "skip";
        renderWordChips();
        if (batchComplete()) {
          stopRecognition();
          nextBatchBtn.style.display = "block";
        }
      };
    }
    wordGrid.appendChild(btn);
  });
}

function batchComplete() {
  const batch = batches[batchIndex];
  if (!batch) return false;
  return batch.every((_, j) => {
    const globalIdx = batchIndex * 10 + j;
    return wordStates[globalIdx] === "done" || wordStates[globalIdx] === "skip";
  });
}

function showLevelPicker() {
  levelScreen.style.display = "block";
  gameScreen.style.display = "none";
  resultScreen.style.display = "none";
  bannerMeta.textContent = name + " · " + klass;

  const wrap = document.getElementById("levelButtons");
  wrap.innerHTML = "";
  const maxLv = Math.max(1, ordjaktData.unlockedLevel || 1);
  levels.forEach((lv) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "level-btn";
    const stats = ordjaktData.levelStats[String(lv.id)];
    const best = stats && stats.bestTimeSeconds != null ? formatTime(stats.bestTimeSeconds) : "—";
    btn.textContent = `${lv.title} · mål ${formatTime(lv.targetTimeSeconds)} · bäst ${best}`;
    btn.disabled = lv.id > maxLv;
    if (btn.disabled) btn.title = "Lås upp genom att klara föregående nivå i tid.";
    btn.onclick = () => startLevel(lv.id);
    wrap.appendChild(btn);
  });
}

function startLevel(levelId) {
  currentLevel = levels.find((l) => l.id === levelId);
  if (!currentLevel) return;
  const maxLv = Math.max(1, ordjaktData.unlockedLevel || 1);
  if (levelId > maxLv) return;

  shuffledWords = shuffleArray(currentLevel.words.slice());
  const n = shuffledWords.length;
  batches = [];
  for (let i = 0; i < n; i += 10) batches.push(shuffledWords.slice(i, i + 10));
  batchIndex = 0;
  wordStates = shuffledWords.map(() => "pending");

  timerMs = 0;
  timerRunning = true;
  timerPaused = false;
  timerToggleBtn.textContent = "Pausa timer";

  levelScreen.style.display = "none";
  gameScreen.style.display = "block";
  resultScreen.style.display = "none";
  nextBatchBtn.style.display = "none";

  gameTitle.textContent = currentLevel.title;
  batchNum.textContent = "1";
  const batchTotalEl = document.getElementById("batchTotal");
  if (batchTotalEl) batchTotalEl.textContent = String(batches.length);
  targetTimeLabel.textContent = formatTime(currentLevel.targetTimeSeconds);
  timerDisplay.textContent = "0:00";
  startTimerLoop();

  renderWordChips();
  setupRecognition();

  bannerMeta.textContent = `${currentLevel.title} · omgång 1/${batches.length}`;
}

function goNextBatch() {
  if (!batchComplete()) return;
  stopRecognition();
  batchIndex++;
  if (batchIndex >= batches.length) {
    finishLevel();
    return;
  }
  nextBatchBtn.style.display = "none";
  batchNum.textContent = String(batchIndex + 1);
  bannerMeta.textContent = `${currentLevel.title} · omgång ${batchIndex + 1}/${batches.length}`;
  renderWordChips();
  setupRecognition();
}

function finishLevel() {
  stopRecognition();
  stopTimer();
  timerRunning = false;

  const elapsedSec = Math.floor(timerMs / 1000);
  const target = currentLevel.targetTimeSeconds;
  const passed = elapsedSec <= target;

  gameScreen.style.display = "none";
  resultScreen.style.display = "block";
  bannerMeta.textContent = "Resultat";

  document.getElementById("resultTitle").textContent = passed ? "Nivån är klar!" : "Tiden räckte inte";
  document.getElementById("resultText").textContent =
    `Din tid: ${formatTime(elapsedSec)}. Mål: ${formatTime(target)}.`;
  document.getElementById("resultExtra").textContent = passed
    ? (currentLevel.id < 5 ? "Nästa nivå är upplåst." : "Du har klarat den svåraste nivån!")
    : "Försök igen – pausa timern om du behöver paus, eller öva orden först.";

  saveOrdjaktResult(currentLevel.id, passed, elapsedSec).then(() => {
    /* saved */
  });

  document.getElementById("againBtn").onclick = () => {
    startLevel(currentLevel.id);
  };
  document.getElementById("levelPickBtn").onclick = () => {
    loadFirebaseOrdjakt().then(showLevelPicker);
  };
  document.getElementById("homeBtn").onclick = () => {
    window.location.href = "index.html";
  };
}

timerToggleBtn.addEventListener("click", () => {
  timerPaused = !timerPaused;
  timerToggleBtn.textContent = timerPaused ? "Fortsätt timer" : "Pausa timer";
});

nextBatchBtn.addEventListener("click", goNextBatch);

async function init() {
  loadLevels(async () => {
    if (!levels.length) {
      alert("Ingen ordlista.");
      return;
    }
    await loadFirebaseOrdjakt();
    showLevelPicker();
  });
}

init();
