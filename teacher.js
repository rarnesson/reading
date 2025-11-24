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

const classSelect = document.getElementById("classSelect");
const tableBody = document.getElementById("tableBody");
const headerRow = document.getElementById("headerRow");
const resetBtn = document.getElementById("resetBtn");

const DEFAULT_TEXT_COLUMNS = 30;

function cellClass(p) {
  if (p === undefined || p === null) return "gray";
  if (p >= 80) return "green";
  if (p >= 60) return "yellow";
  return "red";
}

function calcTotal(textStats) {
  const vals = Object.values(textStats || {});
  const totalTexts = vals.length;
  const avg = totalTexts ? Math.round(vals.reduce((a, b) => a + b, 0) / totalTexts) : 0;
  const passed = vals.filter(v => v >= 60).length;
  return { totalTexts, avg, passed };
}

// --- parse "file.textIndex_Title" ELLER "file_Title"
function parseKey(key) {
  // fångar 12.3_Titel  eller  12_Titel
  const m = key.match(/^(\d+)(?:\.(\d+))?_(.+)$/);
  if (!m) return { file: 9999, idx: 9999, title: key };
  return { file: +m[1], idx: m[2] ? +m[2] : null, title: m[3] };
}

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

async function loadClassResults(selectedClass) {
  tableBody.innerHTML = "";
  buildHeader([]); // clear

  const snap = await db
    .collection("readingResults")
    .where("klass", "==", selectedClass)
    .get();
  const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  if (!rows.length) {
    tableBody.innerHTML = `<tr><td class="name-col sticky">Inga elever hittades.</td></tr>`;
    return;
  }

  // 1) Samla alla nycklar (unika texter)
  const allKeys = new Set();
  rows.forEach(r =>
    Object.keys(r.textStats || {}).forEach(k => allKeys.add(k))
  );

  // 2) Sortera nycklar stabilt: (file asc, idx asc om finns annars titel asc)
  const orderedKeys = Array.from(allKeys).sort((a, b) => {
    const A = parseKey(a),
      B = parseKey(b);
    if (A.file !== B.file) return A.file - B.file;
    if (A.idx !== null && B.idx !== null && A.idx !== B.idx)
      return A.idx - B.idx;
    if (A.idx !== null && B.idx === null) return -1;
    if (A.idx === null && B.idx !== null) return 1;
    return A.title.localeCompare(B.title, "sv");
  });

  // 3) Bestäm kolumnantal (fyll ut till DEFAULT om färre)
  const colCount = Math.max(DEFAULT_TEXT_COLUMNS, orderedKeys.length);
  buildHeader(
    // siffror i headern
    new Array(colCount).fill(0).map((_, i) => i + 1),
    // tooltips per kolumn (title)
    orderedKeys.map(k => parseKey(k).title)
  );

  // 4) Bygg rader
  rows.sort((a, b) => a.namn.localeCompare(b.namn, "sv"));
  tableBody.innerHTML = "";

  rows.forEach(r => {
    const tr = document.createElement("tr");

    // Namn (sticky)
    const tdName = document.createElement("td");
    tdName.className = "name-col sticky";
    tdName.textContent = r.namn || r.id;
    tr.appendChild(tdName);

    // Totalt
    const totals = calcTotal(r.textStats || {});
    const tdTotal = document.createElement("td");
    tdTotal.className = "total-col";
    tdTotal.textContent = `${totals.passed}/${totals.totalTexts} (${totals.avg}%)`;
    tr.appendChild(tdTotal);

    // Textceller enligt orderedKeys; fyll ut grå
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
        div.title = `${title}${p != null ? `: ${Math.round(p)}%` : ""}`;
        div.textContent = p != null ? Math.round(p) : "";
      } else {
        div.classList.add("gray");
        div.title = "Ej gjort";
        div.textContent = "";
      }

      td.appendChild(div);
      tr.appendChild(td);
    }

    tableBody.appendChild(tr);
  });
}

// Header: [Elev] [Totalt rätt] [1][2][3]...
function buildHeader(numbers, tooltips = []) {
  headerRow.innerHTML = "";

  const thName = document.createElement("th");
  thName.className = "name-col sticky";
  thName.textContent = "Elev";
  headerRow.appendChild(thName);

  const thTotal = document.createElement("th");
  thTotal.className = "total-col";
  thTotal.textContent = "Totalt rätt";
  headerRow.appendChild(thTotal);

  numbers =
    numbers.length
      ? numbers
      : new Array(DEFAULT_TEXT_COLUMNS).fill(0).map((_, i) => i + 1);

  numbers.forEach((n, i) => {
    const th = document.createElement("th");
    th.className = "text-col";
    th.textContent = n;
    if (tooltips[i]) th.title = tooltips[i];
    headerRow.appendChild(th);
  });
}

// 🔁 Nollställ statistik för vald klass (lösenord: "arnesson")
async function resetClassStats() {
  const selectedClass = classSelect.value;
  if (!selectedClass) {
    alert("Välj en klass först.");
    return;
  }

  const pwd = prompt("Lösenord för att nollställa statistiken:");
  if (pwd === null) return; // avbröt
  if (pwd !== "arnesson") {
    alert("Fel lösenord.");
    return;
  }

  const sure = confirm(
    `Är du säker på att du vill nollställa all statistik för klassen ${selectedClass}? ` +
    `Detta går inte att ångra.`
  );
  if (!sure) return;

  try {
    const snap = await db
      .collection("readingResults")
      .where("klass", "==", selectedClass)
      .get();

    if (snap.empty) {
      alert("Inga elever hittades för den här klassen.");
      return;
    }

    const batch = db.batch();

    snap.forEach(doc => {
      batch.update(doc.ref, {
        poang: 0,
        texter: 0,
        textStats: {},
        currentTextIndex: 0,
        currentQuestionIndex: 0,
        textsFileIndex: 1,
        senaste: null
      });
    });

    await batch.commit();

    alert(`Statistiken för ${selectedClass} är nollställd.`);
    await loadClassResults(selectedClass);
  } catch (err) {
    console.error("Fel vid nollställning:", err);
    alert("Något gick fel när statistiken skulle nollställas.");
  }
}

loadClasses();
