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
  { id: "ordforstaelse", label: "Ordförståelse", statsKey: "ordtestAttempts", isOrdtest: true }
];
let currentTab = "normal";
let cachedRows = [];
let cachedClass = "";

// Hur många kolumner max (siffror)
const DEFAULT_TEXT_COLUMNS = 40;


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
// 📊 Ordförståelse: kolumn = Omgång 1, 2, … cell = antal rätt
// -----------------------------------------------------
function buildOrdtestTable(rows) {
  const attemptsList = rows.map((r) => r.ordtestAttempts || []);
  const maxAttempts = Math.max(1, ...attemptsList.map((a) => a.length));

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
