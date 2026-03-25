// 🔥 Firebase (init i firebase-config.js)
const db = firebase.firestore();

// --- DOM ---
const classSelect = document.getElementById("classSelect");
const tableBody = document.getElementById("tableBody");
const headerRow = document.getElementById("headerRow");
const resetBtn = document.getElementById("resetBtn");

const tableScroll = document.getElementById("tableScroll");
const stickyScroll = document.getElementById("stickyScroll");

// Flikar för texttyper – enkelt att lägga till fler senare
const TABS = [
  { id: "normal", label: "Vanliga texter", statsKey: "textStats" },
  { id: "fakta", label: "Faktatexter", statsKey: "textStatsFakta" },
  { id: "berattande", label: "Berättande texter", statsKey: "textStatsBerattande" },
  { id: "ordforstaelse", label: "Ordförståelse", statsKey: "ordtestAttempts", isOrdtest: true },
  { id: "ordjakt", label: "Ordjakt", isOrdjakt: true }
];
let currentTab = "normal";
let cachedRows = [];
let cachedClass = "";

// Hur många kolumner max (siffror)
const DEFAULT_TEXT_COLUMNS = 40;

/** Måltid i ordjakt (sekunder), samma som i ordjakt-levels.js */
const ORDJAKT_TARGET_SEC = 150;

// 🔄 Sync mellan övre och nedre scroll
tableScroll.addEventListener("scroll", () => {
  stickyScroll.scrollLeft = tableScroll.scrollLeft;
});
stickyScroll.addEventListener("scroll", () => {
  tableScroll.scrollLeft = stickyScroll.scrollLeft;
});


// 🎨 Färglogik
function cellClass(p) {
  if (p === undefined || p === null) return "gray";
  if (p >= 80) return "green";
  if (p >= 60) return "yellow";
  return "red";
}


// 📊 Beräkna totalsnitt (alternativ A)
function computeTotalPercent(textStats) {
  const values = Object.values(textStats || {});
  if (!values.length) return 0;

  const sum = values.reduce((a, b) => a + b, 0);
  return Math.round(sum / values.length);
}


// 🔍 Nyckelparser (1.2_Titel)
function parseKey(key) {
  const m = key.match(/^(\d+)(?:\.(\d+))?_(.+)$/);
  if (!m) return { file: 9999, idx: 9999, title: key };
  return {
    file: Number(m[1]),
    idx: m[2] ? Number(m[2]) : 0,
    title: m[3]
  };
}


// -----------------------------------------------------
// 🔥 Ladda klasser
// -----------------------------------------------------
async function loadClasses() {
  const snap = await db.collection("readingResults").get();
  const all = snap.docs.map(d => d.data());
  const classes = [...new Set(all.map(d => d.klass))].sort((a, b) =>
    a.localeCompare(b, "sv")
  );

  classSelect.innerHTML = classes
    .map(
      c =>
        `<option value="${c}" ${c === "4E" ? "selected" : ""}>${c}</option>`
    )
    .join("");

  await loadClassResults(classSelect.value);
}

classSelect.addEventListener("change", () => loadClassResults(classSelect.value));
resetBtn.addEventListener("click", resetClassStats);

// Flik-klick: byt tab och bygg tabell från cache (ingen ny hämtning)
document.querySelectorAll(".tab").forEach((tabEl) => {
  tabEl.addEventListener("click", () => {
    const tabId = tabEl.dataset.tab;
    if (tabId === currentTab) return;
    currentTab = tabId;
    document.querySelectorAll(".tab").forEach((t) => {
      t.classList.toggle("active", t.dataset.tab === currentTab);
      t.setAttribute("aria-selected", t.dataset.tab === currentTab ? "true" : "false");
    });
    buildTable(cachedRows, currentTab);
  });
});


// -----------------------------------------------------
// 🔥 Ladda resultat för vald klass (hämtar från Firebase)
// -----------------------------------------------------
async function loadClassResults(selectedClass) {
  const snap = await db
    .collection("readingResults")
    .where("klass", "==", selectedClass)
    .get();

  cachedRows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  cachedClass = selectedClass;
  buildTable(cachedRows, currentTab);
}


// -----------------------------------------------------
// 📊 Bygg tabell från cachade rader för vald flik
// -----------------------------------------------------
function buildTable(rows, tabId) {
  tableBody.innerHTML = "";
  headerRow.innerHTML = "";

  const tabConfig = TABS.find((t) => t.id === tabId) || TABS[0];
  const statsKey = tabConfig.statsKey;
  const isOrdtest = tabConfig.isOrdtest === true;
  const isOrdjakt = tabConfig.isOrdjakt === true;

  if (!rows || !rows.length) {
    tableBody.innerHTML =
      `<tr><td class="name-col sticky">Inga elever hittades.</td></tr>`;
    updateStickyScrollbar();
    return;
  }

  if (isOrdtest) {
    buildOrdtestTable(rows);
    return;
  }

  if (isOrdjakt) {
    buildOrdjaktTable(rows);
    return;
  }

  // 1) Samla alla textnycklar för denna tab
  const allKeys = new Set();
  rows.forEach((r) => {
    const stats = r[statsKey] || {};
    Object.keys(stats).forEach((k) => allKeys.add(k));
  });

  // 2) Sortera kolumnerna
  const orderedKeys = Array.from(allKeys).sort((a, b) => {
    const A = parseKey(a);
    const B = parseKey(b);
    if (A.file !== B.file) return A.file - B.file;
    if (A.idx !== B.idx) return A.idx - B.idx;
    return A.title.localeCompare(B.title, "sv");
  });

  const colCount = Math.max(DEFAULT_TEXT_COLUMNS, orderedKeys.length);
  buildHeader(colCount, orderedKeys);

  // 3) Bygg rader
  const sortedRows = rows.slice().sort((a, b) => a.namn.localeCompare(b.namn, "sv"));

  sortedRows.forEach((r) => {
    const stats = r[statsKey] || {};
    const tr = document.createElement("tr");

    const tdName = document.createElement("td");
    tdName.className = "name-col sticky";
    const nameWrap = document.createElement("span");
    nameWrap.className = "name-cell-wrap";
    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "delete-student-btn";
    deleteBtn.title = "Radera elev från statistiken";
    deleteBtn.setAttribute("aria-label", "Radera " + r.namn);
    deleteBtn.textContent = "✕";
    deleteBtn.dataset.id = r.id;
    deleteBtn.dataset.namn = r.namn;
    nameWrap.appendChild(deleteBtn);
    nameWrap.appendChild(document.createTextNode(" " + r.namn));
    tdName.appendChild(nameWrap);
    tr.appendChild(tdName);

    const tdTotalCorrect = document.createElement("td");
    tdTotalCorrect.className = "total-correct";
    tdTotalCorrect.textContent = r.totalCorrectAnswers ?? 0;
    tr.appendChild(tdTotalCorrect);

    const percent = computeTotalPercent(stats);
    const tdTotalPercent = document.createElement("td");
    tdTotalPercent.className = "total-percent";
    tdTotalPercent.textContent = percent + "%";
    tr.appendChild(tdTotalPercent);

    for (let i = 0; i < colCount; i++) {
      const td = document.createElement("td");
      td.className = "text-col";
      const div = document.createElement("div");
      div.className = "cell";
      if (i < orderedKeys.length) {
        const key = orderedKeys[i];
        const p = stats[key];
        const title = parseKey(key).title;
        div.classList.add(cellClass(p));
        div.title = `${title}${p != null ? `: ${p}%` : ""}`;
        div.textContent = p != null ? p : "";
      } else {
        div.classList.add("gray");
      }
      td.appendChild(div);
      tr.appendChild(td);
    }

    tableBody.appendChild(tr);
  });

  updateStickyScrollbar();
  tableBody.querySelectorAll(".delete-student-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      deleteStudent(btn.dataset.id, btn.dataset.namn);
    });
  });
}

// -----------------------------------------------------
// 📊 Ordförståelse: kolumn = Omgång 1, 2, … + Pågår (rätt/gjorda)
// -----------------------------------------------------
function buildOrdtestTable(rows) {
  const attemptsList = rows.map((r) => r.ordtestAttempts || []);
  const maxAttempts = Math.max(1, ...attemptsList.map((a) => a.length));
  const hasAnyInProgress = rows.some((r) => r.ordtestInProgress && r.ordtestInProgress.currentIndex > 0);

  headerRow.innerHTML = "";
  const thName = document.createElement("th");
  thName.className = "name-col sticky";
  thName.textContent = "Elev";
  headerRow.appendChild(thName);
  for (let i = 0; i < maxAttempts; i++) {
    const th = document.createElement("th");
    th.className = "text-col";
    th.textContent = "Omgång " + (i + 1);
    headerRow.appendChild(th);
  }
  if (hasAnyInProgress) {
    const thPagar = document.createElement("th");
    thPagar.className = "text-col";
    thPagar.textContent = "Pågår";
    thPagar.title = "Rätt av gjorda (uppdateras under testet)";
    headerRow.appendChild(thPagar);
  }

  const sortedRows = rows.slice().sort((a, b) => (a.namn || "").localeCompare(b.namn || "", "sv"));
  sortedRows.forEach((r) => {
    const tr = document.createElement("tr");
    const tdName = document.createElement("td");
    tdName.className = "name-col sticky";
    const nameWrap = document.createElement("span");
    nameWrap.className = "name-cell-wrap";
    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "delete-student-btn";
    deleteBtn.title = "Radera elev från statistiken";
    deleteBtn.setAttribute("aria-label", "Radera " + r.namn);
    deleteBtn.textContent = "✕";
    deleteBtn.dataset.id = r.id;
    deleteBtn.dataset.namn = r.namn;
    nameWrap.appendChild(deleteBtn);
    nameWrap.appendChild(document.createTextNode(" " + (r.namn || "")));
    tdName.appendChild(nameWrap);
    tr.appendChild(tdName);

    const arr = r.ordtestAttempts || [];
    for (let i = 0; i < maxAttempts; i++) {
      const td = document.createElement("td");
      td.className = "text-col";
      const div = document.createElement("div");
      div.className = "cell";
      const val = arr[i];
      if (val != null) {
        const pct = Math.round((val / 100) * 100);
        div.classList.add(cellClass(pct));
        div.title = val + " av 100 rätt";
        div.textContent = val;
      } else {
        div.classList.add("gray");
      }
      td.appendChild(div);
      tr.appendChild(td);
    }

    if (hasAnyInProgress) {
      const td = document.createElement("td");
      td.className = "text-col";
      const div = document.createElement("div");
      div.className = "cell";
      const prog = r.ordtestInProgress;
      if (prog && prog.currentIndex > 0) {
        const c = prog.correctCount ?? 0;
        const n = prog.currentIndex;
        const pct = n > 0 ? Math.round((c / n) * 100) : 0;
        div.classList.add(cellClass(pct));
        div.title = c + " rätt av " + n + " gjorda";
        div.textContent = c + "/" + n;
      } else {
        div.classList.add("gray");
      }
      td.appendChild(div);
      tr.appendChild(td);
    }

    tableBody.appendChild(tr);
  });

  updateStickyScrollbar();
  tableBody.querySelectorAll(".delete-student-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      deleteStudent(btn.dataset.id, btn.dataset.namn);
    });
  });
}


// -----------------------------------------------------
// 📊 Ordjakt: upplåsta nivåer, bästa tid per nivå, minuttest-rekord
// -----------------------------------------------------
function formatOrdjaktTime(sec) {
  if (sec == null || Number.isNaN(Number(sec))) return "—";
  const s = Math.floor(Number(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

function buildOrdjaktTable(rows) {
  headerRow.innerHTML = "";

  const thName = document.createElement("th");
  thName.className = "name-col sticky";
  thName.textContent = "Elev";
  headerRow.appendChild(thName);

  const thUnlock = document.createElement("th");
  thUnlock.className = "text-col";
  thUnlock.textContent = "Upplåst";
  thUnlock.title = "Högsta nivå eleven kan välja (1 = bara nivå 1; 8 = alla sju)";
  headerRow.appendChild(thUnlock);

  for (let lv = 1; lv <= 7; lv++) {
    const th = document.createElement("th");
    th.className = "text-col";
    th.textContent = "Nivå " + lv;
    th.title = "Bästa tid vid godkänt lopp (mål 2:30)";
    headerRow.appendChild(th);
  }

  const thMin = document.createElement("th");
  thMin.className = "text-col";
  thMin.textContent = "Minuttest";
  thMin.title = "Rekord: flest ord rätt på 1 minut";
  headerRow.appendChild(thMin);

  const sortedRows = rows.slice().sort((a, b) => (a.namn || "").localeCompare(b.namn || "", "sv"));

  sortedRows.forEach((r) => {
    const o = r.ordjakt && typeof r.ordjakt === "object" ? r.ordjakt : {};
    const unlocked = Math.max(1, Number(o.unlockedLevel) || 1);
    const levelStats = o.levelStats && typeof o.levelStats === "object" ? o.levelStats : {};

    const tr = document.createElement("tr");

    const tdName = document.createElement("td");
    tdName.className = "name-col sticky";
    const nameWrap = document.createElement("span");
    nameWrap.className = "name-cell-wrap";
    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "delete-student-btn";
    deleteBtn.title = "Radera elev från statistiken";
    deleteBtn.setAttribute("aria-label", "Radera " + r.namn);
    deleteBtn.textContent = "✕";
    deleteBtn.dataset.id = r.id;
    deleteBtn.dataset.namn = r.namn;
    nameWrap.appendChild(deleteBtn);
    nameWrap.appendChild(document.createTextNode(" " + (r.namn || "")));
    tdName.appendChild(nameWrap);
    tr.appendChild(tdName);

    const tdUnlock = document.createElement("td");
    tdUnlock.className = "text-col";
    const divUnlock = document.createElement("div");
    divUnlock.className = "cell";
    divUnlock.textContent = unlocked >= 8 ? "1–7" : String(unlocked);
    divUnlock.title =
      unlocked >= 8
        ? "Alla ordinarie nivåer upplåsta"
        : `Kan spela nivå 1–${Math.min(7, unlocked)}`;
    divUnlock.classList.add(unlocked >= 2 ? "green" : "yellow");
    tdUnlock.appendChild(divUnlock);
    tr.appendChild(tdUnlock);

    for (let lv = 1; lv <= 7; lv++) {
      const st = levelStats[String(lv)] || levelStats[lv] || {};
      const best = st.bestTimeSeconds;
      const attempts = Number(st.attempts) || 0;
      const passed = Boolean(st.passed);
      const last = st.lastPlayedAt;

      const td = document.createElement("td");
      td.className = "text-col";
      const div = document.createElement("div");
      div.className = "cell";
      if (best != null) {
        const ok = Number(best) <= ORDJAKT_TARGET_SEC;
        div.classList.add(ok ? "green" : "yellow");
        div.textContent = formatOrdjaktTime(best);
      } else if (attempts > 0) {
        div.classList.add("yellow");
        div.textContent = "Övat";
      } else {
        div.classList.add("gray");
        div.textContent = "";
      }
      const parts = [];
      if (attempts) parts.push(`${attempts} försök`);
      if (passed) parts.push("klar");
      if (last) parts.push("senast " + String(last).slice(0, 10));
      div.title = parts.length ? parts.join(" · ") : "Ej spelat";
      td.appendChild(div);
      tr.appendChild(td);
    }

    const mt = levelStats.minuttest || levelStats["minuttest"] || {};
    const bestG = mt.bestGreenCount != null ? Number(mt.bestGreenCount) : null;
    const mtAttempts = Number(mt.attempts) || 0;

    const tdMt = document.createElement("td");
    tdMt.className = "text-col";
    const divMt = document.createElement("div");
    divMt.className = "cell";
    if (bestG != null && !Number.isNaN(bestG)) {
      const pct = Math.min(100, Math.round((bestG / 150) * 100));
      divMt.classList.add(cellClass(pct));
      divMt.textContent = `${bestG} rätt`;
      divMt.title =
        (mtAttempts ? `${mtAttempts} försök` : "1+ försök") +
        (mt.lastPlayedAt ? " · senast " + String(mt.lastPlayedAt).slice(0, 10) : "");
    } else if (mtAttempts > 0) {
      divMt.classList.add("yellow");
      divMt.textContent = "—";
      divMt.title = `${mtAttempts} försök (inget rekord sparat)`;
    } else {
      divMt.classList.add("gray");
      divMt.textContent = "";
      divMt.title = "Ej spelat";
    }
    tdMt.appendChild(divMt);
    tr.appendChild(tdMt);

    tableBody.appendChild(tr);
  });

  updateStickyScrollbar();
  tableBody.querySelectorAll(".delete-student-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      deleteStudent(btn.dataset.id, btn.dataset.namn);
    });
  });
}


// -----------------------------------------------------
// 🗑️ Radera elev från Firebase (och från statistiken)
// -----------------------------------------------------
async function deleteStudent(docId, namn) {
  if (!docId) return;
  const msg = namn
    ? `Ta bort "${namn}" från statistiken? Detta kan inte ångras.`
    : "Ta bort denna elev från statistiken? Detta kan inte ångras.";
  if (!confirm(msg)) return;

  try {
    await db.collection("readingResults").doc(docId).delete();
    loadClassResults(classSelect.value);
  } catch (err) {
    console.error(err);
    alert("Kunde inte radera: " + (err.message || err));
  }
}


// -----------------------------------------------------
// 📌 Bygg header
// -----------------------------------------------------
function buildHeader(colCount, orderedKeys) {
  headerRow.innerHTML = "";

  const thName = document.createElement("th");
  thName.className = "name-col sticky";
  thName.textContent = "Elev";
  headerRow.appendChild(thName);

  const thTotCorr = document.createElement("th");
  thTotCorr.className = "total-correct";
  thTotCorr.textContent = "Totalt rätt";
  headerRow.appendChild(thTotCorr);

  const thTotPct = document.createElement("th");
  thTotPct.className = "total-percent";
  thTotPct.textContent = "Total %";
  headerRow.appendChild(thTotPct);

  for (let i = 0; i < colCount; i++) {
    const th = document.createElement("th");
    th.className = "text-col";
    th.textContent = i + 1;
    if (i < orderedKeys.length) {
      const title = parseKey(orderedKeys[i]).title;
      th.title = title;
    }
    headerRow.appendChild(th);
  }
}


// -----------------------------------------------------
// 📌 Justera sticky scrollbar-bredd
// -----------------------------------------------------
function updateStickyScrollbar() {
  stickyScroll.innerHTML = `<div style="width:${tableScroll.scrollWidth}px; height:1px;"></div>`;
}


// -----------------------------------------------------
// 🔁 Nollställ statistik
// -----------------------------------------------------
async function resetClassStats() {
  const selectedClass = classSelect.value;
  if (!selectedClass) {
    alert("Välj en klass först.");
    return;
  }

  const pwd = prompt("Lösenord för att nollställa statistiken:");
  if (!pwd) return;
  if (pwd !== "arnesson") {
    alert("Fel lösenord.");
    return;
  }

  const sure = confirm("Vill du verkligen nollställa all statistik?");
  if (!sure) return;

  const snap = await db
    .collection("readingResults")
    .where("klass", "==", selectedClass)
    .get();

  const batch = db.batch();

  snap.forEach(doc => {
    batch.update(doc.ref, {
      poang: 0,
      coins: 0,
      totalCorrectAnswers: 0,
      textStats: {},
      texter: 0,
      currentTextIndex: 0,
      currentQuestionIndex: 0,
      textsFileIndex: 1,
      senaste: null
    });
  });

  await batch.commit();
  alert("Statistik nollställd.");
  loadClassResults(selectedClass);
}


// 🚀 Starta
loadClasses();
