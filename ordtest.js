const db = firebase.firestore();

const name = localStorage.getItem("reading_name");
const klass = localStorage.getItem("reading_class");
if (!name || !klass) {
  window.location.href = "index.html";
}

const elevId = `${klass}_${name.trim().toLowerCase().replace(/\s+/g, "_")}`;

let totalWords = 100;
let allWords = [];
let wordOrder = [];
let currentIndex = 0;
let correctCount = 0;
let attempts = [];
let inProgress = null;
let locked = false;

const startScreen = document.getElementById("startScreen");
const questionScreen = document.getElementById("questionScreen");
const resultScreen = document.getElementById("resultScreen");
const progressInfo = document.getElementById("progressInfo");

function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function loadWords(cb) {
  if (window.__ordtestWords && window.__ordtestWords.length > 0) {
    allWords = window.__ordtestWords.slice();
    totalWords = allWords.length;
    cb();
    return;
  }
  const base = window.location.href.replace(/\/[^/]*$/, "/");
  const script = document.createElement("script");
  script.src = base + "texts/ordtestData.js?v=1";
  script.onload = () => {
    allWords = (window.__ordtestWords || []).slice();
    totalWords = allWords.length;
    cb();
  };
  script.onerror = () => alert("Kunde inte ladda ordlistan.");
  document.body.appendChild(script);
}

async function loadProgress() {
  const ref = db.collection("readingResults").doc(elevId);
  const snap = await ref.get();
  if (snap.exists) {
    const d = snap.data();
    attempts = Array.isArray(d.ordtestAttempts) ? d.ordtestAttempts : [];
    inProgress = d.ordtestInProgress || null;
  }
}

async function saveProgress() {
  const ref = db.collection("readingResults").doc(elevId);
  const snap = await ref.get();
  const data = snap.exists ? snap.data() : { namn: name, klass: klass };
  data.ordtestAttempts = attempts;
  data.ordtestInProgress = inProgress;
  data.senaste = new Date().toISOString();
  await ref.set(data, { merge: true });
}

function showStart() {
  startScreen.style.display = "block";
  questionScreen.style.display = "none";
  resultScreen.style.display = "none";
  progressInfo.textContent = "Fråga 0 av " + totalWords;

  const startBtn = document.getElementById("startBtn");
  startBtn.onclick = () => {
    wordOrder = shuffleArray(allWords.map((_, i) => i));
    currentIndex = 0;
    correctCount = 0;
    inProgress = { wordOrder, currentIndex: 0, correctCount: 0 };
    saveProgress();
    startScreen.style.display = "none";
    questionScreen.style.display = "block";
    showQuestion();
  };
}

function showResumeOrStart() {
  if (inProgress && inProgress.wordOrder && inProgress.wordOrder.length === totalWords) {
    wordOrder = inProgress.wordOrder;
    currentIndex = inProgress.currentIndex || 0;
    correctCount = inProgress.correctCount || 0;
    if (currentIndex >= wordOrder.length) {
      finishAttempt();
      return;
    }
    startScreen.style.display = "none";
    questionScreen.style.display = "block";
    showQuestion();
    return;
  }
  showStart();
}

function showQuestion() {
  if (currentIndex >= wordOrder.length) {
    finishAttempt();
    return;
  }
  const idx = wordOrder[currentIndex];
  const item = allWords[idx];
  if (!item) {
    finishAttempt();
    return;
  }
  progressInfo.textContent = `Fråga ${currentIndex + 1} av ${totalWords}`;
  document.getElementById("progressText").textContent = `Fråga ${currentIndex + 1} av ${totalWords}`;
  document.getElementById("wordDisplay").textContent = item.word;

  const opts = item.options.map((text, i) => ({ text, correct: i === item.answer }));
  const shuffled = shuffleArray(opts);

  const answersDiv = document.getElementById("answers");
  answersDiv.innerHTML = "";
  shuffled.forEach((o, i) => {
    const btn = document.createElement("button");
    btn.className = "answer-btn";
    btn.textContent = o.text;
    btn.onclick = () => handleAnswer(btn, o.correct, shuffled);
    answersDiv.appendChild(btn);
  });
  locked = false;
}

function handleAnswer(clickedBtn, isCorrect, allBtns) {
  if (locked) return;
  locked = true;

  allBtns.forEach((o, i) => {
    const btn = document.getElementById("answers").children[i];
    btn.disabled = true;
    if (o.correct) btn.classList.add("correct");
    else if (btn === clickedBtn) btn.classList.add("wrong");
  });

  if (isCorrect) correctCount++;

  inProgress = { wordOrder, currentIndex: currentIndex + 1, correctCount };
  saveProgress();

  currentIndex++;
  if (currentIndex >= wordOrder.length) {
    setTimeout(finishAttempt, 1200);
    return;
  }
  setTimeout(showQuestion, 1200);
}

function finishAttempt() {
  attempts.push(correctCount);
  inProgress = null;
  saveProgress();

  questionScreen.style.display = "none";
  resultScreen.style.display = "block";
  progressInfo.textContent = "Klart";

  const totalThisRound = wordOrder.length;
  const best = attempts.length ? Math.max(...attempts) : correctCount;
  document.getElementById("resultText").textContent = `Du fick ${correctCount} av ${totalThisRound} rätt denna omgång.`;
  document.getElementById("bestText").textContent = attempts.length > 1
    ? `Bästa resultat hittills: ${best} av ${totalThisRound}.`
    : "";

  document.getElementById("restartBtn").onclick = () => {
    wordOrder = shuffleArray(allWords.map((_, i) => i));
    currentIndex = 0;
    correctCount = 0;
    inProgress = { wordOrder, currentIndex: 0, correctCount: 0 };
    saveProgress();
    resultScreen.style.display = "none";
    questionScreen.style.display = "block";
    showQuestion();
  };
  document.getElementById("backBtn").onclick = () => { window.location.href = "index.html"; };
}

async function init() {
  loadWords(async () => {
    await loadProgress();
    showResumeOrStart();
  });
}

init();
