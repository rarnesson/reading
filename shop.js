// 🔥 Firebase (init i firebase-config.js)
const db = firebase.firestore();
  
  // 👤 Hämta elevinfo
  const name = localStorage.getItem("reading_name");
  const klass = localStorage.getItem("reading_class");
  if (!name || !klass) {
    window.location.href = "index.html";
  }
  const elevId = `${klass}_${name.trim().toLowerCase().replace(/\s+/g, "_")}`;
  
  // DOM-element
  const studentNameEl = document.getElementById("studentName");
  const studentClassEl = document.getElementById("studentClass");
  const studentPointsEl = document.getElementById("studentPoints");
  const classPointsEl = document.getElementById("classPoints");
  const progressFillEl = document.getElementById("progressFill");
  const nextGoalTextEl = document.getElementById("nextGoalText");
  const itemsContainer = document.getElementById("itemsContainer");
  const shopMessageEl = document.getElementById("shopMessage");
  
  // Lokalt tillstånd
  let currentPoints = 0;
  let currentClassPoints = 0;
  
  // 🎯 Klassmål
  const GOAL1 = 3000;  // Minecraft/Roblox-lektion
  const GOAL2 = 7000; // Fika
  const GOAL3 = 10000; // Spel-lektion
  
  // 🛍️ Produkter
  const items = [
    {
      id: "klistermarke",
      name: "Klistermärke",
      price: 15,
      icon: "⭐",
      desc: "Välj ett fint klistermärke av Rasmus."
    },
    {
      id: "klubba",
      name: "Klubba",
      price: 100,
      icon: "🍭",
      desc: "En god klubba som belöning för ditt arbete."
    },
    {
      id: "springa_varvet",
      name: "Springa runt skolan",
      price: 50,
      icon: "🏃‍♂️",
      desc: "Ta ett varv runt skolan."
    },
    {
      id: "sitt_var_du_vill",
      name: "Sitt var du vill (1 lektion)",
      price: 50,
      icon: "🪑",
      desc: "Välj valfri plats i klassrummet under en lektion."
    },
    {
      id: "spela_en_lat",
      name: "Spela upp en låt",
      price: 100,
      icon: "🎵",
      desc: "Välj en passande låt att spela i klassrummet (Rasmus godkänner)."
    },
    {
      id: "chokladboll",
      name: "Chokladboll",
      price: 200,
      icon: "🍫",
      desc: "En god chokladboll som belöning."
    }
  ];
  
  // Init
  studentNameEl.textContent = name;
  studentClassEl.textContent = `Klass ${klass}`;
  
  // 🚀 Start
  loadStudentPoints();
  loadClassPoints();
  renderItems();
  
  // 💰 Hämta elevens poäng (coins = valuta i affären; poang = äldre data)
  async function loadStudentPoints() {
    try {
      const ref = db.collection("readingResults").doc(elevId);
      const snap = await ref.get();
      if (snap.exists) {
        const data = snap.data();
        currentPoints = (typeof data.coins === "number" ? data.coins : data.poang) ?? 0;
      } else {
        currentPoints = 0;
      }
      updatePointsUI();
    } catch (err) {
      console.error("Kunde inte hämta poäng:", err);
    }
  }
  
  // 🏫 Hämta/lyssna på klassens poäng
  function loadClassPoints() {
    const ref = db.collection("readingClassTotals").doc(klass);
  
    // Skapa dokument om det saknas
    ref.get().then((doc) => {
      if (!doc.exists) {
        ref.set({
          totalPoang: 0,
          mal: 5000
        }, { merge: true });
      }
    });
  
    ref.onSnapshot((doc) => {
      if (doc.exists) {
        const data = doc.data();
        currentClassPoints = typeof data.totalPoang === "number" ? data.totalPoang : 0;
      } else {
        currentClassPoints = 0;
      }
      updateClassUI();
    });
  }
  
  // 🔃 Uppdatera elev-UI
  function updatePointsUI() {
    studentPointsEl.textContent = currentPoints;
    updateBuyButtons();
  }
  
  // 🔃 Uppdatera klass-UI
  function updateClassUI() {
    classPointsEl.textContent = currentClassPoints;
  
    let pct = 0;
  
    pct = (currentClassPoints / GOAL3) * 100;
    pct = Math.max(0, Math.min(100, pct));
    progressFillEl.style.width = pct + "%";
  
    if (currentClassPoints < GOAL1) {
      nextGoalTextEl.textContent =
        `Nästa mål: Minecraft/Roblox-lektion vid ${GOAL1} poäng – bara ${GOAL1 - currentClassPoints} kvar!`;
    } else if (currentClassPoints < GOAL2) {
      nextGoalTextEl.textContent =
        `Ni har nått Roblox/Minecraft-målet! Nästa mål: Fika vid ${GOAL2} poäng – ${GOAL2 - currentClassPoints} kvar.`;
    } else if (currentClassPoints < GOAL3) {
      nextGoalTextEl.textContent =
        `Ni har nått Fika-målet! Nästa mål: Spel-lektion vid ${GOAL3} poäng – ${GOAL3 - currentClassPoints} kvar.`;
    } else {
      nextGoalTextEl.textContent = "Alla mål är nådda! 🎉";
    }
  }
  
  
  // 🧱 Bygg produktkort
  function renderItems() {
    itemsContainer.innerHTML = "";
  
    items.forEach((item) => {
      const card = document.createElement("div");
      card.className = "item-card";
  
      const icon = document.createElement("div");
      icon.className = "item-icon";
      icon.textContent = item.icon;
  
      const title = document.createElement("div");
      title.className = "item-title";
      title.textContent = item.name;
  
      const desc = document.createElement("div");
      desc.className = "item-desc";
      desc.textContent = item.desc;
  
      const price = document.createElement("div");
      price.className = "item-price";
      price.textContent = `${item.price} poäng`;
  
      const actions = document.createElement("div");
      actions.className = "item-actions";
  
      const buyBtn = document.createElement("button");
      buyBtn.className = "buy-btn";
      buyBtn.textContent = "Köp";
      buyBtn.dataset.itemId = item.id;
  
      buyBtn.onclick = () => handleBuy(item, buyBtn);
  
      actions.appendChild(buyBtn);
  
      card.appendChild(icon);
      card.appendChild(title);
      card.appendChild(desc);
      card.appendChild(price);
      card.appendChild(actions);
  
      itemsContainer.appendChild(card);
    });
  
    updateBuyButtons();
  }
  
  // 🔒 Aktivera/inaktivera köpknappar beroende på poäng
  function updateBuyButtons() {
    const buttons = itemsContainer.querySelectorAll(".buy-btn");
    buttons.forEach((btn) => {
      const itemId = btn.dataset.itemId;
      const item = items.find((i) => i.id === itemId);
      if (!item) return;
      btn.disabled = currentPoints < item.price;
    });
  }
  
  // 🛒 Hantera köp
  async function handleBuy(item, button) {
    clearMessage();
  
    if (currentPoints < item.price) {
      showMessage("Du har inte tillräckligt med poäng för det här köpet.", true);
      return;
    }
  
    const ok = confirm(`Köpa "${item.name}" för ${item.price} poäng?`);
    if (!ok) return;
  
    button.disabled = true;
  
    try {
      // 1) Dra poäng i transaction
      const elevRef = db.collection("readingResults").doc(elevId);
  
      await db.runTransaction(async (t) => {
        const snap = await t.get(elevRef);
        const data = snap.exists ? snap.data() : {};
        const current = (typeof data.coins === "number" ? data.coins : data.poang) ?? 0;

        if (current < item.price) {
          throw new Error("not_enough_points");
        }

        t.update(elevRef, {
          coins: current - item.price
        });

        currentPoints = current - item.price;
      });
  
      // 2) Logga köpet till readingPurchases
      await db.collection("readingPurchases").add({
        elevId,
        namn: name,
        klass,
        itemId: item.id,
        itemName: item.name,
        pris: item.price,
        timestamp: new Date().toISOString(),
        utdelad: false
      });
  
      updatePointsUI();
      showMessage(`Du köpte: ${item.name}! Säg till Rasmus så att du får din belöning.`, false);
    } catch (err) {
      console.error("Fel vid köp:", err);
      if (err.message === "not_enough_points") {
        showMessage("Du har inte längre tillräckligt med poäng för det här köpet.", true);
      } else {
        showMessage("Ett fel uppstod vid köpet. Försök igen eller säg till Rasmus.", true);
      }
    } finally {
      updateBuyButtons();
    }
  }
  
  // 💬 Meddelanden nederst på sidan
  function showMessage(text, isError = false) {
    if (!shopMessageEl) return;
    shopMessageEl.textContent = text;
    shopMessageEl.style.color = isError ? "#b91c1c" : "#166534";
  }
  
  function clearMessage() {
    if (!shopMessageEl) return;
    shopMessageEl.textContent = "";
  }
  