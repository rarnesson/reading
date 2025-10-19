// 🔥 Firebase init
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
  
  // 👤 Elevinfo
  const name = localStorage.getItem("reading_name");
  const klass = localStorage.getItem("reading_class");
  if (!name || !klass) window.location.href = "index.html";
  const elevId = `${klass}_${name.trim().toLowerCase().replace(/\s+/g, "_")}`;
  
  // 📊 Tillstånd
  let currentTextIndex = 0;
  let currentQuestionIndex = 0;
  let score = 0;
  let rightAnswers = 0;
  let totalAnswers = 0;
  let cleared = 0;
  
  let textsFileIndex = 1; // texts1.js som start
  let currentTexts = [];  // arrayen från aktuell textsX.js
  let currentText = null;
  let questions = [];
  
  // Per-text statistik (för popup)
  let textRight = 0;
  let textTotal = 0;
  
  // 🧩 Ladda elevens framsteg
  async function loadProgress() {
    const ref = db.collection("readingResults").doc(elevId);
    const snap = await ref.get();
    if (snap.exists) {
      const data = snap.data();
      score = data.poang ?? 0;
      cleared = data.texter ?? 0;
      currentTextIndex = data.currentTextIndex ?? 0;
      currentQuestionIndex = data.currentQuestionIndex ?? 0;
      textsFileIndex = data.textsFileIndex ?? 1;
      document.getElementById("score").textContent = score;
      document.getElementById("cleared").textContent = cleared;
    }
    // Ladda aktuell texts-fil
    await loadTextsFile(textsFileIndex);
  }
  
  // 📂 Ladda textsX.js => förväntar sig att filen sätter window.__texts = [...]
  function loadTextsFile(index) {
    return new Promise((resolve) => {
      const old = document.getElementById("textsScript");
      if (old) old.remove();
  
      delete window.__texts;
  
      const filePath = `texts/texts${index}.js`;
      const script = document.createElement("script");
      script.id = "textsScript";
      script.src = filePath;
  
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
  
  // 🧠 Ladda aktuell text i den aktiva filen
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
      `<p>${(currentText.text || "").replace(/\n/g, "</p><p>")}</p>`;
    document.getElementById("textCategory").textContent = currentText.category || "";
  
    questions = currentText.questions || [];
    document.getElementById("qTotal").textContent = questions.length;
  
    textRight = 0;
    textTotal = questions.length;
  
    currentQuestionIndex = 0;
    showQuestion();
  }
  
  // 🎲 Slumpa ordningen på svarsalternativen men behåll rätt koppling till 'correct'
  function shuffleAnswers(question) {
    const original = question.a.map((alt, i) => ({ text: alt, isCorrect: i === question.correct }));
    for (let i = original.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [original[i], original[j]] = [original[j], original[i]];
    }
    question.a = original.map(x => x.text);
    question.correct = original.findIndex(x => x.isCorrect);
  }
  
  // ❓ Visa fråga
  function showQuestion() {
    if (!questions.length) {
      showFeedbackPopup();
      return;
    }
  
    const q = questions[currentQuestionIndex];
    shuffleAnswers(q); // 🌀 slumpa alternativen
  
    document.getElementById("question").textContent = q.q;
    const answersDiv = document.getElementById("answers");
    answersDiv.innerHTML = "";
  
    q.a.forEach((alt, i) => {
      const btn = document.createElement("button");
      btn.textContent = alt;
      btn.className = "answer-btn";
      btn.onclick = () => checkAnswer(i === q.correct);
      answersDiv.appendChild(btn);
    });
  
    document.getElementById("qNum").textContent = currentQuestionIndex + 1;
  }
  
  // ✅ Kontrollera svar
  async function checkAnswer(isCorrect) {
    totalAnswers++;
    if (isCorrect) {
      score++;
      rightAnswers++;
      textRight++;
      document.getElementById("score").textContent = score;
    }
  
    const acc = totalAnswers > 0 ? Math.round((rightAnswers / totalAnswers) * 100) : 0;
    document.getElementById("accuracy").textContent = acc + "%";
  
    currentQuestionIndex++;
    await saveResult(false);
  
    if (currentQuestionIndex < questions.length) {
      showQuestion();
    } else {
      showFeedbackPopup();
    }
  }
  
  // 💬 Popup efter text
  function showFeedbackPopup() {
    const percent = textTotal > 0 ? Math.round((textRight / textTotal) * 100) : 100;
    const passed = percent >= 60;
  
    saveTextStats(currentText.title, percent);
  
    const overlay = document.createElement("div");
    overlay.className = "popup-overlay";
  
    const popup = document.createElement("div");
    popup.className = "popup-box";
  
    const titleHTML = passed
      ? "✨ Bra jobbat!"
      : `📘 Du fick ${percent}% rätt`;
  
    const buttonsHTML = passed
      ? `<button id="nextTextBtn" class="main-btn">Nästa text</button>`
      : `
          <button id="retryBtn" class="main-btn" style="background:#ffc107; color:#000;">Försök igen</button>
          <button id="nextTextBtn" class="main-btn" style="background:#198754;">Nästa text</button>
        `;
  
    popup.innerHTML = `
      <h2>${titleHTML}</h2>
      <p><strong>${currentText.title}</strong></p>
      <p>Du hade <strong>${textRight}</strong> av <strong>${textTotal}</strong> rätt.</p>
      ${buttonsHTML}
    `;
  
    overlay.appendChild(popup);
    document.body.appendChild(overlay);
  
    document.getElementById("nextTextBtn").onclick = async () => {
      document.body.removeChild(overlay);
      cleared++;
      document.getElementById("cleared").textContent = cleared;
      currentTextIndex++;
      await saveResult(false);
      loadText();
    };
  
    const retryBtn = document.getElementById("retryBtn");
    if (retryBtn) {
      retryBtn.onclick = () => {
        document.body.removeChild(overlay);
        currentQuestionIndex = 0;
        textRight = 0;
        showQuestion();
      };
    }
  }
  
  // 💾 Statistik per text
  async function saveTextStats(title, percent) {
    const ref = db.collection("readingResults").doc(elevId);
    const snap = await ref.get();
    const data = snap.exists ? snap.data() : {};
    const stats = data.textStats || {};
    stats[`${textsFileIndex}_${title}`] = percent;
    await ref.set({ ...data, textStats: stats }, { merge: true });
  }
  
  // 💾 Övergripande resultat
  async function saveResult(final = false) {
    const ref = db.collection("readingResults").doc(elevId);
    const data = {
      namn: name,
      klass: klass,
      poang: score,
      texter: cleared,
      currentTextIndex,
      currentQuestionIndex,
      textsFileIndex,
      senaste: new Date().toISOString()
    };
  
    const snap = await ref.get();
    if (snap.exists) await ref.update(data);
    else await ref.set(data);
  
    if (final) console.log("✅ Framsteg sparat: alla texter klara!");
  }
  
  // ✅ När alla filer är slut
  function allTextsDone() {
    document.querySelector(".reading-container").innerHTML = `
      <h2>🎉 Alla texter klara!</h2>
      <p>Din totala poäng: <strong>${score}</strong></p>
      <button class="main-btn" onclick="window.location.href='index.html'">Tillbaka</button>
    `;
    saveResult(true);
  }
  
  loadProgress();
  