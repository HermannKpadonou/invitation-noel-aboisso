/* =========================================================
   Éclairer le Monde — Noël à Aboisso · script principal
   ========================================================= */

/* ---------- CONFIG (modifiable facilement) ---------- */
const CONFIG = {
  eventStart: "2026-12-24T10:00:00+00:00", // Aboisso = UTC+0
  eventEnd:   "2026-12-24T15:00:00+00:00",
  rsvpDeadline: "2026-12-12",
  eventName: "Grand Noël des Enfants & Familles — Éclairer le Monde",
  place: "Salle des fêtes de la mairie d'Aboisso, Côte d'Ivoire",
  // Numéro WhatsApp du contact (format international sans +) :
  contactPhone: "2250574152955",
};

/* ---------- Utilitaires partagés (assets/shared.js avec repli autonome) ---------- */
const ELW = window.ELW || {};
const $ = ELW.$ || ((sel, root = document) => root.querySelector(sel));
const pad = ELW.pad || ((n) => String(n).padStart(2, "0"));
const normalizePhone = ELW.normalizePhone || function (t) {
  const p = String(t || "").replace(/\D/g, "");
  if (!p) return "";
  if (p.startsWith("225")) return p;
  if (p.startsWith("0")) return "225" + p;
  if (p.length === 8) return "225" + p;
  return p;
};
const invKey = ELW.normKey || ((s) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, ""));
const telKey = ELW.telKey || ((s) => String(s || "").replace(/\D/g, ""));
const escapeHTML = ELW.escapeHTML || function (s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
};
const toast = ELW.toast || function (msg) {
  const t = $("#toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove("show"), 3200);
};
const drawRoundRect = ELW.drawRoundRect || function (x, px, py, w, h, r) {
  x.beginPath();
  x.moveTo(px + r, py);
  x.arcTo(px + w, py, px + w, py + h, r);
  x.arcTo(px + w, py + h, x, y + h, r);
  x.arcTo(px, y + h, px, py, r);
  x.arcTo(px, py, px + w, py, r);
  x.closePath();
};
const playChime = ELW.playChime || (() => {});
const isReducedMotion = ELW.isReducedMotion || (() => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

/* ---------- Enregistrement du Service Worker (Mode PWA & Billet Hors-Ligne) ---------- */
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

/* ---------- Bascule d'Ambiance « Aurore Douce ☀️ / Nuit de Bethléem 🌙 » ---------- */
(function initTheme() {
  const THEME_KEY = "noel-aboisso-theme";
  const html = document.documentElement;
  const metaTheme = $("#meta-theme-color");

  function applyTheme(mode) {
    const isNight = mode === "night";
    if (isNight) html.setAttribute("data-theme", "night");
    else html.removeAttribute("data-theme");
    if (metaTheme) metaTheme.setAttribute("content", isNight ? "#17050B" : "#FDF9FA");

    const icon = isNight ? "☀️" : "🌙";
    const label = isNight ? "Aurore Douce" : "Nuit de Bethléem";
    if ($("#tt-icon")) $("#tt-icon").textContent = icon;
    if ($("#tt-label")) $("#tt-label").textContent = label;
    if ($("#ht-icon")) $("#ht-icon").textContent = icon;
    if ($("#ht-text")) $("#ht-text").textContent = isNight ? "Mode Aurore Douce" : "Mode Nuit de Bethléem";
  }

  let current = "day";
  try {
    current = localStorage.getItem(THEME_KEY) || "day";
  } catch {}
  applyTheme(current);

  function toggle() {
    current = current === "night" ? "day" : "night";
    try { localStorage.setItem(THEME_KEY, current); } catch {}
    applyTheme(current);
    toast(current === "night" ? "🌙 Ambiance Nuit Étoilée de Bethléem activée ✨" : "☀️ Ambiance Aurore Douce activée ✨");
  }

  $("#theme-toggle")?.addEventListener("click", toggle);
  $("#hero-theme-btn")?.addEventListener("click", toggle);
})();

/* ---------- Playlist de cantiques de Noël ----------
   Fichiers dans Playlists/ — lecture aléatoire par défaut,
   le visiteur peut changer de chant dans le lecteur. */
const PLAYLIST = [
  { src: "Playlists/01-au-loin-dans-letable-accompagnement.mp3", title: "Au loin, dans l'étable (accompagnement)" },
  { src: "Playlists/02-au-loin-dans-letable.mp3", title: "Au loin, dans l'étable" },
  { src: "Playlists/03-belle-etoile.mp3", title: "Belle étoile (voix)" },
  { src: "Playlists/04-cantiques-pour-le-foyer.mp3", title: "Cantiques — Pour le foyer et l'église" },
  { src: "Playlists/05-doux-bebe-mangeoire.mp3", title: "Doux bébé dans la mangeoire (voix)" },
  { src: "Playlists/06-nuit-de-noel.mp3", title: "Nuit de Noël" },
  { src: "Playlists/07-oh-quelle-incomparable-joie.mp3", title: "Ô quelle incomparable joie (chœur)" },
  { src: "Playlists/08-quel-est-lenfant.mp3", title: "Quel est l'Enfant (chœur)" },
  { src: "Playlists/09-saluez-ce-jour-beni.mp3", title: "Saluez ce jour béni (chœur)" },
  { src: "Playlists/10-un-dieu-de-miracles.mp3", title: "Un Dieu de miracles (enfants)" },
  { src: "Playlists/11-viens-crie-sur-les-montagnes.mp3", title: "Viens, crie sur les montagnes (chœur)" },
];

/* ---------- Stockage local des réponses RSVP ---------- */
const RSVP_KEY = "noel-aboisso-rsvp";

function saveRsvp(data) {
  try {
    const all = JSON.parse(localStorage.getItem(RSVP_KEY) || "{}");
    all[data.num] = data;
    localStorage.setItem(RSVP_KEY, JSON.stringify(all));
  } catch { /* navigation privée saturée */ }
}

function getRsvps() {
  try { return JSON.parse(localStorage.getItem(RSVP_KEY) || "{}"); }
  catch { return {}; }
}

/* Tri chronologique par `at` pour éviter le tri numérique des clés d'objet JS */
function getLastRsvp() {
  const list = Object.values(getRsvps());
  if (!list.length) return null;
  return list
    .slice()
    .sort((a, b) => new Date(a.at || 0).getTime() - new Date(b.at || 0).getTime())
    .pop();
}

/* =========================================================
   ÉCRAN D'OUVERTURE (Nominatif + Carillon Web Audio + Fondu Musical)
   ========================================================= */
(function initIntro() {
  const intro = $("#intro");
  const envelope = $("#envelope");
  if (!intro || !envelope) return;
  envelope.setAttribute("tabindex", "0");
  envelope.setAttribute("role", "button");
  envelope.setAttribute("aria-label", "Ouvrir l'invitation");

  /* Lecture des paramètres nominatifs (?pour=Koffi&de=Hermann ou ?invite=Koffi) */
  const params = new URLSearchParams(location.search);
  const urlPour = (params.get("pour") || params.get("invite") || "").trim();
  const urlDe = (params.get("de") || params.get("par") || "").trim();
  const lastR = getLastRsvp();
  const recipientName = urlPour || (lastR && lastR.nom ? lastR.nom.split(" ")[0] : "");

  /* Afficher l'étiquette nominative directement sur l'enveloppe fermée */
  const envTag = $("#envelope-tag");
  if (envTag && (recipientName || urlDe)) {
    if (recipientName && urlDe) {
      envTag.innerHTML = `Pour <strong>${escapeHTML(recipientName)}</strong> · De <strong>${escapeHTML(urlDe)}</strong>`;
    } else if (recipientName) {
      envTag.innerHTML = `Remis spécialement pour <strong>${escapeHTML(recipientName)}</strong> ✦`;
    } else if (urlDe) {
      envTag.innerHTML = `Invitation de la part de <strong>${escapeHTML(urlDe)}</strong> ✦`;
    }
    envTag.classList.remove("hidden");
  }

  /* Pré-remplir le nom du destinataire dans le formulaire RSVP s'il vient d'un lien personnalisé */
  if (urlPour && $("#f-nom") && !$("#f-nom").value.trim()) {
    $("#f-nom").value = urlPour;
  }

  let opened = false;
  function finish() {
    if (intro.classList.contains("opening")) return;
    intro.classList.add("opening");
    document.body.style.overflow = "";
    launchConfetti();
    setTimeout(() => intro.remove(), 900);
  }
  function open() {
    if (opened) return;
    opened = true;
    /* 1) Carillon cristallin (Web Audio API) + Démarrage en fondu progressif de la musique */
    if (!isReducedMotion()) playChime("envelope");
    if (window.__startMusic) window.__startMusic(true);

    /* 2) Personnalisation du message révélé */
    try {
      $("#ir-nom").textContent = recipientName || "ami·e";
      const fromEl = $("#ir-from");
      if (fromEl && urlDe) {
        fromEl.textContent = `✦ Invitation partagée avec joie par ${urlDe}`;
        fromEl.classList.remove("hidden");
      }
    } catch { /* nom par défaut */ }

    intro.classList.add("env-open"); // le rabat s'ouvre en 3D, la lettre monte
    const delay = isReducedMotion() ? 0 : 900;
    setTimeout(() => {
      intro.classList.add("env-anim"); // l'enveloppe se replie sans laisser de vide, le message apparaît
      $("#intro-cta")?.focus({ preventScroll: true });
    }, delay);

    $("#intro-cta")?.addEventListener("click", (ev) => {
      ev.preventDefault();
      finish();
      document.querySelector("#programme")?.scrollIntoView({ behavior: isReducedMotion() ? "auto" : "smooth" });
    });
    addEventListener("keydown", function onEsc(ev) {
      if (ev.key === "Escape" && opened) { finish(); removeEventListener("keydown", onEsc); }
    });
    setTimeout(finish, 16000); /* garde-fou : l'intro s'efface d'elle-même */
  }
  envelope.addEventListener("click", open);
  $("#intro-open-btn")?.addEventListener("click", open);
  envelope.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
  });
  document.body.style.overflow = "hidden";
})();

/* =========================================================
   NEIGE (canvas — respecte prefers-reduced-motion et la visibilité de l'onglet)
   ========================================================= */
(function initSnow() {
  if (isReducedMotion()) return;
  const canvas = $("#snow");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let flakes = [];
  const COLORS = ["#ffffff", "#FBE3E9", "#F2B5C1"];

  function resize() { canvas.width = innerWidth; canvas.height = innerHeight; }
  resize();
  addEventListener("resize", resize);

  function makeFlakes() {
    const count = Math.min(75, Math.floor(innerWidth / 16));
    flakes = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 2.5 + 1.2,
      s: Math.random() * 0.48 + 0.24,      // vitesse chute
      d: Math.random() * Math.PI * 2,      // dérive
      c: COLORS[(Math.random() * COLORS.length) | 0],
      a: Math.random() * 0.5 + 0.25,
    }));
  }
  makeFlakes();
  addEventListener("resize", makeFlakes);

  (function loop() {
    if (!document.hidden && !isReducedMotion()) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const f of flakes) {
        f.y += f.s;
        f.d += 0.012;
        f.x += Math.sin(f.d) * 0.4;
        if (f.y > canvas.height + 6) { f.y = -6; f.x = Math.random() * canvas.width; }
        ctx.globalAlpha = f.a;
        ctx.fillStyle = f.c;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    requestAnimationFrame(loop);
  })();
})();

/* =========================================================
   CONFETTIS (à l'ouverture de l'enveloppe — désactivés si reduced-motion)
   ========================================================= */
function launchConfetti() {
  if (isReducedMotion()) return;
  const canvas = $("#snow");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const pieces = Array.from({ length: 100 }, () => ({
    x: Math.random() * canvas.width,
    y: -20 - Math.random() * canvas.height * 0.4,
    w: 6 + Math.random() * 6,
    h: 8 + Math.random() * 8,
    vy: 2 + Math.random() * 3,
    vx: Math.random() * 2 - 1,
    rot: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.2,
    c: ["#F2B5C1", "#D70B33", "#ffffff", "#E05A74", "#FBE3E9"][(Math.random() * 5) | 0],
  }));
  let frames = 0;
  (function anim() {
    if (frames++ > 240) return;
    for (const p of pieces) {
      p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      if (p.y > canvas.height + 20 && frames < 180) { p.y = -20; p.x = Math.random() * canvas.width; }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = Math.max(0, 1 - frames / 240);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    requestAnimationFrame(anim);
  })();
}

/* =========================================================
   LA CONSTELLATION D'ABOISSO (Défi Spirituel « Éclairer le Monde »)
   ========================================================= */
(function initConstellation() {
  const sky = $("#cb-sky");
  const candle = $("#cb-candle");
  const countEl = $("#lights-count");
  const tagEl = $("#insp-tag");
  const textEl = $("#insp-text");
  const verseEl = $("#insp-verse");
  const recentEl = $("#cb-recent");
  const btnLight = $("#btn-light-candle");
  const btnDraw = $("#btn-draw-insp");
  if (!sky || !candle || !countEl || !btnLight || !btnDraw) return;

  const INSPIRATIONS = [
    {
      tag: "✦ Geste de Lumière #1 · Réconciliation",
      text: "« Aujourd'hui, envoyez un message de paix ou de reconnaissance à un membre de votre famille ou à un ami qui compte pour vous. »",
      verse: "— « Heureux ceux qui procurent la paix, car ils seront appelés fils de Dieu ! » (Matthieu 5:9)",
    },
    {
      tag: "✦ Geste de Lumière #2 · Partage",
      text: "« Préparez un vêtement neuf ou un présent symbolique à offrir à un enfant ou une famille d'Aboisso le 19 décembre. »",
      verse: "— « Toutes les fois que vous avez fait ces choses à l'un de ces plus petits de mes frères, c'est à moi que vous les avez faites. » (Matthieu 25:40)",
    },
    {
      tag: "✦ Geste de Lumière #3 · Invitation",
      text: "« Pensez à une personne qui se sent seule en cette fin d'année et invitez-la personnellement à célébrer Noël avec nous. »",
      verse: "— « Venez à moi, vous tous qui êtes fatigués et chargés, et je vous donnerai du repos. » (Matthieu 11:28)",
    },
    {
      tag: "✦ Geste de Lumière #4 · Prière",
      text: "« Ce soir, priez par son prénom pour un voisin, un ami ou un membre moins actif de votre branche à Aboisso. »",
      verse: "— « Priez les uns pour les autres, afin que vous soyez guéris. » (Jacques 5:16)",
    },
    {
      tag: "✦ Geste de Lumière #5 · Gratitude",
      text: "« Remerciez sincèrement une personne dont le travail quotidien ou le sourire bénit discrètement votre quartier. »",
      verse: "— « Rendez grâces en toutes choses. » (1 Thessaloniciens 5:18)",
    },
    {
      tag: "✦ Geste de Lumière #6 · Pardon",
      text: "« Libérez votre cœur d'une ancienne offense et offrez au Sauveur le cadeau du pardon véritable avant Noël. »",
      verse: "— « Pardonnez-vous réciproquement, comme Dieu vous a pardonné en Christ. » (Éphésiens 4:32)",
    },
    {
      tag: "✦ Geste de Lumière #7 · Écoute",
      text: "« Accordez dix minutes d'écoute attentive et bienveillante à un enfant ou à une personne âgée de votre entourage. »",
      verse: "— « Que chacun soit prompt à écouter, lent à parler. » (Jacques 1:19)",
    },
    {
      tag: "✦ Geste de Lumière #8 · Témoignage",
      text: "« Partagez votre cantique de Noël préféré ou un verset sur la naissance du Christ avec vos proches sur WhatsApp. »",
      verse: "— « Car un enfant nous est né, un fils nous est donné. » (Ésaïe 9:5)",
    },
  ];

  let inspIdx = 0;
  const LIT_KEY = "noel-aboisso-candle-lit";

  /* Dessiner les étoiles initiales de la constellation */
  function addStarDot(animate = false) {
    const dot = document.createElement("span");
    dot.className = "cb-star-dot";
    dot.style.left = `${6 + Math.random() * 88}%`;
    dot.style.top = `${8 + Math.random() * 84}%`;
    dot.style.animationDelay = `${(Math.random() * 3).toFixed(2)}s`;
    if (animate) {
      dot.style.transform = "scale(2.5)";
      setTimeout(() => { dot.style.transform = ""; }, 400);
    }
    sky.appendChild(dot);
  }
  for (let i = 0; i < 22; i++) addStarDot(false);

  function showInspiration(idx) {
    const item = INSPIRATIONS[idx % INSPIRATIONS.length];
    textEl.style.opacity = "0";
    setTimeout(() => {
      tagEl.textContent = item.tag;
      textEl.textContent = item.text;
      verseEl.textContent = item.verse;
      textEl.style.opacity = "1";
    }, 180);
  }

  btnDraw.addEventListener("click", () => {
    inspIdx = (inspIdx + 1) % INSPIRATIONS.length;
    showInspiration(inspIdx);
  });

  function updateDisplay(data) {
    if (data && typeof data.count === "number") {
      countEl.textContent = data.count;
    }
    if (data && Array.isArray(data.recent) && data.recent.length && recentEl) {
      const last = data.recent[0];
      recentEl.textContent = `🕯️ Dernière lumière allumée par ${last.nom || "un membre d'Aboisso"}`;
      recentEl.classList.remove("hidden");
    }
  }

  /* Charger le compteur depuis le serveur */
  (async () => {
    try {
      const res = await fetch("/api/lights");
      if (res.ok) updateDisplay(await res.json());
    } catch {}
  })();

  /* État local si le visiteur a déjà allumé sa bougie */
  try {
    if (localStorage.getItem(LIT_KEY)) {
      candle.classList.add("lit");
      btnLight.textContent = "🕯️ Allumer une nouvelle bougie d'amour";
    }
  } catch {}

  async function igniteCandle() {
    candle.classList.add("lit");
    if (!isReducedMotion()) playChime("candle");
    addStarDot(true);

    const lastR = getLastRsvp();
    const nom = lastR?.nom ? lastR.nom.split(" ")[0] : ($("#f-nom")?.value.trim() || "Un ami d'Aboisso");
    const currentInsp = INSPIRATIONS[inspIdx % INSPIRATIONS.length].tag;

    const currentN = parseInt(countEl.textContent, 10) || 25;
    countEl.textContent = currentN + 1;
    btnLight.textContent = "🕯️ Bougie allumée — Merci d'éclairer Aboisso ✨";

    try { localStorage.setItem(LIT_KEY, "1"); } catch {}
    toast("🕯️ Votre lumière brille dans la Constellation d'Aboisso ✨");

    try {
      const res = await fetch("/api/lights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom, inspiration: currentInsp }),
      });
      if (res.ok) updateDisplay(await res.json());
    } catch {}
  }

  btnLight.addEventListener("click", igniteCandle);
  candle.addEventListener("click", igniteCandle);
})();

/* =========================================================
   APPARITIONS AU SCROLL + DÉCALAGES EN CASCADE
   ========================================================= */
(function initReveal() {
  /* Délais en cascade dans les groupes marqués data-stagger */
  document.querySelectorAll("[data-stagger]").forEach((group) => {
    [...group.children].forEach((el, i) => {
      el.style.transitionDelay = `${Math.min(i * 90, 450)}ms`;
      el.addEventListener("transitionend", function clear() {
        el.style.transitionDelay = "";
        el.removeEventListener("transitionend", clear);
      });
    });
    /* Les groupes sans .reveal obtiennent leur état visible à l'écran */
    if (!group.classList.contains("reveal")) {
      const io2 = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) { group.classList.add("in"); io2.unobserve(group); }
        });
      }, { threshold: 0.15 });
      io2.observe(group);
    }
  });

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
})();

/* =========================================================
   EFFETS DE SCROLL : progression + navigation flottante
   ========================================================= */
(function initScrollFX() {
  const bar = $("#progress");
  const nav = $("#topnav");
  const cta = document.getElementById("cta-float");
  const hero = document.querySelector(".hero");
  const rsvp = document.querySelector("#rsvp");
  function onScroll() {
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    if (bar) bar.style.transform = `scaleX(${max ? h.scrollTop / max : 0})`;
    const past = h.scrollTop > (hero ? hero.offsetHeight - 140 : 400);
    if (nav) nav.classList.toggle("show", past);
    /* Le CTA flottant apparaît après le hero et se masque quand le RSVP est visible */
    if (cta) {
      let rsvpVisible = false;
      if (rsvp) {
        const r = rsvp.getBoundingClientRect();
        rsvpVisible = r.top < innerHeight * 0.75 && r.bottom > innerHeight * 0.3;
      }
      cta.classList.toggle("show", past && !rsvpVisible);
    }
  }
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();
})();

/* =========================================================
   LIGNE DU PROGRAMME QUI SE DESSINE
   ========================================================= */
(function initTimelineLine() {
  const tl = document.querySelector(".timeline");
  if (!tl) return;
  function draw() {
    const r = tl.getBoundingClientRect();
    const passed = Math.min(Math.max(innerHeight * 0.72 - r.top, 0), r.height);
    tl.style.setProperty("--line", `${(passed / r.height) * 100}%`);
  }
  addEventListener("scroll", draw, { passive: true });
  addEventListener("resize", draw);
  draw();
})();

/* =========================================================
   CARTES 3D (survol à la souris)
   ========================================================= */
(function initTilt() {
  if (isReducedMotion() || !matchMedia("(pointer:fine)").matches) return;
  document.querySelectorAll(".feature, .tl-card").forEach((card) => {
    card.addEventListener("mousemove", (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform =
        `perspective(750px) rotateY(${x * 7}deg) rotateX(${-y * 7}deg) translateY(-4px)`;
    });
    card.addEventListener("mouseleave", () => { card.style.transform = ""; });
  });
})();

/* =========================================================
   LANTERNE : halo doré qui suit la souris dans le hero
   ========================================================= */
(function initLantern() {
  if (isReducedMotion() || !matchMedia("(pointer:fine)").matches) return;
  const hero = document.querySelector(".hero");
  if (!hero) return;
  const glow = document.createElement("div");
  glow.className = "lantern";
  hero.appendChild(glow);
  hero.addEventListener("mousemove", (e) => {
    const r = hero.getBoundingClientRect();
    glow.style.left = `${e.clientX - r.left}px`;
    glow.style.top = `${e.clientY - r.top}px`;
  }, { passive: true });
})();

/* =========================================================
   COMPTE À REBOURS + CALENDRIER
   ========================================================= */
(function initCountdown() {
  const start = new Date(CONFIG.eventStart);
  const end = new Date(CONFIG.eventEnd);
  const el = {
    d: $("#cd-days"), h: $("#cd-hours"), m: $("#cd-mins"), s: $("#cd-secs"),
  };

  function setVal(node, v) {
    if (!node || node.textContent === v) return;
    node.textContent = v;
    if (!isReducedMotion()) {
      node.classList.remove("tick");
      void node.offsetWidth; /* relance l'animation */
      node.classList.add("tick");
    }
  }
  function tick() {
    const now = new Date();
    const diff = start - now;
    if (diff <= 0) {
      const during = now < end;
      const cd = $("#countdown");
      if (cd) {
        cd.innerHTML = during
          ? '<div class="cd-card" style="min-width:200px"><span style="font-size:1.2rem">🎄 C\'est en cours !</span><small>Jusqu\'à 15h00</small></div>'
          : '<div class="cd-card" style="min-width:200px"><span style="font-size:1.1rem">Merci d\'avoir éclairé le monde ✦</span><small>Événement passé</small></div>';
      }
      clearInterval(timer);
      return;
    }
    const d = Math.floor(diff / 864e5);
    const h = Math.floor(diff % 864e5 / 36e5);
    const m = Math.floor(diff % 36e5 / 6e4);
    const s = Math.floor(diff % 6e4 / 1e3);
    setVal(el.d, String(d)); setVal(el.h, pad(h));
    setVal(el.m, pad(m)); setVal(el.s, pad(s));
  }
  const timer = setInterval(tick, 1000);
  tick();

  /* Lien Google Agenda */
  const fmt = (x) => x.toISOString().replace(/[-:]|\.\d{3}/g, "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: CONFIG.eventName,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: "Théâtre, chants, cadeaux pour les enfants et bien d'autres surprises ! Invitation : rejoignez-nous.",
    location: CONFIG.place,
  });
  const gcal = $("#btn-gcal");
  if (gcal) gcal.href = `https://calendar.google.com/calendar/render?${params}`;

  /* Fichier .ics */
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//EclairerLeMonde//NoelAboisso//FR",
    "BEGIN:VEVENT",
    `UID:noel-aboisso-2026@eclairer-le-monde`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${CONFIG.eventName}`,
    "DESCRIPTION:Théâtre\\, chants\\, cadeaux pour les enfants et bien d'autres surprises !",
    `LOCATION:${CONFIG.place}`,
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
  const btnIcs = $("#btn-ics");
  if (btnIcs) btnIcs.href = "data:text/calendar;charset=utf-8," + encodeURIComponent(ics);
})();

/* =========================================================
   COPIER L'ADRESSE / LE LIEN
   ========================================================= */
$("#copy-address")?.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(CONFIG.place);
    toast("📍 Adresse copiée !");
  } catch {
    toast("Adresse : " + CONFIG.place);
  }
});

/* Boutons de partage : un même bloc peut contenir plusieurs boutons (partage + footer) */
document.querySelectorAll("[data-copy-link]").forEach((btn) => {
  btn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      toast("🔗 Lien copié ! Collez-le où vous voulez.");
    } catch {
      toast("Impossible de copier le lien 😕");
    }
  });
});

/* ---------- Partage WhatsApp ---------- */
(function initShare() {
  const text = "✦ Éclairer le Monde ✦\nVous êtes invité·e au Grand Noël des Enfants & Familles 🎄\n🎭 Théâtre · 🎶 Chants · 🎁 Cadeaux · ✨ Surprises\n📅 Samedi 24 décembre 2026, 10h–15h\n📍 Salle des fêtes de la mairie d'Aboisso\nEntrée gratuite — toute la famille est la bienvenue !";
  const url = location.href;
  document.querySelectorAll("[data-share-wa]").forEach((a) => {
    a.href = `https://wa.me/?text=${encodeURIComponent(text + "\n👉 " + url)}`;
  });
})();

/* =========================================================
   RSVP + CARTE D'INVITATION
   ========================================================= */
(function initRsvp() {
  const form = $("#rsvp-form");
  const done = $("#rsvp-done");
  const modal = $("#invite-modal");
  const card = $("#invite-card");
  if (!form || !done || !modal || !card) return;
  let currentInvite = null;

  /* Statut membre / ami : montrer ou cacher les champs de branche & localité
     et le bloc d'invitations (réservé aux membres) */
  const membreFields = $("#membre-fields");
  const inviteBlock = $("#invite-block");
  function syncStatut() {
    const statut = form.querySelector('input[name="statut"]:checked')?.value || "membre";
    membreFields.classList.toggle("hidden", statut !== "membre");
    inviteBlock.classList.toggle("hidden", statut !== "membre");
    /* Les amis n'ont pas d'étape 2 : on la saute automatiquement */
    if (statut !== "membre" && stepEls[1] && stepEls[1].classList.contains("is-active")) {
      goToStep(3);
    }
  }
  form.querySelectorAll('input[name="statut"]').forEach((r) => r.addEventListener("change", syncStatut));

  /* ---------- Navigation multi-étapes du formulaire ---------- */
  const stepEls = [...form.querySelectorAll(".rsvp-step")];
  const dots = [...form.querySelectorAll(".step-dot")];
  function goToStep(n) {
    stepEls.forEach((s) => s.classList.toggle("is-active", s.dataset.step === String(n)));
    dots.forEach((d) => d.classList.toggle("active", +d.dataset.stepDot <= n));
  }
  function nextStep(target) {
    if (target === 2) {
      if (!form.querySelector('input[name="nom"]').value.trim()) {
        const err = $("#rsvp-error");
        err.textContent = "Merci d'indiquer votre nom pour continuer 🙏";
        err.classList.remove("hidden");
        $("#f-nom").focus();
        return;
      }
      $("#rsvp-error").classList.add("hidden");
      /* Les amis n'ont pas d'étape 2 : on va directement à l'étape 3 */
      goToStep(form.querySelector('input[name="statut"]:checked')?.value === "ami" ? 3 : 2);
    } else {
      goToStep(target);
    }
  }
  function prevStep(target) {
    /* Retour depuis l'étape 3 : on revient à l'étape 2 sauf pour les amis */
    if (target === 2 && form.querySelector('input[name="statut"]:checked')?.value !== "ami") goToStep(2);
    else goToStep(1);
  }
  form.querySelectorAll("[data-next]").forEach((b) => b.addEventListener("click", () => nextStep(+b.dataset.next)));
  form.querySelectorAll("[data-back]").forEach((b) => b.addEventListener("click", () => prevStep(+b.dataset.back)));

  /* État initial : étape 1 active, et masquage selon le statut */
  goToStep(1);
  syncStatut();

  /* ---------- Invitations dynamiques : amis & membres inactifs (avec labels accessibles) ---------- */
  const invLists = { ami: $("#inv-amis"), inactif: $("#inv-inactifs") };
  let invRowCounter = 0;

  function addInviteRow(type) {
    invRowCounter += 1;
    const idNom = `inv-nom-${invRowCounter}`;
    const idTel = `inv-tel-${invRowCounter}`;
    const row = document.createElement("div");
    row.className = "inv-row";
    const phNom = type === "ami" ? "Ex. Koffi Yao" : "Ex. Sœur Adjoua";
    row.innerHTML = `
      <div class="field"><label for="${idNom}">Son nom</label><input id="${idNom}" class="inv-nom" type="text" maxlength="80" placeholder="${phNom}" /></div>
      <div class="field"><label for="${idTel}">Son contact WhatsApp</label><input id="${idTel}" class="inv-tel" type="tel" inputmode="tel" placeholder="07 00 00 00 00" /></div>
      <button class="inv-x" type="button" title="Retirer cette personne" aria-label="Retirer cette personne">✕</button>
      <p class="inv-msg hidden" aria-live="polite"></p>`;
    row.querySelector(".inv-x").addEventListener("click", () => {
      const list = row.parentElement;
      row.remove();
      if (list && !list.children.length) addInviteRow(type);
    });
    row.querySelector(".inv-nom").addEventListener("change", () => checkInviteRow(row));
    row.querySelector(".inv-tel").addEventListener("change", () => checkInviteRow(row));
    invLists[type].appendChild(row);
    return row;
  }

  const rowValues = (row) => ({
    nom: row.querySelector(".inv-nom").value.trim(),
    tel: row.querySelector(".inv-tel").value.trim(),
  });

  function rowMsg(row, text, ok = false) {
    const m = row.querySelector(".inv-msg");
    m.textContent = text || "";
    m.classList.toggle("hidden", !text);
    m.classList.toggle("ok", ok && !!text);
  }

  function collectInvites() {
    const out = [];
    for (const type of ["ami", "inactif"]) {
      for (const row of Array.from(invLists[type].children)) {
        const v = rowValues(row);
        if (v.nom || v.tel) out.push({ type, ...v });
      }
    }
    return out;
  }

  /* Doublon à l'intérieur du formulaire */
  function localDup(row) {
    const me = rowValues(row);
    const nk = invKey(me.nom), tk = telKey(me.tel);
    for (const list of Object.values(invLists)) {
      for (const other of list.children) {
        if (other === row) continue;
        const v = rowValues(other);
        if (!v.nom && !v.tel) continue;
        const sameTel = tk && telKey(v.tel) === tk;
        const sameNom = nk && invKey(v.nom) === nk;
        if (sameTel || (sameNom && (!tk || !telKey(v.tel)))) return v.nom || v.tel;
      }
    }
    return "";
  }

  /* Doublon dans la base (invitations + inscriptions) : comparaison nom & téléphone */
  async function checkInviteRow(row) {
    const { nom, tel } = rowValues(row);
    if (!nom && !tel) { rowMsg(row, ""); return; }
    if (!nom) { rowMsg(row, "Indiquez aussi son nom 🙏"); return; }
    const ld = localDup(row);
    if (ld) { rowMsg(row, `⚠️ « ${ld} » figure déjà dans vos invitations ✋`); return; }
    try {
      const res = await fetch("/api/invites/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom, tel }),
      });
      const j = await res.json();
      if (j.dup) rowMsg(row, `⚠️ « ${nom} » a déjà été invité·e${j.info ? " (" + j.info + ")" : ""} ✋`);
      else rowMsg(row, "✓ Pas encore invité·e — parfait !", true);
    } catch { rowMsg(row, ""); }
  }

  ["ami", "inactif"].forEach((t) => {
    document.querySelector(`[data-add-invite="${t}"]`)?.addEventListener("click", () => addInviteRow(t));
    addInviteRow(t);
  });

  /* Boutons WhatsApp avec lien d'enveloppe nominatif (?pour=Invité&de=Membre) */
  function renderInvitesShare(invites, membreNom) {
    const box = $("#invites-share");
    box.innerHTML = "";
    const list = (invites || []).filter((i) => i && i.nom);
    if (!list.length) { box.classList.add("hidden"); return; }
    const h = document.createElement("p");
    h.className = "is-title";
    h.textContent = "💌 Envoyez-leur leur enveloppe nominative par WhatsApp :";
    box.appendChild(h);
    const base = location.protocol.startsWith("http") ? location.origin + location.pathname : "https://invitation-noel-aboisso.onrender.com/";
    for (const inv of list) {
      const qs = new URLSearchParams({ pour: inv.nom, de: membreNom });
      const personalUrl = `${base}?${qs.toString()}`;
      const msg = `✦ Éclairer le Monde ✦\nCher·ère ${inv.nom},\n${membreNom} vous a préparé une enveloppe d'invitation personnelle pour la fête de Noël « Éclairer le Monde » 🎄\n🎭 Théâtre · 🎶 Chants · 🎁 Cadeaux · ✨ Surprises\n📅 Samedi 24 décembre 2026 · 10h00 – 15h00\n📍 Salle des fêtes de la mairie d'Aboisso\n💌 Touchez pour ouvrir votre enveloppe : ${personalUrl}`;
      const num = telKey(inv.tel) ? normalizePhone(inv.tel) : "";
      const a = document.createElement("a");
      a.className = "btn btn-green is-btn";
      a.href = num ? `https://wa.me/${num}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
      a.target = "_blank"; a.rel = "noopener";
      a.textContent = `💬 ${inv.nom}`;
      box.appendChild(a);
    }
    box.classList.remove("hidden");
  }

  /* Si une réponse existe déjà : proposer de voir le billet */
  let last = getLastRsvp();
  if (last) {
    $("#done-name").textContent = last.nom.split(" ")[0];
    form.classList.add("hidden");
    done.classList.remove("hidden");
  }

  $("#view-invite").addEventListener("click", () => showInvite(last));

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const nom = (fd.get("nom") || "").trim();
    if (!nom) {
      $("#rsvp-error").classList.remove("hidden");
      $("#f-nom").focus();
      return;
    }
    $("#rsvp-error").classList.add("hidden");

    const data = {
      num: Math.floor(100 + Math.random() * 900),
      nom,
      presence: fd.get("presence") || "present",
      statut: fd.get("statut") === "ami" ? "ami" : "membre",
      tel: (fd.get("tel") || "").trim(),
      people: Math.min(Math.max(parseInt(fd.get("accomp") || "1", 10) || 1, 1), 30),
      branche: (fd.get("branche") || "").trim(),
      localite: (fd.get("localite") || "").trim(),
      note: (fd.get("note") || "").trim(),
      at: new Date().toISOString(),
    };

    /* Invitations (réservées aux membres) : autant de lignes que besoin */
    const invites = data.statut === "membre" ? collectInvites() : [];
    const incomplet = invites.find((i) => !i.nom && i.tel);
    if (incomplet) {
      const el = $("#rsvp-error");
      el.textContent = "Indiquez le nom de chaque personne dont vous donnez le contact 🙏";
      el.classList.remove("hidden");
      return;
    }
    if (data.statut === "membre" && !invites.some((i) => i.nom)) {
      const el = $("#rsvp-error");
      el.textContent = "Merci d'inviter au moins un·e ami·e ou membre moins actif·ve (ticket d'entrée) 🙏";
      el.classList.remove("hidden");
      inviteBlock.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    data.invites = invites;
    const firstAmi = invites.find((i) => i.type === "ami");
    const firstInactif = invites.find((i) => i.type === "inactif");
    data.ami_nom = firstAmi ? firstAmi.nom : "";
    data.ami_tel = firstAmi ? firstAmi.tel : "";
    data.inactif_nom = firstInactif ? firstInactif.nom : "";
    data.inactif_tel = firstInactif ? firstInactif.tel : "";

    /* Envoi au serveur (back office) — repli sur le stockage local si absent */
    let skippedInvites = [];
    try {
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const j = await res.json();
        if (j.entry && j.entry.num) data.num = j.entry.num;
        skippedInvites = j.skipped || [];
      }
    } catch { /* site ouvert en fichier local : stockage local uniquement */ }

    saveRsvp(data);
    currentInvite = data;
    last = data; /* le bouton « Revoir ma carte » doit montrer la dernière réponse */

    /* Afficher la carte d'invitation (elle s'ouvre en animation) */
    showInvite(data);
    form.reset();
    ["ami", "inactif"].forEach((t) => { invLists[t].innerHTML = ""; addInviteRow(t); });
    goToStep(1); /* retour à la première étape pour une prochaine réponse */
    syncStatut();
    renderInvitesShare(invites.filter((i) => !skippedInvites.some((s) => invKey(s) === invKey(i.nom))), nom);
    toast("💌 Réponse envoyée — votre carte d'invitation est prête !");
    if (skippedInvites.length) {
      setTimeout(() => toast(`⚠️ ${skippedInvites.join(", ")} avait déjà été invité·e — ignoré·e`), 2800);
    }
    launchConfetti();
    setTimeout(() => {
      form.classList.add("hidden");
      $("#done-name").textContent = nom.split(" ")[0];
      done.classList.remove("hidden");
      done.scrollIntoView({ behavior: isReducedMotion() ? "auto" : "smooth", block: "center" });
    }, 600);
  });

  /* Lien de la carte (pour le QR) — repli si le site est ouvert en fichier local */
  function inviteLink(d) {
    if (location.protocol.startsWith("http")) return location.origin + location.pathname + "#billet-" + d.num;
    return "https://invitation-noel-aboisso.onrender.com/#billet-" + d.num;
  }

  /* QR code — encodeURI préserve la structure de l'URL et encode les accents */
  function makeQR(text) {
    try {
      if (typeof qrcode !== "function") return null;
      const qr = qrcode(0, "M");
      qr.addData(encodeURI(text));
      qr.make();
      return qr.createDataURL(8, 4);
    } catch { return null; }
  }

  function showInvite(d) {
    if (!d) { toast("Répondez d'abord au formulaire 🙏"); return; }
    currentInvite = d;
    $("#i-name").textContent = d.nom;
    const img = $("#i-qr");
    const qrData = makeQR(inviteLink(d));
    if (qrData) { img.src = qrData; img.parentElement.style.display = ""; }
    else img.parentElement.style.display = "none";

    modal.classList.remove("hidden");
    card.classList.remove("open");
    clearTimeout(showInvite._t1);
    /* La couverture s'ouvre en animation après l'apparition du modal */
    showInvite._t1 = setTimeout(() => card.classList.add("open"), isReducedMotion() ? 0 : 350);
    modal.scrollIntoView({ behavior: isReducedMotion() ? "auto" : "smooth", block: "center" });
  }

  /* Touchez ou appuyez sur Entrée/Espace sur la carte : refermer / rouvrir la couverture */
  card.addEventListener("click", () => card.classList.toggle("open"));
  card.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      card.classList.toggle("open");
    }
  });

  /* WhatsApp : partage de l'invitation */
  $("#wa-invite").addEventListener("click", () => {
    if (!currentInvite) { toast("Répondez d'abord au formulaire 🙏"); return; }
    const d = currentInvite;
    const msg = `✦ Éclairer le Monde ✦\nCher·ère ${d.nom}, vous êtes invité·e à célébrer la naissance de Jésus-Christ avec nous 🎄\n📅 Samedi 24 décembre 2026 · 10h–15h\n📍 Salle des fêtes de la mairie d'Aboisso\n💌 Votre invitation : ${inviteLink(d)}`;
    const wa = d.tel ? normalizePhone(d.tel) : CONFIG.contactPhone;
    window.open(`https://wa.me/${wa}?text=${encodeURIComponent(msg)}`, "_blank");
  });

  $("#close-invite").addEventListener("click", () => modal.classList.add("hidden"));

  /* Génération de la carte en PNG (canvas haute résolution 2x + attente des polices) */
  function wrapText(x, text, cx, y, maxW, lineH) {
    const words = String(text || "").split(" ");
    let line = "", yy = y;
    for (const w of words) {
      const test = line ? line + " " + w : w;
      if (x.measureText(test).width > maxW && line) {
        x.fillText(line, cx, yy);
        line = w; yy += lineH;
      } else line = test;
    }
    if (line) x.fillText(line, cx, yy);
    return yy;
  }
  function drawStar(x, cx, cy, R, r, n = 5) {
    x.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const rad = i % 2 === 0 ? R : r;
      const a = (Math.PI * i) / n - Math.PI / 2;
      x[i ? "lineTo" : "moveTo"](cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
    }
    x.closePath(); x.fill();
  }
  function archPath(x, cx, top, w, h) {
    x.beginPath();
    x.moveTo(cx - w / 2, top + h);
    x.lineTo(cx - w / 2, top + w / 2);
    x.arc(cx, top + w / 2, w / 2, Math.PI, 0);
    x.lineTo(cx + w / 2, top + h);
    x.closePath();
  }

  async function buildInviteCanvas(d, withQR = null) {
    /* Garantir que les polices Google Fonts sont prêtes avant de dessiner */
    if (document.fonts && document.fonts.ready) {
      try { await document.fonts.ready; } catch { /* continuer */ }
    }
    /* withQR : true/false pour forcer ; null = automatique (QR seulement si billet connu) */
    const showQR = withQR === null ? !!d.num : !!withQR;
    const scale = 2; /* Rendu Retina HD (1520×2060) pour un partage WhatsApp ultra-net */
    const W = 760, H = 1030;
    const c = document.createElement("canvas");
    c.width = W * scale;
    c.height = H * scale;
    const x = c.getContext("2d");
    x.scale(scale, scale);

    /* fond crème */
    x.fillStyle = "#fffdf8"; x.fillRect(0, 0, W, H);

    /* arche carmin */
    const AG = x.createLinearGradient(0, 50, 0, H - 300);
    AG.addColorStop(0, "#E05A74"); AG.addColorStop(.5, "#D70B33"); AG.addColorStop(1, "#B8092B");
    archPath(x, W / 2, 50, W - 90, H - 300);
    x.fillStyle = AG; x.fill();

    /* poudre de neige discrète sur l'arche */
    x.fillStyle = "rgba(255,255,255,.26)";
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 46; i++) {
      const sx = 70 + rnd() * (W - 140);
      const sy = 100 + rnd() * (H - 470);
      x.beginPath(); x.arc(sx, sy, 1.2 + rnd() * 2.4, 0, 7); x.fill();
    }

    /* double liseré rose poudré */
    x.strokeStyle = "rgba(242,181,193,.8)"; x.lineWidth = 3;
    archPath(x, W / 2, 66, W - 122, H - 326);
    x.stroke();
    x.strokeStyle = "rgba(255,255,255,.32)"; x.lineWidth = 1.5;
    archPath(x, W / 2, 78, W - 146, H - 350);
    x.stroke();

    /* halo derrière l'étoile */
    const HG = x.createRadialGradient(W / 2, 210, 0, W / 2, 210, 82);
    HG.addColorStop(0, "rgba(242,181,193,.5)"); HG.addColorStop(1, "rgba(242,181,193,0)");
    x.fillStyle = HG; x.beginPath(); x.arc(W / 2, 210, 82, 0, 7); x.fill();

    /* étoile rose */
    x.fillStyle = "#F2B5C1";
    drawStar(x, W / 2, 210, 40, 16);

    x.textAlign = "center";
    x.fillStyle = "#FBE3E9";
    x.font = "italic 600 34px 'Playfair Display', Georgia, serif";
    x.fillText("Invitation", W / 2, 296);

    x.fillStyle = "#ffffff";
    x.font = "700 40px 'Plus Jakarta Sans', sans-serif";
    let y = wrapText(x, "Célébrez la naissance de Jésus-Christ avec nous", W / 2, 352, W - 240, 50);

    /* badge date */
    x.fillStyle = "#F2B5C1";
    drawRoundRect(x, W / 2 - 195, y + 30, 390, 46, 23); x.fill();
    x.fillStyle = "#3A0D18";
    x.font = "800 22px 'Plus Jakarta Sans', sans-serif";
    x.fillText("SAMEDI 19 DÉCEMBRE 2026", W / 2, y + 61);

    x.fillStyle = "#F7DCE1";
    x.font = "500 24px 'Plus Jakarta Sans', sans-serif";
    x.fillText(d.de ? "Invitation personnelle pour" : "Invitation personnelle de", W / 2, y + 112);

    /* Adaptation dynamique de la taille du nom pour éviter les coupures brusques */
    const rawName = String(d.nom || "Invité·e").trim();
    const fontSize = rawName.length > 26 ? 32 : rawName.length > 18 ? 38 : 44;
    x.fillStyle = "#ffffff";
    x.font = `800 ${fontSize}px 'Plus Jakarta Sans', sans-serif`;
    const displayNom = rawName.length > 36 ? rawName.slice(0, 35) + "…" : rawName;
    x.fillText(displayNom, W / 2, y + 160);

    if (d.de) {
      x.fillStyle = "#FBE3E9";
      x.font = "italic 600 22px 'Playfair Display', Georgia, serif";
      x.fillText(`De la part de ${d.de}`, W / 2, y + 194);
      y += 26;
    }

    x.fillStyle = "#FBE3E9";
    x.font = "600 26px 'Plus Jakarta Sans', sans-serif";
    x.fillText("10h00 – 15h00", W / 2, y + 208);
    x.fillStyle = "#ffffff";
    x.font = "600 26px 'Plus Jakarta Sans', sans-serif";
    y = wrapText(x, "Salle des fêtes de la mairie d'ABOISSO", W / 2, y + 246, W - 220, 36);

    /* séparateur doux en bas d'arche */
    x.strokeStyle = "rgba(255,255,255,.35)"; x.lineWidth = 2;
    x.beginPath(); x.moveTo(W / 2 - 60, y + 36); x.lineTo(W / 2 + 60, y + 36); x.stroke();

    /* Bande blanche sous l'arche : QR (billet) ou pastille hashtag (carte express) */
    return new Promise((resolve) => {
      const done = () => resolve(c);
      const qrData = showQR ? makeQR(inviteLink(d)) : null;
      if (qrData) {
        const img = new Image();
        img.onload = () => {
          const qy = H - 260;
          x.fillStyle = "#ffffff";
          drawRoundRect(x, W / 2 - 80, qy, 160, 160, 18); x.fill();
          x.strokeStyle = "rgba(215,11,51,.22)"; x.lineWidth = 2;
          drawRoundRect(x, W / 2 - 80, qy, 160, 160, 18); x.stroke();
          x.drawImage(img, W / 2 - 68, qy + 12, 136, 136);
          x.fillStyle = "#6E5A60";
          x.font = "600 19px 'Plus Jakarta Sans', sans-serif";
          x.fillText("Église de Jésus-Christ des Saints des Derniers Jours", W / 2, H - 72);
          x.fillStyle = "#7A6369";
          x.font = "500 16px 'Plus Jakarta Sans', sans-serif";
          x.fillText(`Billet N°${d.num} · Scannez pour rouvrir votre invitation`, W / 2, H - 42);
          done();
        };
        img.onerror = done;
        img.src = qrData;
      } else {
        x.fillStyle = "#D70B33";
        drawRoundRect(x, W / 2 - 130, H - 232, 260, 46, 23); x.fill();
        x.fillStyle = "#ffffff";
        x.font = "700 21px 'Plus Jakarta Sans', sans-serif";
        x.fillText("#ÉclairerLeMonde", W / 2, H - 202);
        x.fillStyle = "#6E5A60";
        x.font = "600 19px 'Plus Jakarta Sans', sans-serif";
        x.fillText("Église de Jésus-Christ des Saints des Derniers Jours", W / 2, H - 150);
        x.fillStyle = "#7A6369";
        x.font = "500 16px 'Plus Jakarta Sans', sans-serif";
        x.fillText("Entrée gratuite — toute la famille est la bienvenue ✨", W / 2, H - 118);
        done();
      }
    });
  }

  async function downloadInvite(d) {
    const c = await buildInviteCanvas(d);
    const a = document.createElement("a");
    a.download = `invitation-noel-aboisso-${d.num || "express"}.png`;
    a.href = c.toDataURL("image/png");
    a.click();
  }

  /* Envoi de la CARTE (image PNG) via WhatsApp — partage natif quand possible */
  $("#wa-invite-img").addEventListener("click", async () => {
    const d = currentInvite ?? getLastRsvp();
    if (!d) { toast("Répondez d'abord au formulaire 🙏"); return; }
    toast("📤 Préparation de votre carte HD…");
    const c = await buildInviteCanvas(d);
    const blob = await new Promise((r) => c.toBlob(r, "image/png"));
    const file = new File([blob], `invitation-noel-aboisso-${d.num}.png`, { type: "image/png" });
    const msg = "✦ Éclairer le Monde ✦\nVous êtes invité·e à célébrer la naissance de Jésus-Christ avec nous 🎄\n📅 Samedi 24 décembre 2026 · 10h00 – 15h00\n📍 Salle des fêtes de la mairie d'Aboisso\n✨ Entrée gratuite — toute la famille est la bienvenue !";
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "Invitation · Éclairer le Monde", text: msg });
        return;
      } catch { /* partage annulé par l'utilisateur */ }
    }
    /* Repli (desktop) : télécharger la carte puis ouvrir WhatsApp avec le message */
    const a = document.createElement("a");
    a.download = file.name;
    a.href = c.toDataURL("image/png");
    a.click();
    const wa = d.tel ? normalizePhone(d.tel) : CONFIG.contactPhone;
    window.open(`https://wa.me/${wa}?text=${encodeURIComponent(msg + "\n\n🖼️ Joignez la carte téléchargée à l'instant pour un partage encore plus lumineux !")}`, "_blank");
    toast("⬇️ Carte téléchargée — joignez-la à votre message WhatsApp 💌");
  });

  $("#dl-invite").addEventListener("click", () => {
    const d = currentInvite ?? getLastRsvp();
    if (d) { downloadInvite(d); toast("⬇️ Carte d'invitation téléchargée !"); }
  });

  /* ---------- Studio d'Invitation Nominative (Carte HD + Lien d'enveloppe magique WhatsApp) ---------- */
  const genInput = $("#gen-nom");
  const genDeInput = $("#gen-de");
  const genPreview = $("#gen-preview-name");
  const genPreviewBy = $("#gen-preview-by");
  function genName() {
    const v = genInput.value.trim();
    const de = genDeInput ? genDeInput.value.trim() : "";
    genPreview.textContent = v || "—";
    genPreview.style.opacity = v ? "1" : ".6";
    if (genPreviewBy) {
      genPreviewBy.textContent = de ? `De la part de ${de}` : "";
      genPreviewBy.classList.toggle("hidden", !de);
    }
    /* Pré-remplir le formulaire RSVP avec ce nom si ce n'est pas pour quelqu'un d'autre */
    if (v && !de && !$("#f-nom").value.trim()) $("#f-nom").value = v;
  }
  genInput.addEventListener("input", genName);
  genInput.addEventListener("change", genName);
  genDeInput?.addEventListener("input", genName);
  genDeInput?.addEventListener("change", genName);

  $("#gen-dl").addEventListener("click", async () => {
    const v = genInput.value.trim();
    const de = genDeInput ? genDeInput.value.trim() : "";
    if (!v) { toast("Indiquez d'abord le prénom sur la carte ✍️"); genInput.focus(); return; }
    toast("📤 Préparation de votre carte HD…");
    const c = await buildInviteCanvas({ nom: v, de, num: 0 }, false);
    const a = document.createElement("a");
    a.download = `invitation-noel-aboisso-${v.replace(/\s+/g, "-").toLowerCase()}.png`;
    a.href = c.toDataURL("image/png");
    a.click();
    toast("⬇️ Votre carte HD est téléchargée — partagez-la sur WhatsApp 💌");
  });

  /* Envoyer le lien d'enveloppe nominative (?pour=...&de=...) sur WhatsApp */
  $("#gen-wa-link")?.addEventListener("click", () => {
    const pour = genInput.value.trim();
    const de = genDeInput ? genDeInput.value.trim() : "";
    if (!pour) { toast("Indiquez d'abord le prénom de votre invité·e ✍️"); genInput.focus(); return; }
    const base = location.protocol.startsWith("http") ? location.origin + location.pathname : "https://invitation-noel-aboisso.onrender.com/";
    const qs = new URLSearchParams({ pour });
    if (de) qs.set("de", de);
    const magicUrl = `${base}?${qs.toString()}`;
    const introLine = de
      ? `Cher·ère ${pour}, ${de} vous a préparé une enveloppe d'invitation personnelle pour Noël 🎄`
      : `Cher·ère ${pour}, une enveloppe d'invitation personnelle vous attend pour Noël 🎄`;
    const msg = `✦ Éclairer le Monde · Noël à Aboisso ✦\n${introLine}\n📅 Samedi 24 décembre 2026 · 10h00 – 15h00\n📍 Salle des fêtes de la mairie d'Aboisso\n💌 Touchez pour ouvrir votre enveloppe : ${magicUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  });

  $("#gen-use").addEventListener("click", () => {
    const v = genInput.value.trim();
    if (!v) { toast("Indiquez d'abord votre prénom ✍️"); genInput.focus(); return; }
    $("#f-nom").value = v;
    document.querySelector("#rsvp-form").scrollIntoView({ behavior: isReducedMotion() ? "auto" : "smooth", block: "center" });
    $("#f-nom").focus();
    toast("✨ Nom pré-rempli — confirmez votre présence !");
  });

  /* Lien direct #billet-NUM (QR scanné sur le même téléphone OU sur un autre appareil via /api/ticket) */
  async function checkTicketHash() {
    const mHash = location.hash.match(/^#billet-(\d+)$/);
    if (!mHash) return;
    const ticketNum = mHash[1];
    let found = Object.values(getRsvps()).find((r) => String(r.num) === ticketNum);
    if (!found) {
      try {
        const res = await fetch(`/api/ticket?num=${encodeURIComponent(ticketNum)}`);
        if (res.ok) {
          const j = await res.json();
          if (j.ok && j.entry) found = j.entry;
        }
      } catch { /* hors-ligne */ }
    }
    if (found) {
      const tryShow = () => {
        if (document.querySelector("#intro:not(.opening)")) { setTimeout(tryShow, 500); return; }
        showInvite(found);
      };
      tryShow();
    }
  }
  checkTicketHash();
  addEventListener("hashchange", checkTicketHash);
})();

/* =========================================================
   LIVRE D'OR
   ========================================================= */
(function initGuestbook() {
  const KEY = "noel-aboisso-guestbook";
  const form = $("#guestbook-form");
  const list = $("#gb-list");
  const msg = $("#g-msg");
  const count = $("#g-count");
  if (!form || !list || !msg || !count) return;

  const load = () => {
    try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
    catch { return []; }
  };
  const save = (arr) => {
    try { localStorage.setItem(KEY, JSON.stringify(arr)); } catch {}
  };

  /* Source de données : serveur si disponible, sinon stockage local */
  let serverEntries = null;
  (async () => {
    try {
      const res = await fetch("/api/guestbook");
      if (res.ok) { serverEntries = await res.json(); render(); }
    } catch { /* mode local */ }
  })();

  function entries() { return serverEntries ?? load(); }

  function render() {
    const entriesList = entries();
    list.innerHTML = "";
    if (!entriesList.length) {
      const li = document.createElement("li");
      li.className = "gb-empty";
      li.textContent = "Soyez la première personne à partager ses vœux pour cette fête de Noël ✨";
      list.appendChild(li);
      return;
    }
    entriesList.slice().reverse().forEach((e) => {
      const li = document.createElement("li");
      li.className = "gb-item";
      const who = document.createElement("p");
      who.className = "who";
      who.textContent = e.nom;
      const when = document.createElement("span");
      when.className = "when";
      when.textContent = new Date(e.at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
      who.appendChild(when);
      const txt = document.createElement("p");
      txt.className = "txt";
      txt.textContent = e.msg;
      li.append(who, txt);
      list.appendChild(li);
    });
  }

  msg.addEventListener("input", () => { count.textContent = `${msg.value.length}/200`; });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nom = $("#g-nom").value.trim();
    const texte = msg.value.trim();
    if (!nom || !texte) { toast("Merci de remplir votre nom et votre message 🙏"); return; }
    const payload = { nom, msg: texte, at: new Date().toISOString() };
    try {
      const res = await fetch("/api/guestbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const saved = (await res.json()).entry;
        serverEntries = [...(serverEntries ?? []), saved];
      } else {
        /* serveur joint mais refus : on garde le message en local */
        const arr = load();
        arr.push(payload);
        save(arr);
      }
    } catch {
      const arr = load();
      arr.push(payload);
      save(arr);
    }
    form.reset();
    count.textContent = "0/200";
    render();
    toast("💌 Merci pour vos vœux pour cette fête de Noël !");
    list.scrollIntoView({ behavior: isReducedMotion() ? "auto" : "smooth", block: "nearest" });
  });

  render();
})();

/* =========================================================
   MUR PHOTO — « Je serai là ! » (Compression WebP + Pagination fluide)
   ========================================================= */
(function initPhotoWall() {
  const KEY = "noel-aboisso-wall";
  const PAGE_SIZE = 24;
  const form = $("#wall-form");
  const grid = $("#wall-grid");
  const empty = $("#wall-empty");
  const moreWrap = $("#wall-more-wrap");
  const moreBtn = $("#wall-more-btn");
  const drop = $("#wall-drop");
  const fileInput = $("#wall-photo");
  const preview = $("#wall-preview");
  const placeholder = $("#wall-placeholder");
  const error = $("#wall-error");
  const camModal = $("#cam-modal");
  const camVideo = $("#cam-video");
  const camCanvas = $("#cam-canvas");
  if (!form || !grid || !drop || !fileInput) return;

  let camStream = null;
  let photoData = null;
  let serverEntries = null;
  let visibleCount = PAGE_SIZE;

  /* ---------- Likes (cœurs) du mur — stockés côté visiteur ---------- */
  const LIKES_KEY = "noel-aboisso-likes";
  const getLikes = () => {
    try { return JSON.parse(localStorage.getItem(LIKES_KEY) || "{}"); }
    catch { return {}; }
  };
  const photoId = (e) => String(e.id ?? `${e.nom}|${e.at}`);
  function toggleLike(pid, btn) {
    const likes = getLikes();
    if (likes[pid]) {
      delete likes[pid];
      btn.classList.remove("on");
      btn.innerHTML = "🤍";
    } else {
      likes[pid] = 1;
      btn.classList.add("on");
      btn.innerHTML = "❤️<b>1</b>";
      toast("❤️ Merci de faire briller cette lumière !");
    }
    try { localStorage.setItem(LIKES_KEY, JSON.stringify(likes)); } catch {}
  }

  const load = () => {
    try { return JSON.parse(localStorage.getItem(KEY) || "[]"); }
    catch { return []; }
  };
  const save = (arr) => {
    try { localStorage.setItem(KEY, JSON.stringify(arr)); } catch {}
  };
  const entries = () => serverEntries ?? load();

  /* Source de données : serveur si disponible, sinon stockage local */
  (async () => {
    try {
      const res = await fetch("/api/photo-wall");
      if (res.ok) { serverEntries = await res.json(); render(); }
    } catch { /* mode local */ }
  })();

  /* Encodage WebP prioritaire (~65% plus léger) avec repli JPEG automatique */
  function canvasToCompressedDataURL(canvas) {
    const webp = canvas.toDataURL("image/webp", 0.76);
    if (webp.startsWith("data:image/webp")) return webp;
    return canvas.toDataURL("image/jpeg", 0.74);
  }

  /* Recadrage carré + compression (canvas) — max 500px */
  function resizeImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const side = Math.min(img.width, img.height);
        const c = document.createElement("canvas");
        c.width = c.height = 500;
        c.getContext("2d").drawImage(
          img,
          (img.width - side) / 2, (img.height - side) / 2, side, side,
          0, 0, 500, 500
        );
        URL.revokeObjectURL(url);
        resolve(canvasToCompressedDataURL(c));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(); };
      img.src = url;
    });
  }

  function choosePhoto() { fileInput.click(); }
  drop.addEventListener("click", choosePhoto);
  drop.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); choosePhoto(); }
  });
  $("#btn-choose").addEventListener("click", (e) => { e.preventDefault(); choosePhoto(); });

  /* Glisser-déposer */
  ["dragenter", "dragover"].forEach((ev) =>
    drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("dragover"); })
  );
  ["dragleave", "drop"].forEach((ev) =>
    drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove("dragover"); })
  );
  drop.addEventListener("drop", (e) => {
    const f = e.dataTransfer?.files?.[0];
    if (f && f.type.startsWith("image/")) handleFile(f);
  });

  fileInput.addEventListener("change", () => {
    const f = fileInput.files[0];
    if (f) handleFile(f);
  });

  async function handleFile(f) {
    try {
      photoData = await resizeImage(f);
      preview.src = photoData;
      preview.classList.remove("hidden");
      placeholder.classList.add("hidden");
      drop.classList.add("has-photo");
    } catch { toast("Impossible de lire cette image 😕"); }
  }

  /* =======================================================
     CAPTURE DIRECTE — appareil photo / smartphone
     ======================================================= */
  async function stopCamera() {
    if (camStream) { camStream.getTracks().forEach((t) => t.stop()); camStream = null; }
  }

  async function openCamera() {
    camModal.classList.remove("hidden");
    camVideo.classList.remove("hidden");
    camCanvas.classList.add("hidden");
    try {
      camStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 1280 } },
        audio: false,
      });
      camVideo.srcObject = camStream;
    } catch {
      /* Pas d'accès caméra (permission refusée, pas de HTTPS…) :
         on bascule sur l'appareil photo natif du téléphone */
      await stopCamera();
      camModal.classList.add("hidden");
      fileInput.capture = "environment";
      choosePhoto();
      setTimeout(() => fileInput.removeAttribute("capture"), 1000);
      toast("📱 Ouvrez votre appareil photo et validez la capture 📸");
    }
  }

  function closeCamera() {
    stopCamera();
    camModal.classList.add("hidden");
  }

  $("#btn-camera").addEventListener("click", (e) => { e.preventDefault(); openCamera(); });
  $("#btn-cam-close").addEventListener("click", closeCamera);

  /* Capture : dessin de la frame vidéo recadrée en carré 500×500 */
  $("#btn-capture").addEventListener("click", () => {
    const v = camVideo;
    if (!v.videoWidth) { toast("La caméra se prépare encore… 🙏"); return; }
    const side = Math.min(v.videoWidth, v.videoHeight);
    camCanvas.width = camCanvas.height = 500;
    camCanvas.getContext("2d").drawImage(
      v,
      (v.videoWidth - side) / 2, (v.videoHeight - side) / 2, side, side,
      0, 0, 500, 500
    );
    photoData = canvasToCompressedDataURL(camCanvas);
    preview.src = photoData;
    preview.classList.remove("hidden");
    placeholder.classList.add("hidden");
    drop.classList.add("has-photo");
    closeCamera();
    toast("📸 Photo capturée ! Elle sera affichée avec le cadre Éclairer le Monde ✨");
  });

  /* =======================================================
     CADRE « ÉCLAIRER LE MONDE » — téléchargement PNG
     ======================================================= */
  async function drawFramedPhoto(e) {
    if (document.fonts && document.fonts.ready) {
      try { await document.fonts.ready; } catch {}
    }
    const W = 760, H = 980;
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const x = c.getContext("2d");

    /* Cadre carmin extérieur */
    const RG = x.createLinearGradient(0, 0, 0, H);
    RG.addColorStop(0, "#E05A74"); RG.addColorStop(.55, "#D70B33"); RG.addColorStop(1, "#B8092B");
    drawRoundRect(x, 0, 0, W, H, 30); x.fillStyle = RG; x.fill();

    /* Fond crème intérieur */
    drawRoundRect(x, 16, 16, W - 32, H - 32, 18); x.fillStyle = "#fffdf8"; x.fill();

    /* Liseré rose poudré */
    x.strokeStyle = "rgba(242,181,193,.9)"; x.lineWidth = 2.5;
    drawRoundRect(x, 28, 28, W - 56, H - 56, 14); x.stroke();

    /* Photo recadrée en carré */
    const px = 64, py = 64, pw = W - 128;

    const img = new Image();
    img.crossOrigin = "anonymous";
    const finish = () => {
      const a = document.createElement("a");
      a.download = `eclairer-le-monde-${(e.nom || "photo").replace(/\s+/g, "-").toLowerCase()}.png`;
      a.href = c.toDataURL("image/png");
      a.click();
    };
    img.onload = () => {
      /* photo carrée (les photos du mur sont déjà carrées) */
      x.save();
      drawRoundRect(x, px, py, pw, pw, 12); x.clip();
      const side = Math.min(img.width, img.height);
      x.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, px, py, pw, pw);
      x.restore();
      /* fin contour rose de la photo */
      x.strokeStyle = "rgba(242,181,193,.95)"; x.lineWidth = 3;
      drawRoundRect(x, px, py, pw, pw, 12); x.stroke();

      /* Étoile rose */
      x.fillStyle = "#F2B5C1";
      const cx = W / 2, cy = py + pw + 50, R = 17, r2 = 7;
      x.beginPath();
      for (let i = 0; i < 10; i++) {
        const rad = i % 2 === 0 ? R : r2;
        const a = (Math.PI * i) / 5 - Math.PI / 2;
        x[i ? "lineTo" : "moveTo"](cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
      }
      x.closePath(); x.fill();

      /* Titre */
      x.textAlign = "center";
      x.fillStyle = "#3A0D18";
      x.font = "italic 600 40px 'Playfair Display', Georgia, serif";
      x.fillText("Éclairer le Monde", W / 2, cy + 56);

      /* Nom du participant */
      if (e.nom) {
        x.fillStyle = "#3A0D18";
        x.font = "700 26px 'Plus Jakarta Sans', sans-serif";
        x.fillText(e.nom.length > 30 ? e.nom.slice(0, 30) + "…" : e.nom, W / 2, cy + 94);
      }

      /* Date & lieu */
      x.fillStyle = "#6E5A60";
      x.font = "500 18px 'Plus Jakarta Sans', sans-serif";
      x.fillText("19 · 12 · 2026  ·  Salle des fêtes de la mairie d'Aboisso", W / 2, cy + 126);

      /* Hashtag sur pastille carmin */
      x.fillStyle = "#D70B33";
      drawRoundRect(x, W / 2 - 150, cy + 150, 300, 40, 20); x.fill();
      x.fillStyle = "#ffffff";
      x.font = "700 19px 'Plus Jakarta Sans', sans-serif";
      x.fillText("#ÉclairerLeMonde", W / 2, cy + 176);

      finish();
    };
    img.onerror = finish;
    img.src = e.photo;
  }

  function render() {
    const all = entries();
    grid.innerHTML = "";
    empty.classList.toggle("hidden", all.length > 0);

    /* Compteur de participants */
    const countEl = $("#wall-count");
    if (all.length > 0) {
      countEl.classList.remove("hidden");
      $("#wall-count-n").textContent = all.length;
      $("#wall-count-txt").textContent = all.length > 1
        ? "lumières brillent déjà sur le mur — et la vôtre ?"
        : "lumière brille déjà sur le mur — et la vôtre ?";
    } else countEl.classList.add("hidden");

    const reversed = all.slice().reverse();
    const slice = reversed.slice(0, visibleCount);

    if (moreWrap) {
      const remaining = reversed.length - slice.length;
      moreWrap.classList.toggle("hidden", remaining <= 0);
      if (moreBtn && remaining > 0) {
        moreBtn.textContent = `✨ Voir plus de lumières (${remaining})`;
      }
    }

    slice.forEach((e, i) => {
      const fig = document.createElement("figure");
      fig.className = "wall-card";
      fig.style.setProperty("--d", `${Math.min(i * 60, 600)}ms`);
      const ph = document.createElement("div");
      ph.className = "wc-ph";
      const img = document.createElement("img");
      img.src = e.photo;
      img.alt = e.nom || "Participant";
      img.width = 250;
      img.height = 250;
      img.loading = "lazy";
      img.decoding = "async";
      ph.appendChild(img);
      const cap = document.createElement("figcaption");
      cap.className = "wc-name";
      cap.textContent = e.nom;
      fig.append(ph, cap);
      if (e.msg) {
        const msg = document.createElement("span");
        msg.className = "wc-msg";
        msg.textContent = e.msg;
        fig.appendChild(msg);
      }
      /* Cœur « like » de la photo */
      const pid = photoId(e);
      const like = document.createElement("button");
      like.type = "button";
      like.className = "wc-like";
      like.title = "J'aime cette lumière";
      like.setAttribute("aria-label", `J'aime la photo de ${e.nom || "ce participant"}`);
      like.innerHTML = getLikes()[pid] ? "❤️<b>1</b>" : "🤍";
      if (getLikes()[pid]) like.classList.add("on");
      like.addEventListener("click", (ev) => {
        ev.preventDefault(); ev.stopPropagation();
        toggleLike(pid, like);
      });
      fig.appendChild(like);
      /* Téléchargement de la photo avec le cadre Éclairer le Monde */
      const dl = document.createElement("button");
      dl.type = "button";
      dl.className = "wc-dl";
      dl.title = "Télécharger ma photo avec le cadre Éclairer le Monde";
      dl.setAttribute("aria-label", "Télécharger la photo avec le cadre Éclairer le Monde");
      dl.textContent = "⬇️";
      dl.addEventListener("click", (ev) => {
        ev.preventDefault(); ev.stopPropagation();
        drawFramedPhoto(e);
        toast("⬇️ Votre photo avec le cadre Éclairer le Monde est téléchargée ✨");
      });
      fig.appendChild(dl);
      /* Clic sur le polaroïd : aperçu en grand */
      fig.title = "Voir en grand";
      fig.addEventListener("click", () => openLightbox(e));
      grid.appendChild(fig);
    });
  }

  moreBtn?.addEventListener("click", () => {
    visibleCount += PAGE_SIZE;
    render();
  });

  /* ---------- Lightbox du mur des lumières ---------- */
  const lightbox = $("#wall-lightbox");
  function openLightbox(e) {
    $("#wl-img").src = e.photo;
    $("#wl-name").textContent = e.nom || "";
    $("#wl-msg").textContent = e.msg || "";
    $("#wl-msg").classList.toggle("hidden", !e.msg);
    lightbox.classList.remove("hidden");
  }
  function closeLightbox() { lightbox.classList.add("hidden"); }
  $("#wl-close").addEventListener("click", closeLightbox);
  lightbox.addEventListener("click", (ev) => { if (ev.target === lightbox) closeLightbox(); });
  addEventListener("keydown", (ev) => { if (ev.key === "Escape") closeLightbox(); });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nom = $("#w-nom").value.trim();
    if (!photoData || !nom) {
      error.classList.remove("hidden");
      return;
    }
    error.classList.add("hidden");
    const payload = { nom, msg: $("#w-msg").value.trim(), photo: photoData, at: new Date().toISOString() };
    try {
      const res = await fetch("/api/photo-wall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        /* refus du serveur (photo trop lourde, etc.) : on prévient sans fake local */
        toast(json.error || "Envoi impossible pour le moment 😕");
        return;
      }
      serverEntries = [...(serverEntries ?? []), json.entry];
    } catch {
      const arr = load();
      arr.push(payload);
      save(arr);
    }
    form.reset();
    photoData = null;
    fileInput.value = "";
    preview.src = "";
    preview.classList.add("hidden");
    placeholder.classList.remove("hidden");
    drop.classList.remove("has-photo");
    render();
    toast("📸 Vous êtes sur le mur ! Cliquez ⬇️ pour télécharger votre photo avec le cadre ✨");
    launchConfetti();
    grid.scrollIntoView({ behavior: isReducedMotion() ? "auto" : "smooth", block: "nearest" });
  });

  render();
})();

/* =========================================================
   LECTEUR DE MUSIQUE — cantiques de Noël (avec Fondu Progressif 3s)
   ========================================================= */
(function initMusic() {
  const KEY_VOL = "noel-aboisso-volume";
  const audio = new Audio();
  window.__musicAudio = audio; // pour les tests / débogage
  audio.preload = "metadata";
  /* Volume stocké en 0–1, borné par sécurité (range HTMLMediaElement)
     — les anciennes valeurs 0–100 sont converties automatiquement */
  let savedVol = 0.7;
  try {
    savedVol = parseFloat(localStorage.getItem(KEY_VOL) ?? "0.7") || 0.7;
  } catch {}
  if (savedVol > 1) savedVol = savedVol / 100;
  let targetVolume = Math.min(Math.max(savedVol, 0), 1);
  audio.volume = targetVolume;

  let idx = -1;
  let shuffle = true;
  let started = false;
  let fadeTimer = null;

  const fab = $("#music-fab");
  const panel = $("#music-panel");
  const list = $("#mp-list");
  if (!fab || !panel || !list) return;
  const els = {
    title: $("#mp-title"), bar: $("#mp-bar"), cur: $("#mp-cur"), dur: $("#mp-dur"),
    play: $("#mp-play"), prev: $("#mp-prev"), next: $("#mp-next"),
    shuffle: $("#mp-shuffle"), vol: $("#mp-vol"), progress: $("#mp-progress"), close: $("#mp-close"),
  };

  /* --- Liste des chants --- */
  PLAYLIST.forEach((t, i) => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${i + 1}. ${t.title}</span><span class="dur"></span>`;
    li.addEventListener("click", () => playIndex(i, false));
    list.appendChild(li);
  });

  function fmtTime(s) {
    if (!isFinite(s)) return "0:00";
    return `${Math.floor(s / 60)}:${pad(Math.floor(s % 60))}`;
  }

  function updateActive() {
    [...list.children].forEach((li, i) => li.classList.toggle("active", i === idx));
  }

  function loadMeta() {
    const t = PLAYLIST[idx];
    els.title.textContent = `🎵 ${t.title}`;
    updateActive();
  }

  /* Fondu sonore progressif (fade-in sur 3 secondes à l'ouverture de l'enveloppe) */
  function startFadeIn() {
    clearInterval(fadeTimer);
    audio.volume = Math.min(0.03, targetVolume);
    const steps = 30;
    const stepTime = 100; // 30 * 100ms = 3 secondes
    let currentStep = 0;
    fadeTimer = setInterval(() => {
      currentStep += 1;
      const nextVol = (targetVolume * currentStep) / steps;
      audio.volume = Math.min(targetVolume, Math.max(0, nextVol));
      if (currentStep >= steps) clearInterval(fadeTimer);
    }, stepTime);
  }

  let loadToken = 0;
  function playIndex(i, withFade = false) {
    idx = (i + PLAYLIST.length) % PLAYLIST.length;
    const token = ++loadToken;
    clearInterval(fadeTimer);
    audio.pause();
    audio.src = PLAYLIST[idx].src;
    audio.volume = withFade ? Math.min(0.03, targetVolume) : targetVolume;
    started = true;
    loadMeta();
    audio.play().then(() => {
      if (withFade && token === loadToken) startFadeIn();
    }).catch((err) => {
      audio.volume = targetVolume;
      if (err.name === "NotAllowedError" && token === loadToken) {
        els.title.textContent = "Appuyez sur ▶ pour écouter ✨";
      }
      /* AbortError : un autre chant a été lancé juste après — on l'ignore */
    });
  }

  function playRandom(withFade = false) {
    if (PLAYLIST.length < 2) return playIndex(0, withFade);
    let next;
    do { next = Math.floor(Math.random() * PLAYLIST.length); } while (next === idx);
    playIndex(next, withFade);
  }

  function nextTrack() { shuffle ? playRandom(false) : playIndex(idx + 1, false); }
  function prevTrack() { shuffle ? playRandom(false) : playIndex(idx - 1, false); }

  function updatePlayState() {
    const playing = !audio.paused && !audio.ended;
    els.play.textContent = playing ? "⏸" : "▶";
    fab.classList.toggle("paused", !playing);
    fab.title = playing ? "Musique en cours — voir le lecteur" : "Musique en pause — voir le lecteur";
  }

  /* --- Contrôles --- */
  els.play.addEventListener("click", () => {
    if (!started) return playRandom(false);
    audio.paused ? audio.play() : audio.pause();
  });
  els.next.addEventListener("click", nextTrack);
  els.prev.addEventListener("click", prevTrack);
  audio.addEventListener("ended", nextTrack);
  audio.addEventListener("pause", updatePlayState);
  audio.addEventListener("play", updatePlayState);

  els.shuffle.addEventListener("click", () => {
    shuffle = !shuffle;
    els.shuffle.classList.toggle("on", shuffle);
    toast(shuffle ? "🔀 Lecture aléatoire activée" : "➡️ Lecture dans l'ordre");
  });

  els.vol.addEventListener("input", () => {
    clearInterval(fadeTimer);
    targetVolume = els.vol.value / 100;
    audio.volume = targetVolume;
    try { localStorage.setItem(KEY_VOL, String(targetVolume)); } catch {}
  });
  els.vol.value = Math.round(targetVolume * 100);

  audio.addEventListener("timeupdate", () => {
    if (audio.duration) {
      const pct = Math.round((audio.currentTime / audio.duration) * 100);
      els.bar.style.width = `${pct}%`;
      els.progress.setAttribute("aria-valuenow", String(pct));
      els.cur.textContent = fmtTime(audio.currentTime);
      els.dur.textContent = fmtTime(audio.duration);
    }
  });
  audio.addEventListener("loadedmetadata", () => {
    const li = list.children[idx];
    if (li) li.querySelector(".dur").textContent = fmtTime(audio.duration);
  });
  els.progress.addEventListener("click", (e) => {
    if (!audio.duration) return;
    const rect = els.progress.getBoundingClientRect();
    audio.currentTime = ((e.clientX - rect.left) / rect.width) * audio.duration;
  });

  /* --- Bouton flottant & panneau --- */
  let panelOpen = false;
  function togglePanel(force) {
    panelOpen = force ?? !panelOpen;
    panel.classList.toggle("hidden", !panelOpen);
    if (panelOpen) updatePlayState();
  }
  fab.addEventListener("click", () => {
    if (!started) { playRandom(false); togglePanel(true); return; }
    togglePanel();
  });
  els.close.addEventListener("click", () => togglePanel(false));

  /* --- Démarrage automatique à l'ouverture de l'enveloppe (avec fondu 3s) --- */
  window.__startMusic = (withFade = true) => {
    if (started) return;
    playRandom(withFade);
  };
})();
