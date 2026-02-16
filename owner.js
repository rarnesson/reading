// 🔥 Firebase (init i firebase-config.js)
const db = firebase.firestore();
  
  const classFilter = document.getElementById("classFilter");
  const pendingBody = document.getElementById("pendingBody");
  const historyBody = document.getElementById("historyBody");
  const refreshBtn = document.getElementById("refreshBtn");
  
  let unsubscribePending = null;
  let unsubscribeHistory = null;
  let currentClass = "ALL";
  
  // 🧭 Init
  loadClassOptions().then(() => {
    subscribePending();
    subscribeHistory();
  });
  
  classFilter.addEventListener("change", () => {
    currentClass = classFilter.value;
    subscribePending();
    subscribeHistory();
  });
  
  refreshBtn.addEventListener("click", () => {
    subscribePending();
    subscribeHistory();
  });
  
  // ⚙️ Hämta alla klasser som har gjort köp
  async function loadClassOptions() {
    const snap = await db.collection("readingPurchases").get();
    const classes = new Set();
  
    snap.forEach((doc) => {
      const data = doc.data();
      if (data.klass) classes.add(data.klass);
    });
  
    const sorted = Array.from(classes).sort((a, b) => a.localeCompare(b, "sv"));
    sorted.forEach((k) => {
      const opt = document.createElement("option");
      opt.value = k;
      opt.textContent = k;
      classFilter.appendChild(opt);
    });
  }
  
  // 👂 Lyssna på ej utdelade köp
  function subscribePending() {
    if (unsubscribePending) {
      unsubscribePending();
      unsubscribePending = null;
    }
  
    let ref = db.collection("readingPurchases").where("utdelad", "==", false);
  
    if (currentClass !== "ALL") {
      ref = ref.where("klass", "==", currentClass);
    }
  
    unsubscribePending = ref.onSnapshot(
      (snap) => {
        renderPending(snap.docs);
      },
      (err) => {
        console.error("Fel vid lyssning på pending purchases:", err);
      }
    );
  }
  
  // 👂 Lyssna på utdelade köp (historik)
  function subscribeHistory() {
    if (unsubscribeHistory) {
      unsubscribeHistory();
      unsubscribeHistory = null;
    }
  
    let ref = db.collection("readingPurchases").where("utdelad", "==", true);
  
    if (currentClass !== "ALL") {
      ref = ref.where("klass", "==", currentClass);
    }
  
    unsubscribeHistory = ref.onSnapshot(
      (snap) => {
        // Sortera klient-sida: nyast utdelad först
        const docs = [...snap.docs];
        docs.sort((a, b) => {
          const ad = a.data();
          const bd = b.data();
          const aTime = ad.utdeladTid || ad.timestamp || "";
          const bTime = bd.utdeladTid || bd.timestamp || "";
          return bTime.localeCompare(aTime);
        });
        renderHistory(docs);
      },
      (err) => {
        console.error("Fel vid lyssning på history purchases:", err);
      }
    );
  }
  
  // 🖼️ Visa ej utdelade köp
  function renderPending(docs) {
    pendingBody.innerHTML = "";
  
    if (!docs.length) {
      const tr = document.createElement("tr");
      tr.className = "owner-empty-row";
      const td = document.createElement("td");
      td.colSpan = 6;
      td.textContent = "Inga köp att dela ut just nu.";
      tr.appendChild(td);
      pendingBody.appendChild(tr);
      return;
    }
  
    docs.forEach((doc) => {
      const data = doc.data();
      const tr = document.createElement("tr");
  
      // Elev
      const tdName = document.createElement("td");
      tdName.textContent = data.namn || data.elevId || "-";
      tr.appendChild(tdName);
  
      // Klass
      const tdClass = document.createElement("td");
      tdClass.textContent = data.klass || "-";
      tr.appendChild(tdClass);
  
      // Vara
      const tdItem = document.createElement("td");
      tdItem.textContent = data.itemName || data.itemId || "-";
      tr.appendChild(tdItem);
  
      // Pris
      const tdPrice = document.createElement("td");
      tdPrice.textContent = typeof data.pris === "number" ? data.pris : "-";
      tr.appendChild(tdPrice);
  
      // Köptid
      const tdTime = document.createElement("td");
      tdTime.textContent = formatTimestamp(data.timestamp);
      tr.appendChild(tdTime);
  
      // Utdelad-knapp
      const tdAction = document.createElement("td");
      const btn = document.createElement("button");
      btn.className = "mark-btn";
      btn.textContent = "Utdelad ✅";
      btn.onclick = () => markAsDelivered(doc.id, btn);
      tdAction.appendChild(btn);
      tr.appendChild(tdAction);
  
      pendingBody.appendChild(tr);
    });
  }
  
  // 🖼️ Visa historik (utdelade köp)
  function renderHistory(docs) {
    historyBody.innerHTML = "";
  
    if (!docs.length) {
      const tr = document.createElement("tr");
      tr.className = "owner-empty-row";
      const td = document.createElement("td");
      td.colSpan = 6;
      td.textContent = "Ingen historik ännu.";
      tr.appendChild(td);
      historyBody.appendChild(tr);
      return;
    }
  
    docs.forEach((doc) => {
      const data = doc.data();
      const tr = document.createElement("tr");
  
      // Elev
      const tdName = document.createElement("td");
      tdName.textContent = data.namn || data.elevId || "-";
      tr.appendChild(tdName);
  
      // Klass
      const tdClass = document.createElement("td");
      tdClass.textContent = data.klass || "-";
      tr.appendChild(tdClass);
  
      // Vara
      const tdItem = document.createElement("td");
      tdItem.textContent = data.itemName || data.itemId || "-";
      tr.appendChild(tdItem);
  
      // Pris
      const tdPrice = document.createElement("td");
      tdPrice.textContent = typeof data.pris === "number" ? data.pris : "-";
      tr.appendChild(tdPrice);
  
      // Köptid
      const tdBuyTime = document.createElement("td");
      tdBuyTime.textContent = formatTimestamp(data.timestamp);
      tr.appendChild(tdBuyTime);
  
      // Utdelad tid
      const tdDeliveredTime = document.createElement("td");
      tdDeliveredTime.textContent = formatTimestamp(data.utdeladTid);
      tr.appendChild(tdDeliveredTime);
  
      historyBody.appendChild(tr);
    });
  }
  
  // ⏰ Format tid (ISO-string → yyyy-mm-dd hh:mm)
  function formatTimestamp(ts) {
    if (!ts) return "-";
    try {
      const d = new Date(ts);
      if (isNaN(d.getTime())) return "-";
  
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const hh = String(d.getHours()).padStart(2, "0");
      const min = String(d.getMinutes()).padStart(2, "0");
  
      return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
    } catch {
      return "-";
    }
  }
  
  // ✅ Markera som utdelad
  async function markAsDelivered(docId, button) {
    const ok = confirm("Markera denna belöning som utdelad?");
    if (!ok) return;
  
    button.disabled = true;
  
    try {
      const ref = db.collection("readingPurchases").doc(docId);
      await ref.update({
        utdelad: true,
        utdeladTid: new Date().toISOString()
      });
      // onSnapshot uppdaterar vyn automatiskt
    } catch (err) {
      console.error("Kunde inte markera som utdelad:", err);
      alert("Något gick fel. Försök igen.");
      button.disabled = false;
    }
  }
  