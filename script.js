/* =========================================================
   Éclairer le Monde — Noël à Aboisso · script principal
   ========================================================= */

/* ---------- CONFIG (modifiable facilement) ---------- */
const CONFIG = {
  eventStart: "2026-12-19T10:00:00+00:00", // Aboisso = UTC+0
  eventEnd:   "2026-12-19T15:00:00+00:00",
  rsvpDeadline: "2026-12-12",
  eventName: "Grand Noël des Enfants & Familles — Éclairer le Monde",
  place: "Salle des fêtes de la mairie d'Aboisso, Côte d'Ivoire",
  // Numéro WhatsApp du contact (format international sans +) — à adapter :
  contactPhone: "2250700000000",
};

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

/* ---------- Helpers ---------- */
const $ = (sel) => document.querySelector(sel);
const pad = (n) => String(n).padStart(2, "0");

function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove("show"), 3200);
}

/* =========================================================
   ÉCRAN D'OUVERTURE
   ========================================================= */
(function initIntro() {
  const intro = $("#intro");
  const envelope = $("#envelope");
  envelope.setAttribute("tabindex", "0");
  envelope.setAttribute("role", "button");
  envelope.setAttribute("aria-label", "Ouvrir l'invitation");

  let opened = false;
  function open() {
    if (opened) return;
    opened = true;
    if (window.__startMusic) window.__startMusic(); // 🎵 la fête commence en musique
    intro.classList.add("env-open");                 // 1) la carte monte de l'enveloppe
    setTimeout(() => intro.classList.add("env-anim"), 1100);  // 2) l'enveloppe s'envole, la carte reste
    setTimeout(() => {
      intro.classList.add("opening");                // 3) l'écran d'intro s'estompe
      document.body.style.overflow = "";
      launchConfetti();
    }, 2200);
    setTimeout(() => intro.remove(), 3000);
  }
  envelope.addEventListener("click", open);
  envelope.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
  });
  document.body.style.overflow = "hidden";
})();

/* =========================================================
   NEIGE (canvas)
   ========================================================= */
(function initSnow() {
  const canvas = $("#snow");
  const ctx = canvas.getContext("2d");
  let flakes = [];
  const COLORS = ["#ffffff", "#ffe3a3", "#ffd9d9"];

  function resize() { canvas.width = innerWidth; canvas.height = innerHeight; }
  resize();
  addEventListener("resize", resize);

  function makeFlakes() {
    const count = Math.min(90, Math.floor(innerWidth / 14));
    flakes = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 2.6 + 1.2,
      s: Math.random() * 0.5 + 0.25,       // vitesse chute
      d: Math.random() * Math.PI * 2,       // dérive
      c: COLORS[(Math.random() * COLORS.length) | 0],
      a: Math.random() * 0.5 + 0.25,
    }));
  }
  makeFlakes();
  addEventListener("resize", makeFlakes);

  (function loop() {
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
    requestAnimationFrame(loop);
  })();
})();

/* =========================================================
   CONFETTIS (à l'ouverture de l'enveloppe)
   ========================================================= */
function launchConfetti() {
  const canvas = $("#snow");
  const ctx = canvas.getContext("2d");
  const pieces = Array.from({ length: 120 }, () => ({
    x: Math.random() * canvas.width,
    y: -20 - Math.random() * canvas.height * 0.4,
    w: 6 + Math.random() * 6,
    h: 8 + Math.random() * 8,
    vy: 2 + Math.random() * 3,
    vx: Math.random() * 2 - 1,
    rot: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.2,
    c: ["#f5c04e", "#c81d33", "#ffffff", "#e63950", "#ffe3a3"][(Math.random() * 5) | 0],
  }));
  let frames = 0;
  (function anim() {
    if (frames++ > 260) return;
    for (const p of pieces) {
      p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      if (p.y > canvas.height + 20 && frames < 200) { p.y = -20; p.x = Math.random() * canvas.width; }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = Math.max(0, 1 - frames / 260);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    requestAnimationFrame(anim);
  })();
}

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
  const hero = document.querySelector(".hero");
  function onScroll() {
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    bar.style.transform = `scaleX(${max ? h.scrollTop / max : 0})`;
    const show = h.scrollTop > (hero ? hero.offsetHeight - 140 : 400);
    nav.classList.toggle("show", show);
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
  if (!matchMedia("(pointer:fine)").matches) return;
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
  if (!matchMedia("(pointer:fine)").matches) return;
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
   PARALLAXE de la photo
   ========================================================= */
(function initParallax() {
  const img = document.querySelector(".photo-band img");
  if (!img) return;
  let ticking = false;
  function update() {
    const r = img.getBoundingClientRect();
    const p = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
    img.style.transform = `translateY(${p * -26}px) scale(1.15)`;
    ticking = false;
  }
  addEventListener("scroll", () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  update();
})();

/* =========================================================
   COMPTE À REBOURS + CALENDRIER
   ========================================================= */
(function initCountdown() {
  const start = new Date(CONFIG.eventStart);
  const end = new Date(CONFIG.eventEnd);
  const el = {
    d: $("#cd-days"), h: $("#cd-hours"), m: $("#cd-mins"), s: $("#cd-secs"), inline: $("#days-inline"),
  };

  function setVal(el, v) {
    if (el.textContent === v) return;
    el.textContent = v;
    el.classList.remove("tick");
    void el.offsetWidth; /* relance l'animation */
    el.classList.add("tick");
  }
  function tick() {
    const now = new Date();
    let diff = start - now;
    if (diff <= 0) {
      const during = now < end;
      if (during) {
        $("#countdown").innerHTML = '<div class="cd-card" style="min-width:200px"><span style="font-size:1.2rem">🎄 C\'est en cours !</span><small>Jusqu\'à 15h00</small></div>';
      } else {
        $("#countdown").innerHTML = '<div class="cd-card" style="min-width:200px"><span style="font-size:1.1rem">Merci d\'avoir éclairé le monde ✦</span><small>Événement passé</small></div>';
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
    el.inline.textContent = d;
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
  $("#btn-gcal").href = `https://calendar.google.com/calendar/render?${params}`;

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
  $("#btn-ics").href = "data:text/calendar;charset=utf-8," + encodeURIComponent(ics);
})();

/* =========================================================
   COPIER L'ADRESSE / LE LIEN
   ========================================================= */
$("#copy-address").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(CONFIG.place);
    toast("📍 Adresse copiée !");
  } catch {
    toast("Adresse : " + CONFIG.place);
  }
});

$("#btn-copy-link").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(location.href);
    toast("🔗 Lien copié ! Collez-le où vous voulez.");
  } catch {
    toast("Impossible de copier le lien 😕");
  }
});

/* ---------- Partage WhatsApp ---------- */
(function initShare() {
  const text = "✦ Éclairer le Monde ✦\nVous êtes invité·e au Grand Noël des Enfants & Familles 🎄\n🎭 Théâtre · 🎶 Chants · 🎁 Cadeaux · ✨ Surprises\n📅 Samedi 19 décembre 2026, 10h–15h\n📍 Salle des fêtes de la mairie d'Aboisso\nEntrée gratuite — toute la famille est la bienvenue !";
  const url = location.href;
  $("#btn-share-wa").href = `https://wa.me/?text=${encodeURIComponent(text + "\n👉 " + url)}`;
})();

/* =========================================================
   RSVP + CARTE D'INVITATION
   ========================================================= */
const RSVP_KEY = "noel-aboisso-rsvp";

function saveRsvp(data) {
  const all = JSON.parse(localStorage.getItem(RSVP_KEY) || "{}");
  all[data.num] = data;
  localStorage.setItem(RSVP_KEY, JSON.stringify(all));
}
function getRsvps() {
  return JSON.parse(localStorage.getItem(RSVP_KEY) || "{}");
}

(function initRsvp() {
  const form = $("#rsvp-form");
  const done = $("#rsvp-done");
  const modal = $("#invite-modal");
  const card = $("#invite-card");
  let currentInvite = null;

  /* Si une réponse existe déjà : proposer de voir le billet */
  const rsvps = getRsvps();
  let last = Object.values(rsvps).pop();
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
      tel: (fd.get("tel") || "").trim(),
      people: Math.min(Math.max(parseInt(fd.get("accomp") || "1", 10) || 1, 1), 30),
      note: (fd.get("note") || "").trim(),
      at: new Date().toISOString(),
    };

    /* Envoi au serveur (back office) — repli sur le stockage local si absent */
    try {
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const saved = (await res.json()).entry;
        if (saved && saved.num) data.num = saved.num;
      }
    } catch { /* site ouvert en fichier local : stockage local uniquement */ }

    saveRsvp(data);
    currentInvite = data;
    last = data; /* le bouton « Revoir ma carte » doit montrer la dernière réponse */

    /* Afficher la carte d'invitation (elle s'ouvre en animation) */
    showInvite(data);
    form.reset();
    toast("💌 Réponse envoyée — votre carte d'invitation est prête !");
    launchConfetti();
    setTimeout(() => {
      form.classList.add("hidden");
      $("#done-name").textContent = nom.split(" ")[0];
      done.classList.remove("hidden");
      done.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 600);
  });

  /* Lien de la carte (pour le QR) — repli si le site est ouvert en fichier local */
  function inviteLink(d) {
    if (location.protocol.startsWith("http")) return location.origin + location.pathname + "#billet-" + d.num;
    return "https://eclairerlemonde.org/#billet-" + d.num;
  }

  /* QR code — encodeURI préserve la structure de l'URL et encode les accents */
  function makeQR(text) {
    try {
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
    showInvite._t1 = setTimeout(() => card.classList.add("open"), 380);
    modal.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  /* Touchez la carte : refermer / rouvrir la couverture */
  card.addEventListener("click", () => card.classList.toggle("open"));

  /* WhatsApp : partage de l'invitation */
  $("#wa-invite").addEventListener("click", () => {
    if (!currentInvite) { toast("Répondez d'abord au formulaire 🙏"); return; }
    const d = currentInvite;
    const msg = `✦ Éclairer le Monde ✦\nCher·ère ${d.nom}, vous êtes invité·e à célébrer la naissance de Jésus-Christ avec nous 🎄\n📅 Samedi 19 décembre 2026 · 10h–15h\n📍 Salle des fêtes de la mairie d'Aboisso\n💌 Votre invitation : ${inviteLink(d)}`;
    const wa = d.tel ? d.tel.replace(/\D/g, "") : CONFIG.contactPhone;
    window.open(`https://wa.me/${wa}?text=${encodeURIComponent(msg)}`, "_blank");
  });

  $("#close-invite").addEventListener("click", () => modal.classList.add("hidden"));

  /* Génération de la carte en PNG (canvas) */
  function roundRect(x, px, py, w, h, r) {
    x.beginPath();
    x.moveTo(px + r, py);
    x.arcTo(px + w, py, px + w, py + h, r);
    x.arcTo(px + w, py + h, px, py + h, r);
    x.arcTo(px, py + h, px, py, r);
    x.arcTo(px, py, px + w, py, r);
    x.closePath();
  }
  function wrapText(x, text, cx, y, maxW, lineH) {
    const words = text.split(" ");
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

  function downloadInvite(d) {
    const W = 760, H = 1030;
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const x = c.getContext("2d");

    /* fond crème */
    x.fillStyle = "#fffdf8"; x.fillRect(0, 0, W, H);

    /* arche rouge */
    const AG = x.createLinearGradient(0, 50, 0, H - 210);
    AG.addColorStop(0, "#e63950"); AG.addColorStop(.5, "#c81d33"); AG.addColorStop(1, "#8f1320");
    archPath(x, W / 2, 50, W - 90, H - 260);
    x.fillStyle = AG; x.fill();

    /* liseré doré intérieur */
    x.strokeStyle = "rgba(245,192,78,.75)"; x.lineWidth = 3;
    archPath(x, W / 2, 64, W - 118, H - 288);
    x.stroke();

    /* étoile dorée */
    x.fillStyle = "#f5c04e";
    drawStar(x, W / 2, 215, 44, 18);

    x.textAlign = "center";
    x.fillStyle = "#ffe3a3";
    x.font = "italic 600 36px 'Playfair Display', Georgia, serif";
    x.fillText("Invitation", W / 2, 305);

    x.fillStyle = "#ffffff";
    x.font = "700 40px Poppins, sans-serif";
    let y = wrapText(x, "Célébrez la naissance de Jésus-Christ avec nous", W / 2, 365, W - 220, 52);

    /* badge date */
    x.fillStyle = "#f5c04e";
    roundRect(x, W / 2 - 190, y + 36, 380, 48, 24); x.fill();
    x.fillStyle = "#5d0a13";
    x.font = "800 24px Poppins, sans-serif";
    x.fillText("DATE · 19 DÉCEMBRE 2026", W / 2, y + 69);

    x.fillStyle = "#ffd9d9";
    x.font = "500 26px Poppins, sans-serif";
    x.fillText("Invitation pour", W / 2, y + 128);
    x.fillStyle = "#ffffff";
    x.font = "800 44px Poppins, sans-serif";
    x.fillText(d.nom.length > 22 ? d.nom.slice(0, 22) + "…" : d.nom, W / 2, y + 178);

    x.fillStyle = "#ffe3a3";
    x.font = "600 28px Poppins, sans-serif";
    x.fillText("10h00 – 15h00", W / 2, y + 232);
    x.fillStyle = "#ffffff";
    x.font = "600 28px Poppins, sans-serif";
    wrapText(x, "Salle des fêtes de la mairie d'ABOISSO", W / 2, y + 276, W - 200, 38);

    /* QR code */
    const finish = () => {
      const a = document.createElement("a");
      a.download = `invitation-noel-aboisso-${d.num}.png`;
      a.href = c.toDataURL("image/png");
      a.click();
    };
    const qrData = makeQR(inviteLink(d));
    if (qrData) {
      const img = new Image();
      img.onload = () => {
        x.fillStyle = "#ffffff";
        roundRect(x, W / 2 - 70, H - 225, 140, 140, 14); x.fill();
        x.drawImage(img, W / 2 - 60, H - 215, 120, 120);
        x.fillStyle = "#ffe3a3";
        x.font = "400 20px Poppins, sans-serif";
        x.fillText("Scannez pour rouvrir votre invitation", W / 2, H - 60);
        x.fillStyle = "#ffd9d9";
        x.font = "500 22px Poppins, sans-serif";
        x.fillText("Église de Jésus-Christ des Saints des Derniers Jours", W / 2, H - 92);
        finish();
      };
      img.onerror = finish;
      img.src = qrData;
    } else finish();
  }

  $("#dl-invite").addEventListener("click", () => {
    const d = currentInvite ?? Object.values(getRsvps()).pop();
    if (d) { downloadInvite(d); toast("⬇️ Carte d'invitation téléchargée !"); }
  });

  /* Lien direct #billet-NUM (QR scanné) : rouvrir la carte correspondante */
  const mHash = location.hash.match(/^#billet-(\d+)$/);
  if (mHash) {
    const found = Object.values(getRsvps()).find((r) => String(r.num) === mHash[1]);
    if (found) {
      const tryShow = () => {
        if (document.querySelector("#intro")) { setTimeout(tryShow, 500); return; }
        showInvite(found);
      };
      tryShow();
    }
  }
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

  const load = () => JSON.parse(localStorage.getItem(KEY) || "[]");
  const save = (arr) => localStorage.setItem(KEY, JSON.stringify(arr));

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
      li.textContent = "Soyez la première personne à signer le livre d'or ✨";
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
    toast("✍️ Merci pour votre petit mot !");
    list.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });

  render();
})();

/* =========================================================
   MUR PHOTO — « Je serai là ! »
   ========================================================= */
(function initPhotoWall() {
  const KEY = "noel-aboisso-wall";
  const form = $("#wall-form");
  const grid = $("#wall-grid");
  const empty = $("#wall-empty");
  const drop = $("#wall-drop");
  const fileInput = $("#wall-photo");
  const preview = $("#wall-preview");
  const placeholder = $("#wall-placeholder");
  const error = $("#wall-error");
  let photoData = null;
  let serverEntries = null;

  const load = () => JSON.parse(localStorage.getItem(KEY) || "[]");
  const save = (arr) => localStorage.setItem(KEY, JSON.stringify(arr));
  const entries = () => serverEntries ?? load();

  /* Source de données : serveur si disponible, sinon stockage local */
  (async () => {
    try {
      const res = await fetch("/api/photo-wall");
      if (res.ok) { serverEntries = await res.json(); render(); }
    } catch { /* mode local */ }
  })();

  /* Recadrage carré + compression (canvas) — max 500px, JPEG q≈0.72 */
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
        resolve(c.toDataURL("image/jpeg", 0.72));
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

    all.slice().reverse().forEach((e, i) => {
      const fig = document.createElement("figure");
      fig.className = "wall-card";
      fig.style.setProperty("--d", `${Math.min(i * 70, 700)}ms`);
      const ph = document.createElement("div");
      ph.className = "wc-ph";
      const img = document.createElement("img");
      img.src = e.photo;
      img.alt = e.nom;
      img.loading = "lazy";
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
      grid.appendChild(fig);
    });
  }

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
    toast("📸 Vous êtes sur le mur — à très bientôt sur place !");
    launchConfetti();
    grid.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });

  render();
})();

/* =========================================================
   LECTEUR DE MUSIQUE — cantiques de Noël
   ========================================================= */
(function initMusic() {
  const KEY_VOL = "noel-aboisso-volume";
  const audio = new Audio();
  window.__musicAudio = audio; // pour les tests / débogage
  audio.preload = "metadata";
  /* Volume stocké en 0–1, borné par sécurité (range HTMLMediaElement)
     — les anciennes valeurs 0–100 sont converties automatiquement */
  let savedVol = parseFloat(localStorage.getItem(KEY_VOL) ?? "0.7") || 0.7;
  if (savedVol > 1) savedVol = savedVol / 100;
  audio.volume = Math.min(Math.max(savedVol, 0), 1);

  let idx = -1;
  let shuffle = true;
  let started = false;

  const fab = $("#music-fab");
  const panel = $("#music-panel");
  const list = $("#mp-list");
  const els = {
    title: $("#mp-title"), bar: $("#mp-bar"), cur: $("#mp-cur"), dur: $("#mp-dur"),
    play: $("#mp-play"), prev: $("#mp-prev"), next: $("#mp-next"),
    shuffle: $("#mp-shuffle"), vol: $("#mp-vol"), progress: $("#mp-progress"), close: $("#mp-close"),
  };

  /* --- Liste des chants --- */
  PLAYLIST.forEach((t, i) => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${i + 1}. ${t.title}</span><span class="dur"></span>`;
    li.addEventListener("click", () => playIndex(i));
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

  let loadToken = 0;
  function playIndex(i) {
    idx = (i + PLAYLIST.length) % PLAYLIST.length;
    const token = ++loadToken;
    audio.pause();
    audio.src = PLAYLIST[idx].src;
    started = true;
    loadMeta();
    audio.play().catch((err) => {
      if (err.name === "NotAllowedError" && token === loadToken) {
        els.title.textContent = "Appuyez sur ▶ pour écouter ✨";
      }
      /* AbortError : un autre chant a été lancé juste après — on l'ignore */
    });
  }

  function playRandom() {
    if (PLAYLIST.length < 2) return playIndex(0);
    let next;
    do { next = Math.floor(Math.random() * PLAYLIST.length); } while (next === idx);
    playIndex(next);
  }

  function nextTrack() { shuffle ? playRandom() : playIndex(idx + 1); }
  function prevTrack() { shuffle ? playRandom() : playIndex(idx - 1); }

  function updatePlayState() {
    const playing = !audio.paused && !audio.ended;
    els.play.textContent = playing ? "⏸" : "▶";
    fab.classList.toggle("paused", !playing);
    fab.title = playing ? "Musique en cours — voir le lecteur" : "Musique en pause — voir le lecteur";
  }

  /* --- Contrôles --- */
  els.play.addEventListener("click", () => {
    if (!started) return playRandom();
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
    audio.volume = els.vol.value / 100;
    localStorage.setItem(KEY_VOL, String(audio.volume));
  });
  els.vol.value = Math.round(audio.volume * 100);

  audio.addEventListener("timeupdate", () => {
    if (audio.duration) {
      els.bar.style.width = `${(audio.currentTime / audio.duration) * 100}%`;
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
    if (!started) { playRandom(); togglePanel(true); return; }
    togglePanel();
  });
  els.close.addEventListener("click", () => togglePanel(false));

  /* --- Démarrage automatique à l'ouverture de l'enveloppe --- */
  window.__startMusic = () => {
    if (started) return;
    playRandom();
  };
})();
