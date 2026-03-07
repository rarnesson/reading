// --------------------------------------------------------
// 🔥 Firebase (init i firebase-config.js)
// --------------------------------------------------------
const db = firebase.firestore();

// --------------------------------------------------------
// 👤 Elevinfo
// --------------------------------------------------------
const name = localStorage.getItem("reading_name");
const klass = localStorage.getItem("reading_class");
if (!name || !klass) window.location.href = "index.html";
const elevId = `${klass}_${name.trim().toLowerCase().replace(/\s+/g, "_")}`;

// 📋 Fakta-läge = träna bara faktatexter (separat framsteg)
const isFaktaMode = localStorage.getItem("reading_mode") === "fakta";
// 📖 Berättande-läge = "Läs först, svara sen" (delar med text → frågor, måste klara för poäng)
const isBerattandeMode = localStorage.getItem("reading_mode") === "berattande";

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

// Berättande: aktuell berättelse (story), delindex, rätt/total för hela berättelsen
let currentStory = null;
let currentPartIndex = 0;
let storyCorrect = 0;
let storyTotal = 0;

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
      coins = data.poang;
    }

    // ⭐ totalCorrectAnswers: ska aldrig minska
    if (typeof data.totalCorrectAnswers === "number") {
      totalCorrectAnswers = data.totalCorrectAnswers;
    } else if (typeof data.poang === "number") {
      totalCorrectAnswers = data.poang;
    }

    if (isFaktaMode) {
      cleared = data.texterFakta ?? 0;
      currentTextIndex = data.currentTextIndexFakta ?? 0;
      currentQuestionIndex = data.currentQuestionIndexFakta ?? 0;
    } else if (isBerattandeMode) {
      cleared = data.texterBerattande ?? 0;
      currentTextIndex = data.currentTextIndexBerattande ?? 0;
    } else {
      cleared = data.texter ?? 0;
      currentTextIndex = data.currentTextIndex ?? 0;
      currentQuestionIndex = data.currentQuestionIndex ?? 0;
      textsFileIndex = data.textsFileIndex ?? 1;
    }
  }

  updateBannerStats();
  loadClassPoints();
  if (isFaktaMode) {
    const banner = document.querySelector(".banner");
    if (banner) {
      const badge = document.createElement("span");
      badge.textContent = "📋 Faktatexter";
      badge.style.marginRight = "12px";
      badge.style.opacity = "0.95";
      banner.insertBefore(badge, banner.firstChild);
    }
    await loadTextsFileFakta();
  } else if (isBerattandeMode) {
    const banner = document.querySelector(".banner");
    if (banner) {
      const badge = document.createElement("span");
      badge.textContent = "📖 Läs först, svara sen";
      badge.style.marginRight = "12px";
      badge.style.opacity = "0.95";
      banner.insertBefore(badge, banner.firstChild);
    }
    await loadTextsBerattande();
  } else {
    await loadTextsFile(textsFileIndex);
  }
}

// --------------------------------------------------------
// 📊 Uppdatera banner (poäng, coins, träffsäkerhet, klara)
// --------------------------------------------------------
function updateBannerStats() {
  const scoreEl = document.getElementById("score");
  const coinsEl = document.getElementById("coins");
  const clearedEl = document.getElementById("cleared");
  const accuracyEl = document.getElementById("accuracy");
  if (scoreEl) scoreEl.textContent = totalCorrectAnswers;
  if (coinsEl) coinsEl.textContent = coins;
  if (clearedEl) clearedEl.textContent = cleared;
  if (accuracyEl) {
    accuracyEl.textContent = totalAnswers > 0
      ? Math.round((rightAnswers / totalAnswers) * 100) + "%"
      : "0%";
  }
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
    script.src = `texts/texts${index}.js?v=2`;

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
// 🔀 Slumpa med fast seed – samma ordning för alla (blandade ämnen)
// --------------------------------------------------------
function seededShuffle(arr, seed) {
  const a = arr.slice();
  let s = seed;
  const rand = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// --------------------------------------------------------
// 📂 Ladda faktatexter – blandad ordning mellan ämnen, samma för alla
// --------------------------------------------------------
function loadTextsFileFakta() {
  return new Promise((resolve) => {
    const old = document.getElementById("textsScript");
    if (old) old.remove();
    delete window.__texts;

    const script = document.createElement("script");
    script.id = "textsScript";
    script.src = "texts/textsFakta.js?v=1";

    script.onload = () => {
      const arr = window.__texts;
      delete window.__texts;

      if (!Array.isArray(arr) || arr.length === 0) {
        allTextsDone();
        resolve();
        return;
      }

      currentTexts = seededShuffle(arr, 99194853);
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
// 📖 Ladda berättande texter – "Läs först, svara sen"
// --------------------------------------------------------
function loadTextsBerattande() {
  return new Promise((resolve) => {
    const old = document.getElementById("textsScript");
    if (old) old.remove();
    delete window.__textsBerattande;

    const script = document.createElement("script");
    script.id = "textsScript";
    script.src = "texts/textsBerattande.js?v=1";

    script.onload = () => {
      const arr = window.__textsBerattande;
      delete window.__textsBerattande;

      if (!Array.isArray(arr) || arr.length === 0) {
        allTextsDone();
        resolve();
        return;
      }

      currentTexts = arr;
      if (currentTextIndex >= currentTexts.length) currentTextIndex = 0;

      saveResult(false);
      loadStory();
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
// 📖 Visa en del av berättelsen (bara text + Fortsätt)
// --------------------------------------------------------
function showPartReading() {
  const qArea = document.getElementById("questionArea");
  const readingTextEl = document.getElementById("readingText");
  if (qArea) qArea.style.display = "none";
  if (readingTextEl) readingTextEl.style.display = "block";

  let wrap = document.getElementById("berattandeFortsattWrap");
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.id = "berattandeFortsattWrap";
    wrap.style.marginTop = "1em";
    const btn = document.createElement("button");
    btn.className = "main-btn";
    btn.textContent = "Fortsätt";
    btn.id = "btnFortsatt";
    btn.onclick = onBerattandeFortsatt;
    wrap.appendChild(btn);
    readingTextEl.parentNode.insertBefore(wrap, qArea);
  }
  wrap.style.display = "block";
}

// Klick på "Fortsätt" – dölj text, visa frågor för denna del (ingen tillbaka)
function onBerattandeFortsatt() {
  const wrap = document.getElementById("berattandeFortsattWrap");
  const readingTextEl = document.getElementById("readingText");
  const qArea = document.getElementById("questionArea");
  if (wrap) wrap.style.display = "none";
  if (readingTextEl) readingTextEl.style.display = "none";
  if (qArea) qArea.style.display = "block";

  const part = currentStory.parts[currentPartIndex];
  questions = part.questions || [];
  textTotal = questions.length;
  textRight = 0;
  currentQuestionIndex = 0;
  showQuestion();
}

// --------------------------------------------------------
// 📖 Ladda aktuell berättelse (story) – starta från del 1
// --------------------------------------------------------
function loadStory() {
  if (currentTextIndex >= currentTexts.length) {
    allTextsDone();
    return;
  }

  currentStory = currentTexts[currentTextIndex];
  currentText = currentStory;
  currentPartIndex = 0;
  storyCorrect = 0;
  storyTotal = 0;

  const part = currentStory.parts[0];
  const partText = (part.text || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  document.getElementById("textTitle").textContent =
    currentStory.title + " – Del 1 av " + currentStory.parts.length;
  document.getElementById("readingText").innerHTML =
    partText.split(/\n/).map((p) => `<p>${p}</p>`).join("");
  document.getElementById("textCategory").textContent = currentStory.category || "Berättande text";

  showPartReading();
}

// --------------------------------------------------------
// 🧠 Ladda text
// --------------------------------------------------------
function loadText() {
  if (isBerattandeMode) {
    loadStory();
    return;
  }
  if (currentTextIndex >= currentTexts.length) {
    if (isFaktaMode) {
      allTextsDone();
      return;
    }
    textsFileIndex++;
    currentTextIndex = 0;
    saveResult(false);
    loadTextsFile(textsFileIndex);
    return;
  }

  currentText = currentTexts[currentTextIndex];

  document.getElementById("textTitle").textContent = currentText.title;
  const escaped = (currentText.text || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  document.getElementById("readingText").innerHTML =
    escaped.split(/\n/).map((p) => `<p>${p}</p>`).join("");
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
  updateBannerStats();

  if (currentQuestionIndex < questions.length) {
    showQuestion();
    return;
  }

  // Berättande: del klar – räkna ihop, visa nästa del eller resultat för hela berättelsen
  if (isBerattandeMode && currentStory) {
    storyCorrect += textRight;
    storyTotal += textTotal;
    currentPartIndex++;
    if (currentPartIndex < currentStory.parts.length) {
      const part = currentStory.parts[currentPartIndex];
      const partText = (part.text || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
      document.getElementById("textTitle").textContent =
        currentStory.title + " – Del " + (currentPartIndex + 1) + " av " + currentStory.parts.length;
      document.getElementById("readingText").innerHTML =
        partText.split(/\n/).map((p) => `<p>${p}</p>`).join("");
      showPartReading();
      return;
    }
    showFeedbackPopupBerattande();
    return;
  }

  showFeedbackPopup();
}

// --------------------------------------------------------
// 💬 Popup vid textslut
// --------------------------------------------------------
function showFeedbackPopup() {
  const textTotalSafe = textTotal || 1;
  const percent = Math.round((textRight / textTotalSafe) * 100);
  const passed = percent >= 65;

  if (currentText && textTotal > 0) saveTextStats(currentText.title, percent);

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

    updateBannerStats();

    document.getElementById("nextTextBtn").onclick = async () => {
      document.body.removeChild(overlay);
      cleared++;
      updateBannerStats();
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
// 💬 Popup för berättelse – poäng bara om ≥65 % (klara)
// --------------------------------------------------------
function showFeedbackPopupBerattande() {
  const totalSafe = storyTotal || 1;
  const percent = Math.round((storyCorrect / totalSafe) * 100);
  const passed = percent >= 65;

  const overlay = document.createElement("div");
  overlay.className = "popup-overlay";
  const popup = document.createElement("div");
  popup.className = "popup-box";

  popup.innerHTML = `
    <h2>${passed ? "✨ Bra jobbat!" : "📘 För låg nivå"}</h2>
    <p><strong>${currentStory.title}</strong></p>
    <p>Du fick <strong>${storyCorrect}</strong> av <strong>${storyTotal}</strong> rätt (${percent}%).</p>
    ${passed
      ? `<p>Du klarade! Poäng och coins ges när du klarar.</p><button id="nextStoryBtn" class="main-btn">Nästa berättelse</button>`
      : `<p>Du behöver minst 65 % för att klara. Börja om från del 1.</p><button id="borjaOmBtn" class="main-btn" style="background:#ffc107;color:#000;">Börja om</button>`
    }
  `;
  overlay.appendChild(popup);
  document.body.appendChild(overlay);

  if (passed) {
    if (currentStory && storyTotal > 0) saveTextStats(currentStory.title, percent);
    const gain = storyCorrect;
    coins += gain;
    totalCorrectAnswers += gain;
    updateClassPoints(gain);
    updateBannerStats();

    document.getElementById("nextStoryBtn").onclick = async () => {
      document.body.removeChild(overlay);
      cleared++;
      updateBannerStats();
      currentTextIndex++;
      currentQuestionIndex = 0;
      await saveResult(false);
      loadStory();
    };
  } else {
    document.getElementById("borjaOmBtn").onclick = async () => {
      document.body.removeChild(overlay);
      currentPartIndex = 0;
      storyCorrect = 0;
      storyTotal = 0;
      const part = currentStory.parts[0];
      const partText = (part.text || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
      document.getElementById("textTitle").textContent =
        currentStory.title + " – Del 1 av " + currentStory.parts.length;
      document.getElementById("readingText").innerHTML =
        partText.split(/\n/).map((p) => `<p>${p}</p>`).join("");
      showPartReading();
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

  if (isFaktaMode) {
    const stats = data.textStatsFakta || {};
    const textIndex = currentTextIndex + 1;
    stats[`1.${textIndex}_${title}`] = percent;
    await ref.set({ ...data, textStatsFakta: stats }, { merge: true });
  } else if (isBerattandeMode) {
    const stats = data.textStatsBerattande || {};
    const storyIndex = currentTextIndex + 1;
    stats[`1.${storyIndex}_${title}`] = percent;
    await ref.set({ ...data, textStatsBerattande: stats }, { merge: true });
  } else {
    const stats = data.textStats || {};
    const textIndex = currentTextIndex + 1;
    stats[`${textsFileIndex}.${textIndex}_${title}`] = percent;
    await ref.set({ ...data, textStats: stats }, { merge: true });
  }
}

// --------------------------------------------------------
// 💾 Spara allt
// --------------------------------------------------------
async function saveResult(final = false) {
  const ref = db.collection("readingResults").doc(elevId);
  const snap = await ref.get();
  const old = snap.exists ? snap.data() : {};

  if (typeof old.totalCorrectAnswers === "number") {
    totalCorrectAnswers = Math.max(totalCorrectAnswers, old.totalCorrectAnswers);
  }
  if (typeof old.coins === "number") {
    coins = coins;
  }

  const data = {
    namn: name,
    klass: klass,
    coins,
    totalCorrectAnswers,
    senaste: new Date().toISOString()
  };

  if (isFaktaMode) {
    data.texterFakta = cleared;
    data.currentTextIndexFakta = currentTextIndex;
    data.currentQuestionIndexFakta = currentQuestionIndex;
  } else if (isBerattandeMode) {
    data.texterBerattande = cleared;
    data.currentTextIndexBerattande = currentTextIndex;
  } else {
    data.texter = cleared;
    data.currentTextIndex = currentTextIndex;
    data.currentQuestionIndex = currentQuestionIndex;
    data.textsFileIndex = textsFileIndex;
  }

  if (snap.exists) await ref.update(data);
  else await ref.set(data);

  if (final) console.log(isFaktaMode ? "✔️ Faktatexter klara" : isBerattandeMode ? "✔️ Berättande texter klara" : "✔️ Alla texter klara");
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
  const isFakta = isFaktaMode;
  const isBerattande = isBerattandeMode;
  const title = isBerattande ? "🎉 Berättande texter klara!" : isFakta ? "🎉 Faktatexter klara!" : "🎉 Alla texter klara!";
  const reloadLabel = isBerattande ? "Kolla efter fler berättelser" : isFakta ? "Kolla efter fler faktatexter" : "Kolla efter fler texter";
  document.querySelector(".reading-container").innerHTML = `
    <h2>${title}</h2>
    <p>Totalt antal rätt: <strong>${totalCorrectAnswers}</strong></p>
    <p>Coins kvar: <strong>${coins}</strong></p>
    <button class="main-btn" onclick="window.location.reload()" style="margin-right:8px;">🔄 ${reloadLabel}</button>
    <button class="main-btn" onclick="window.location.href='index.html'">Tillbaka</button>
  `;
  saveResult(true);
}

// --------------------------------------------------------
loadProgress();
