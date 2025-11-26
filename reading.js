// --------------------------------------------------------
// 🔥 Firebase init
// --------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyCX9KeqxAmspG2hm4y161WPJxp2fn3LMug",
  authDomain: "mattematchen.firebaseapp.com",
  projectId: "mattematchen",
  storageBucket: "mattematchen.firebasestorage.app",
  messagingSenderId: "808790642635",
  appId: "1:808790642635:web:58b84df432b85af6f9b04e",
  measurementId: "G-GRYPBKH54R"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// --------------------------------------------------------
// 👤 Elevinfo
// --------------------------------------------------------
const name = localStorage.getItem("reading_name");
const klass = localStorage.getItem("reading_class");
if (!name || !klass) window.location.href = "index.html";
const elevId = `${klass}_${name.trim().toLowerCase().replace(/\s+/g, "_")}`;

// --------------------------------------------------------
// 📊 Tillstånd
// --------------------------------------------------------
let currentTextIndex = 0;
let currentQuestionIndex = 0;

let coins = 0;                 // valuta
let totalCorrectAnswers = 0;   // total kunskapsstatistik
let cleared = 0;

let textsFileIndex = 1;
let currentTexts = [];
let currentText = null;
let questions = [];

let rightAnswers = 0;
let totalAnswers = 0;

let textRight = 0;
let textTotal = 0;

// --------------------------------------------------------
// 🧩 Ladda elevens framsteg
// --------------------------------------------------------
async function loadProgress() {
  const ref = db.collection("readingResults").doc(elevId);
  const snap = await ref.get();

  if (snap.exists) {
    const data = snap.data();

    // 🪙 COINS: shopvaluta (kan minska)
    if (typeof data.coins === "number") {
      coins = data.coins;
    } else if (typeof data.poang === "number") {
      // Import från gamla systemet första gången
      coins = data.poang;
    }

    // ⭐ totalCorrectAnswers: ska aldrig minska
    if (typeof data.totalCorrectAnswers === "number") {
      totalCorrectAnswers = data.totalCorrectAnswers;
    } else if (typeof data.poang === "number") {
      // Import från gamla systemet första gången
      totalCorrectAnswers = data.poang;
    }

    // övrigt
    cleared = data.texter ?? 0;
    currentTextIndex = data.currentTextIndex ?? 0;
    currentQuestionIndex = data.currentQuestionIndex ?? 0;
    textsFileIndex = data.textsFileIndex ?? 1;
  }

  document.getElementById("score").textContent = totalCorrectAnswers;
  document.getElementById("coins").textContent = coins;
  document.getElementById("cleared").textContent = cleared;

  loadClassPoints();
  await loadTextsFile(textsFileIndex);
}

// --------------------------------------------------------
// 📂 Ladda textsX.js
// --------------------------------------------------------
function loadTextsFile(index) {
  return new Promise((resolve) => {
    const old = document.getElementById("textsScript");
    if (old) old.remove();

    delete window.__texts;

    const script = document.createElement("script");
    script.id = "textsScript";
    script.src = `texts/texts${index}.js`;

    script.onload = () => {
      const arr = window.__texts;
      delete window.__texts;

      if (!Array.isArray(arr) || arr.length === 0) {
        allTextsDone();
        resolve();
        return;
      }

      currentTexts = arr.slice();
      if (currentTextIndex >= currentTexts.length) currentTextIndex = 0;

      saveResult(false);
      loadText();
      resolve();
    };

    script.onerror = () => {
      allTextsDone();
      resolve();
    };

    document.body.appendChild(script);
  });
}

// --------------------------------------------------------
// 🧠 Ladda text
// --------------------------------------------------------
function loadText() {
  if (currentTextIndex >= currentTexts.length) {
    textsFileIndex++;
    currentTextIndex = 0;
    saveResult(false);
    loadTextsFile(textsFileIndex);
    return;
  }

  currentText = currentTexts[currentTextIndex];

  document.getElementById("textTitle").textContent = currentText.title;
  document.getElementById("readingText").innerHTML =
    `<p>${currentText.text.replace(/\n/g, "</p><p>")}</p>`;
  document.getElementById("textCategory").textContent = currentText.category || "";

  questions = currentText.questions || [];
  textTotal = questions.length;
  textRight = 0;

  if (currentQuestionIndex >= questions.length)
    currentQuestionIndex = 0;

  showQuestion();
}

// --------------------------------------------------------
// 🎲 Slumpa svar
// --------------------------------------------------------
function shuffleAnswers(q) {
  const arr = q.a.map((text, i) => ({ text, correct: i === q.correct }));
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  q.a = arr.map(o => o.text);
  q.correct = arr.findIndex(o => o.correct);
}

// --------------------------------------------------------
// ❓ Visa fråga
// --------------------------------------------------------
function showQuestion() {
  if (!questions.length) return showFeedbackPopup();

  const q = questions[currentQuestionIndex];
  shuffleAnswers(q);

  document.getElementById("question").textContent = q.q;
  document.getElementById("qNum").textContent = currentQuestionIndex + 1;
  document.getElementById("qTotal").textContent = questions.length;

  const answersDiv = document.getElementById("answers");
  answersDiv.innerHTML = "";

  q.a.forEach((alt, i) => {
    const btn = document.createElement("button");
    btn.textContent = alt;
    btn.className = "answer-btn";
    btn.onclick = () => checkAnswer(i === q.correct);
    answersDiv.appendChild(btn);
  });
}

// --------------------------------------------------------
// 🟦 Kontrollera svar (ingen poäng här längre)
// --------------------------------------------------------
async function checkAnswer(isCorrect) {
  totalAnswers++;

  if (isCorrect) {
    rightAnswers++;
    textRight++;
  }

  currentQuestionIndex++;
  await saveResult(false);

  if (currentQuestionIndex < questions.length) showQuestion();
  else showFeedbackPopup();
}

// --------------------------------------------------------
// 💬 Popup vid textslut
// --------------------------------------------------------
function showFeedbackPopup() {
  const percent = Math.round((textRight / textTotal) * 100);
  const passed = percent >= 65;

  saveTextStats(currentText.title, percent);

  const overlay = document.createElement("div");
  overlay.className = "popup-overlay";

  const popup = document.createElement("div");
  popup.className = "popup-box";

  popup.innerHTML = `
    <h2>${passed ? "✨ Bra jobbat!" : "📘 För låg nivå"}</h2>
    <p><strong>${currentText.title}</strong></p>
    <p>Du fick <strong>${textRight}</strong> av <strong>${textTotal}</strong> rätt (${percent}%).</p>
    ${passed
      ? `<button id="nextTextBtn" class="main-btn">Nästa text</button>`
      : `<button id="retryBtn" class="main-btn" style="background:#ffc107;color:#000;">Försök igen</button>`
    }
  `;

  overlay.appendChild(popup);
  document.body.appendChild(overlay);

  // 🟩 GODKÄND → ge poäng här
  if (passed) {
    const gain = textRight;

    coins += gain;
    totalCorrectAnswers += gain;

    updateClassPoints(gain);

    document.getElementById("coins").textContent = coins;
    document.getElementById("score").textContent = totalCorrectAnswers;

    document.getElementById("nextTextBtn").onclick = async () => {
      document.body.removeChild(overlay);
      cleared++;
      document.getElementById("cleared").textContent = cleared;
      currentTextIndex++;
      currentQuestionIndex = 0;
      await saveResult(false);
      loadText();
    };
  }

  // 🟨 UNDERKÄND → bara retry
  const retry = document.getElementById("retryBtn");
  if (retry) {
    retry.onclick = async () => {
      document.body.removeChild(overlay);
      currentQuestionIndex = 0;
      textRight = 0;
      await saveResult(false);
      showQuestion();
    };
  }
}

// --------------------------------------------------------
// 💾 Statistik per text
// --------------------------------------------------------
async function saveTextStats(title, percent) {
  const ref = db.collection("readingResults").doc(elevId);
  const snap = await ref.get();
  const data = snap.exists ? snap.data() : {};
  const stats = data.textStats || {};

  const textIndex = currentTextIndex + 1;
  stats[`${textsFileIndex}.${textIndex}_${title}`] = percent;

  await ref.set({ ...data, textStats: stats }, { merge: true });
}

// --------------------------------------------------------
// 💾 Spara allt
// --------------------------------------------------------
async function saveResult(final = false) {
  const ref = db.collection("readingResults").doc(elevId);
  const snap = await ref.get();
  const old = snap.exists ? snap.data() : {};

  // SKYDD: totalCorrect får aldrig minska
  if (typeof old.totalCorrectAnswers === "number") {
    totalCorrectAnswers = Math.max(totalCorrectAnswers, old.totalCorrectAnswers);
  }

  // SKYDD: coins måste få minska (shopping)
  // men ska aldrig skrivas över av gamla poang
  if (typeof old.coins === "number") {
    coins = coins; // använd nyaste värdet
  }

  const data = {
    namn: name,
    klass: klass,
    coins,
    totalCorrectAnswers,
    texter: cleared,
    currentTextIndex,
    currentQuestionIndex,
    textsFileIndex,
    senaste: new Date().toISOString()
  };

  if (snap.exists) await ref.update(data);
  else await ref.set(data);

  if (final) console.log("✔️ Alla texter klara");
}

// --------------------------------------------------------
// 🏫 Klasspoäng
// --------------------------------------------------------
function loadClassPoints() {
  const ref = db.collection("readingClassTotals").doc(klass);

  ref.onSnapshot((doc) => {
    const el = document.getElementById("classPoints");
    if (!el) return;
    if (!doc.exists) return;

    const data = doc.data();
    if (typeof data.totalPoang === "number") el.textContent = data.totalPoang;
  });
}

async function updateClassPoints(amount) {
  const ref = db.collection("readingClassTotals").doc(klass);

  await db.runTransaction(async (t) => {
    const snap = await t.get(ref);

    if (!snap.exists) {
      t.set(ref, { totalPoang: amount, mal: 5000 });
      return;
    }

    const current = snap.data().totalPoang ?? 0;
    t.update(ref, { totalPoang: current + amount });
  });
}

// --------------------------------------------------------
// 🎉 Alla texter klara
// --------------------------------------------------------
function allTextsDone() {
  document.querySelector(".reading-container").innerHTML = `
    <h2>🎉 Alla texter klara!</h2>
    <p>Totalt antal rätt: <strong>${totalCorrectAnswers}</strong></p>
    <p>Coins kvar: <strong>${coins}</strong></p>
    <button class="main-btn" onclick="window.location.href='index.html'">Tillbaka</button>
  `;
  saveResult(true);
}

// --------------------------------------------------------
loadProgress();
