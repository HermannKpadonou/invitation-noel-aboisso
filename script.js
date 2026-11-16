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
  // Numéro WhatsApp du contact (format international sans +) :
  contactPhone: "2250574152955",
};

/* Numéro local ivoirien → format international pour les liens WhatsApp */
function normalizePhone(t) {
  let p = String(t || "").replace(/\D/g, "");
  if (p.startsWith("225")) return p;           // déjà au format international
  if (p.startsWith("0")) return "225" + p;     // numéro local 0X XX XX XX XX
  if (p.length === 8) return "225" + p;        // ancien format ivoirien à 8 chiffres
  return p;
}

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
  const COLORS = ["#ffffff", "#EBDCC3", "#DCE6E0"];

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
    c: ["#C8A97E", "#3D5A4C", "#ffffff", "#8FB0A0", "#EBDCC3"][(Math.random() * 5) | 0],
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

  /* Statut membre / ami : montrer ou cacher les champs de branche & localité
     et le bloc d'invitations (réservé aux membres) */
  const membreFields = $("#membre-fields");
  const inviteBlock = $("#invite-block");
  function syncStatut() {
    const statut = form.querySelector('input[name="statut"]:checked')?.value || "membre";
    membreFields.classList.toggle("hidden", statut !== "membre");
    inviteBlock.classList.toggle("hidden", statut !== "membre");
  }
  form.querySelectorAll('input[name="statut"]').forEach((r) => r.addEventListener("change", syncStatut));
  syncStatut();

  /* ---------- Invitations dynamiques : amis & membres inactifs ---------- */
  const invLists = { ami: $("#inv-amis"), inactif: $("#inv-inactifs") };
  const invKey = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
  const telKey = (s) => String(s || "").replace(/\D/g, "");

  function addInviteRow(type) {
    const row = document.createElement("div");
    row.className = "inv-row";
    const phNom = type === "ami" ? "Ex. Koffi Yao" : "Ex. Sœur Adjoua";
    row.innerHTML = `
      <div class="field"><label>Son nom</label><input class="inv-nom" type="text" maxlength="80" placeholder="${phNom}" /></div>
      <div class="field"><label>Son contact WhatsApp</label><input class="inv-tel" type="tel" inputmode="tel" placeholder="07 00 00 00 00" /></div>
      <button class="inv-x" type="button" title="Retirer cette personne">✕</button>
      <p class="inv-msg hidden"></p>`;
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
      if (j.dup) rowMsg(row, `⚠️ « ${nom} » a déjà été invité·e${j.info ? " — " + j.info : ""} ✋`);
      else rowMsg(row, "✓ Pas encore invité·e — parfait !", true);
    } catch { rowMsg(row, ""); }
  }

  ["ami", "inactif"].forEach((t) => {
    document.querySelector(`[data-add-invite="${t}"]`).addEventListener("click", () => addInviteRow(t));
    addInviteRow(t);
  });

  /* Boutons WhatsApp pour chaque personne invitée (après envoi de la réponse) */
  function renderInvitesShare(invites, membreNom) {
    const box = $("#invites-share");
    box.innerHTML = "";
    const list = (invites || []).filter((i) => i && i.nom);
    if (!list.length) { box.classList.add("hidden"); return; }
    const h = document.createElement("p");
    h.className = "is-title";
    h.textContent = "💌 Envoyez-leur l'invitation par WhatsApp :";
    box.appendChild(h);
    const base = location.protocol.startsWith("http") ? location.origin + location.pathname : "https://eclairerlemonde.org/";
    for (const inv of list) {
      const msg = `✦ Éclairer le Monde ✦\nCher·ère ${inv.nom},\n${membreNom} vous invite à la fête de Noël « Éclairer le Monde » 🎄\n🎭 Théâtre · 🎶 Chants · 🎁 Cadeaux · ✨ Surprises\n📅 Samedi 19 décembre 2026 · 10h00 – 15h00\n📍 Salle des fêtes de la mairie d'Aboisso\n✨ Entrée gratuite — toute la famille est la bienvenue !\n💌 Détails : ${base}`;
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
    const wa = d.tel ? normalizePhone(d.tel) : CONFIG.contactPhone;
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

    /* arche vert sauge */
    const AG = x.createLinearGradient(0, 50, 0, H - 210);
    AG.addColorStop(0, "#4A6E5D"); AG.addColorStop(.5, "#3D5A4C"); AG.addColorStop(1, "#2C4238");
    archPath(x, W / 2, 50, W - 90, H - 260);
    x.fillStyle = AG; x.fill();

    /* liseré doré intérieur */
    x.strokeStyle = "rgba(200,169,126,.75)"; x.lineWidth = 3;
    archPath(x, W / 2, 64, W - 118, H - 288);
    x.stroke();

    /* étoile dorée */
    x.fillStyle = "#C8A97E";
    drawStar(x, W / 2, 215, 44, 18);

    x.textAlign = "center";
    x.fillStyle = "#EBDCC3";
    x.font = "italic 600 36px 'Playfair Display', Georgia, serif";
    x.fillText("Invitation", W / 2, 305);

    x.fillStyle = "#ffffff";
    x.font = "700 40px Plus Jakarta Sans, sans-serif";
    let y = wrapText(x, "Célébrez la naissance de Jésus-Christ avec nous", W / 2, 365, W - 220, 52);

    /* badge date */
    x.fillStyle = "#C8A97E";
    roundRect(x, W / 2 - 190, y + 36, 380, 48, 24); x.fill();
    x.fillStyle = "#1E2F27";
    x.font = "800 24px Plus Jakarta Sans, sans-serif";
    x.fillText("DATE · 19 DÉCEMBRE 2026", W / 2, y + 69);

    x.fillStyle = "#DCE6E0";
    x.font = "500 26px Plus Jakarta Sans, sans-serif";
    x.fillText("Invitation pour", W / 2, y + 128);
    x.fillStyle = "#ffffff";
    x.font = "800 44px Plus Jakarta Sans, sans-serif";
    x.fillText(d.nom.length > 22 ? d.nom.slice(0, 22) + "…" : d.nom, W / 2, y + 178);

    x.fillStyle = "#EBDCC3";
    x.font = "600 28px Plus Jakarta Sans, sans-serif";
    x.fillText("10h00 – 15h00", W / 2, y + 232);
    x.fillStyle = "#ffffff";
    x.font = "600 28px Plus Jakarta Sans, sans-serif";
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
        x.fillStyle = "#EBDCC3";
        x.font = "400 20px Plus Jakarta Sans, sans-serif";
        x.fillText("Scannez pour rouvrir votre invitation", W / 2, H - 60);
        x.fillStyle = "#DCE6E0";
        x.font = "500 22px Plus Jakarta Sans, sans-serif";
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
  const camModal = $("#cam-modal");
  const camVideo = $("#cam-video");
  const camCanvas = $("#cam-canvas");
  let camStream = null;
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
    photoData = camCanvas.toDataURL("image/jpeg", 0.72);
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
  function roundedRect(x, px, py, w, h, r) {
    x.beginPath();
    x.moveTo(px + r, py);
    x.arcTo(px + w, py, px + w, py + h, r);
    x.arcTo(px + w, py + h, px, py + h, r);
    x.arcTo(px, py + h, px, py, r);
    x.arcTo(px, py, px + w, py, r);
    x.closePath();
  }

  function drawFramedPhoto(e) {
    const W = 760, H = 980;
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const x = c.getContext("2d");

    /* Cadre sauge extérieur */
    const RG = x.createLinearGradient(0, 0, 0, H);
    RG.addColorStop(0, "#4A6E5D"); RG.addColorStop(.55, "#3D5A4C"); RG.addColorStop(1, "#2C4238");
    roundedRect(x, 0, 0, W, H, 30); x.fillStyle = RG; x.fill();

    /* Fond crème intérieur */
    roundedRect(x, 16, 16, W - 32, H - 32, 18); x.fillStyle = "#fffdf8"; x.fill();

    /* Liseré doré */
    x.strokeStyle = "rgba(200,169,126,.9)"; x.lineWidth = 2.5;
    roundedRect(x, 28, 28, W - 56, H - 56, 14); x.stroke();

    /* Photo recadrée en carré */
    const px = 64, py = 64, pw = W - 128;

    const img = new Image();
    const finish = () => {
      const a = document.createElement("a");
      a.download = `eclairer-le-monde-${(e.nom || "photo").replace(/\s+/g, "-").toLowerCase()}.png`;
      a.href = c.toDataURL("image/png");
      a.click();
    };
    img.onload = () => {
      /* photo carrée (les photos du mur sont déjà carrées) */
      x.save();
      roundedRect(x, px, py, pw, pw, 12); x.clip();
      const side = Math.min(img.width, img.height);
      x.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, px, py, pw, pw);
      x.restore();
      /* fin contour doré de la photo */
      x.strokeStyle = "rgba(200,169,126,.95)"; x.lineWidth = 3;
      roundedRect(x, px, py, pw, pw, 12); x.stroke();

      /* Étoile dorée */
      x.fillStyle = "#C8A97E";
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
      x.fillStyle = "#2C4238";
      x.font = "italic 600 40px 'Playfair Display', Georgia, serif";
      x.fillText("Éclairer le Monde", W / 2, cy + 56);

      /* Nom du participant */
      if (e.nom) {
        x.fillStyle = "#2D2D2D";
        x.font = "700 26px Plus Jakarta Sans, sans-serif";
        x.fillText(e.nom.length > 30 ? e.nom.slice(0, 30) + "…" : e.nom, W / 2, cy + 94);
      }

      /* Date & lieu */
      x.fillStyle = "#8C8479";
      x.font = "500 18px Plus Jakarta Sans, sans-serif";
      x.fillText("19 · 12 · 2026  ·  Salle des fêtes de la mairie d'Aboisso", W / 2, cy + 126);

      /* Hashtag sur pastille sauge */
      x.fillStyle = "#3D5A4C";
      roundedRect(x, W / 2 - 150, cy + 150, 300, 40, 20); x.fill();
      x.fillStyle = "#ffffff";
      x.font = "700 19px Plus Jakarta Sans, sans-serif";
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
    toast("📸 Vous êtes sur le mur ! Cliquez ⬇️ pour télécharger votre photo avec le cadre ✨");
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
