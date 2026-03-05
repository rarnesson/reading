// 🔥 Firebase (init i firebase-config.js)
const db = firebase.firestore();

// --- DOM ---
const classSelect = document.getElementById("classSelect");
const tableBody = document.getElementById("tableBody");
const headerRow = document.getElementById("headerRow");
const resetBtn = document.getElementById("resetBtn");

const tableScroll = document.getElementById("tableScroll");
const stickyScroll = document.getElementById("stickyScroll");


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


// -----------------------------------------------------
// 🔥 Ladda resultat för vald klass
// -----------------------------------------------------
async function loadClassResults(selectedClass) {
  tableBody.innerHTML = "";
  headerRow.innerHTML = "";

  const snap = await db
    .collection("readingResults")
    .where("klass", "==", selectedClass)
    .get();

  const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  if (!rows.length) {
    tableBody.innerHTML =
      `<tr><td class="name-col sticky">Inga elever hittades.</td></tr>`;
    return;
  }

  // ---------------------
  // 1) Samla alla textnycklar
  // ---------------------
  const allKeys = new Set();
  rows.forEach(r => {
    Object.keys(r.textStats || {}).forEach(k => allKeys.add(k));
  });

  // ---------------------
  // 2) Sortera kolumnerna
  // ---------------------
  const orderedKeys = Array.from(allKeys).sort((a, b) => {
    const A = parseKey(a);
    const B = parseKey(b);

    if (A.file !== B.file) return A.file - B.file;
    if (A.idx !== B.idx) return A.idx - B.idx;

    return A.title.localeCompare(B.title, "sv");
  });

  // ---------------------
  // 3) Begränsa kolumnantal
  // ---------------------
  const colCount = Math.max(DEFAULT_TEXT_COLUMNS, orderedKeys.length);

  buildHeader(colCount, orderedKeys);

  // ---------------------
  // 4) Bygg rader
  // ---------------------
  rows.sort((a, b) => a.namn.localeCompare(b.namn, "sv"));

  tableBody.innerHTML = "";

  rows.forEach(r => {
    const tr = document.createElement("tr");

    // 📌 1) Elev
    const tdName = document.createElement("td");
    tdName.className = "name-col sticky";
    tdName.textContent = r.namn;
    tr.appendChild(tdName);

    // 📌 2) TOTAL RÄTT (hämtas direkt)
    const tdTotalCorrect = document.createElement("td");
    tdTotalCorrect.className = "total-correct";
    tdTotalCorrect.textContent = r.totalCorrectAnswers ?? 0;
    tr.appendChild(tdTotalCorrect);

    // 📌 3) TOTAL SNITTPROCENT
    const percent = computeTotalPercent(r.textStats || {});
    const tdTotalPercent = document.createElement("td");
    tdTotalPercent.className = "total-percent";
    tdTotalPercent.textContent = percent + "%";
    tr.appendChild(tdTotalPercent);

    // 📌 4) TEXTKOLUMNER
    for (let i = 0; i < colCount; i++) {
      const td = document.createElement("td");
      td.className = "text-col";

      const div = document.createElement("div");
      div.className = "cell";

      if (i < orderedKeys.length) {
        const key = orderedKeys[i];
        const p = r.textStats?.[key];
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

  // efter render → gör sticky scrollbar lika bred
  updateStickyScrollbar();
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
