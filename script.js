/* =========================================================
   Il est le Cadeau · Noël à Aboisso — 24 Décembre 2026
   Script Principal : Design Ultra-Soft & Inscription 1-Écran
   ========================================================= */

const CONFIG = {
  eventStart: "2026-12-24T10:00:00+00:00", // Aboisso = UTC+0 (Jeudi 24 Décembre 2026)
  eventEnd:   "2026-12-24T15:00:00+00:00",
  rsvpDeadline: "2026-12-20",
  eventName: "Grand Noël des Enfants & Familles — Il est le Cadeau · Éclairer le Monde",
  place: "Salle des fêtes de la mairie d'Aboisso, Côte d'Ivoire",
  contactPhone: "2250574152955",
};

/* ---------- Utilitaires partagés ---------- */
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
  x.arcTo(px, y + h, x, y, r);
  x.arcTo(px, py, px + w, py, r);
  x.closePath();
};
const playChime = ELW.playChime || (() => {});
const isReducedMotion = ELW.isReducedMotion || (() => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

/* ---------- Service Worker (PWA) ---------- */
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

/* ---------- Bascule Mode Jour Soft / Nuit Douce ---------- */
(function initTheme() {
  const THEME_KEY = "noel-aboisso-theme";
  const html = document.documentElement;
  const metaTheme = $("#meta-theme-color");

  function applyTheme(mode) {
    const isNight = mode === "night";
    if (isNight) html.setAttribute("data-theme", "night");
    else html.removeAttribute("data-theme");
    if (metaTheme) metaTheme.setAttribute("content", isNight ? "#15060B" : "#FDFBF9");
    if ($("#tt-icon")) $("#tt-icon").textContent = isNight ? "☀️" : "🌙";
  }

  let current = "day";
  try { current = localStorage.getItem(THEME_KEY) || "day"; } catch {}
  applyTheme(current);

  $("#theme-toggle")?.addEventListener("click", () => {
    current = current === "night" ? "day" : "night";
    try { localStorage.setItem(THEME_KEY, current); } catch {}
    applyTheme(current);
    toast(current === "night" ? "🌙 Mode Nuit douce activé" : "☀️ Mode Ivoire lumineux activé");
  });
})();

/* ---------- Playlist de cantiques de Noël ---------- */
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
  } catch {}
}

function getRsvps() {
  try { return JSON.parse(localStorage.getItem(RSVP_KEY) || "{}"); }
  catch { return {}; }
}

function getLastRsvp() {
  const list = Object.values(getRsvps());
  if (!list.length) return null;
  return list
    .slice()
    .sort((a, b) => new Date(a.at || 0).getTime() - new Date(b.at || 0).getTime())
    .pop();
}

/* =========================================================
   ÉCRAN D'OUVERTURE SOFT & FLUIDE
   ========================================================= */
(function initIntro() {
  const intro = $("#intro");
  const envelope = $("#envelope");
  if (!intro || !envelope) return;

  const params = new URLSearchParams(location.search);
  const urlPour = (params.get("pour") || params.get("invite") || "").trim();
  const urlDe = (params.get("de") || params.get("par") || "").trim();
  const lastR = getLastRsvp();
  const recipientName = urlPour || (lastR && lastR.nom ? lastR.nom.split(" ")[0] : "");

  if ($("#ir-nom")) $("#ir-nom").textContent = recipientName || "ami·e";

  const envTag = $("#envelope-tag");
  if (envTag && (recipientName || urlDe)) {
    if (recipientName && urlDe) {
      envTag.innerHTML = `Pour <strong>${escapeHTML(recipientName)}</strong> · De <strong>${escapeHTML(urlDe)}</strong>`;
    } else if (recipientName) {
      envTag.innerHTML = `Pour <strong>${escapeHTML(recipientName)}</strong> ✦`;
    } else if (urlDe) {
      envTag.innerHTML = `De la part de <strong>${escapeHTML(urlDe)}</strong> ✦`;
    }
    envTag.classList.remove("hidden");
  }

  const fromEl = $("#ir-from");
  if (fromEl && urlDe) {
    fromEl.textContent = `✦ Invitation partagée par ${urlDe}`;
    fromEl.classList.remove("hidden");
  }

  if (urlPour && $("#f-nom") && !$("#f-nom").value.trim()) {
    $("#f-nom").value = urlPour;
  }

  let opened = false;
  function dismissIntro(scrollToTarget = null) {
    if (opened) return;
    opened = true;
    if (!isReducedMotion()) playChime("envelope");
    if (window.__startMusic) window.__startMusic(true);

    intro.classList.add("env-open");
    const delay = isReducedMotion() ? 50 : 620;
    setTimeout(() => {
      intro.classList.add("opening");
      document.body.style.overflow = "";
      if (scrollToTarget) {
        document.querySelector(scrollToTarget)?.scrollIntoView({ behavior: isReducedMotion() ? "auto" : "smooth" });
      }
      setTimeout(() => intro.remove(), 650);
    }, delay);
  }

  envelope.addEventListener("click", () => dismissIntro());
  $("#intro-open-btn")?.addEventListener("click", () => dismissIntro());
  $("#intro-skip-rsvp")?.addEventListener("click", (e) => {
    e.preventDefault();
    dismissIntro("#rsvp");
  });
  envelope.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); dismissIntro(); }
  });
  addEventListener("keydown", function onEsc(ev) {
    if (ev.key === "Escape" && !opened) { dismissIntro(); removeEventListener("keydown", onEsc); }
  });
})();

/* =========================================================
   PARTICULES DE LUMIÈRE SUBTILES (CANVAS)
   ========================================================= */
(function initSnow() {
  if (isReducedMotion()) return;
  const canvas = $("#snow");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let flakes = [];
  const COLORS = ["#F6D5DC", "#E5738A", "#F3E3E8"];

  function resize() { canvas.width = innerWidth; canvas.height = innerHeight; }
  resize();
  addEventListener("resize", resize);

  function makeFlakes() {
    const count = Math.min(45, Math.floor(innerWidth / 26));
    flakes = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 2.2 + 1,
      s: Math.random() * 0.35 + 0.15,
      d: Math.random() * Math.PI * 2,
      c: COLORS[(Math.random() * COLORS.length) | 0],
      a: Math.random() * 0.4 + 0.15,
    }));
  }
  makeFlakes();
  addEventListener("resize", makeFlakes);

  (function loop() {
    if (!document.hidden && !isReducedMotion()) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const f of flakes) {
        f.y += f.s;
        f.d += 0.01;
        f.x += Math.sin(f.d) * 0.3;
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
   CINÉMATHÈQUE DE NOËL (5 Vidéos 1080p HD + Pause auto musique)
   ========================================================= */
(function initCinema() {
  const video = $("#main-video");
  const playlist = $("#cinema-playlist");
  if (!video || !playlist) return;

  const badgeEl = $("#vid-badge");
  const scripEl = $("#vid-scripture");
  const titleEl = $("#vid-title");
  const descEl = $("#vid-desc");
  const items = [...playlist.querySelectorAll(".cp-item")];

  let musicWasPlaying = false;

  video.addEventListener("play", () => {
    const bgAudio = window.__musicAudio;
    if (bgAudio && !bgAudio.paused) {
      musicWasPlaying = true;
      bgAudio.pause();
    }
  });

  video.addEventListener("ended", () => {
    const bgAudio = window.__musicAudio;
    if (musicWasPlaying && bgAudio && bgAudio.paused) {
      musicWasPlaying = false;
      bgAudio.play().catch(() => {});
    }
  });

  function selectVideoButton(btn, autoPlay = true) {
    if (!btn) return;
    items.forEach((b) => b.classList.toggle("active", b === btn));
    const { src, poster, badge, scripture, title, desc } = btn.dataset;
    if (badgeEl) badgeEl.textContent = badge || "";
    if (scripEl) scripEl.textContent = scripture || "";
    if (titleEl) titleEl.textContent = title || "";
    if (descEl) descEl.textContent = desc || "";
    if (poster) video.setAttribute("poster", poster);
    if (src && video.getAttribute("src") !== src) {
      video.pause();
      video.src = src;
      video.load();
    }
    if (autoPlay) {
      video.play().catch(() => {});
    }
  }

  items.forEach((btn) => {
    btn.addEventListener("click", () => selectVideoButton(btn, true));
  });

  window.__playVideoBySrc = (targetSrc) => {
    const found = items.find((b) => b.dataset.src === targetSrc);
    if (found) {
      document.querySelector("#videos-noel")?.scrollIntoView({ behavior: isReducedMotion() ? "auto" : "smooth", block: "center" });
      selectVideoButton(found, true);
    }
  };
})();

/* =========================================================
   GALERIE CINÉMATOGRAPHIQUE HD ANIMÉE
   ========================================================= */
(function initHdGallery() {
  const stage = $("#hdc-stage");
  const dotsBox = $("#hdc-dots");
  const strip = $("#hd-filmstrip");
  const carousel = $("#hd-carousel");
  if (!stage || !dotsBox || !strip || !carousel) return;

  const HD_SCENES = [
    {
      img: "assets/hd-scene-02.jpg",
      kicker: "Il est le cadeau · Jean 3:16",
      title: "Il a donné son Fils",
      desc: "Le premier cadeau de Noël, tout simple, a été fait par un Père à tous ses enfants, à nous tous. Il a fait cadeau de son Fils, le Christ. Il est le cadeau.",
      video: "assets/il-est-le-cadeau-fra-1080p.mp4",
    },
    {
      img: "assets/hd-scene-11.jpg",
      kicker: "En route vers Bethléem · Luc 2:4-5",
      title: "Joseph et Marie vers la cité de David",
      desc: "Joseph monta de la Galilée en Judée, dans la ville de David, appelée Bethléem, pour se faire inscrire avec Marie.",
      video: "assets/la-bonne-nouvelle-dune-grande-joie-la-naissance-de-jesus-christ-fra-1080p.mp4",
    },
    {
      img: "assets/hd-scene-06.jpg",
      kicker: "La bonne nouvelle d'une grande joie · Luc 2:14",
      title: "Proclamez la bonne nouvelle : Il vit !",
      desc: "« Gloire à Dieu dans les lieux Très-Hauts, et paix sur la terre aux hommes qui lui sont agréables » (Luc 2:14).",
      video: "assets/la-bonne-nouvelle-dune-grande-joie-la-naissance-de-jesus-christ-fra-1080p.mp4",
    },
    {
      img: "assets/hd-scene-12.jpg",
      kicker: "Le premier esprit de Noël · Joseph",
      title: "Élever le Fils de Dieu sur la terre",
      desc: "Quelle expérience cela a dû être d'avoir élevé Jésus-Christ ? Joseph n’était qu'un humble charpentier quand Dieu lui a confié cette responsabilité sacrée.",
      video: "assets/le-premier-esprit-de-noel-fra-1080p.mp4",
    },
    {
      img: "assets/hd-scene-03.jpg",
      kicker: "Un Sauveur est né · Luc 2:11",
      title: "Souvenons-nous de Lui, aimons-Le et suivons-Le",
      desc: "Chaque année, à la période de Noël, nous célébrons la naissance de notre Sauveur, le Fils de Dieu, qui peut nous délivrer du péché et de la tristesse.",
      video: "assets/a-savior-is-born-fra-1080p.mp4",
    },
    {
      img: "assets/hd-scene-07.jpg",
      kicker: "L'atelier de Nazareth · Matthieu 1",
      title: "L'humble charpentier de Nazareth",
      desc: "Par son amour silencieux, son travail fidèle et sa foi, Joseph a protégé et guidé l'Enfant Jésus.",
      video: "assets/le-premier-esprit-de-noel-fra-1080p.mp4",
    },
    {
      img: "assets/hd-scene-08.jpg",
      kicker: "La Sainte Famille · Luc 2:52",
      title: "Jésus croissait en sagesse et en grâce",
      desc: "Entouré de l'amour de Marie et de Joseph, l'enfant grandissait et se fortifiait, rempli de sagesse.",
      video: "assets/le-premier-esprit-de-noel-fra-1080p.mp4",
    },
    {
      img: "assets/hd-scene-09.jpg",
      kicker: "Message de la Première Présidence",
      title: "Devenir des artisans de paix ce Noël",
      desc: "Nous nous réjouissons que Jéhovah, le Fils de Dieu, soit venu dans le monde apporter sa lumière et sa paix éternelle.",
      video: "assets/2026-12-becoming-peacemakers-this-christmas-a-special-message-from-the-first-presidency-1080p-fra.mp4",
    },
  ];

  let cur = 0;
  let timer = null;
  let paused = false;

  HD_SCENES.forEach((s, i) => {
    const slide = document.createElement("article");
    slide.className = "hdc-slide" + (i === 0 ? " active" : "");
    slide.innerHTML = `
      <img src="${s.img}" alt="${escapeHTML(s.title)}" width="1280" height="720" loading="${i === 0 ? "eager" : "lazy"}" decoding="async" />
      <div class="hdc-caption">
        <div class="hdc-text">
          <span class="hdc-kicker">✦ ${escapeHTML(s.kicker)}</span>
          <h3>${escapeHTML(s.title)}</h3>
          <p>${escapeHTML(s.desc)}</p>
        </div>
        <div class="hdc-actions">
          <button class="hdc-btn" type="button" data-play-vid="${s.video}">🎬 Voir le film</button>
          <button class="hdc-btn" type="button" data-zoom-hd="${i}">🔍 Plein écran</button>
        </div>
      </div>
    `;
    stage.appendChild(slide);

    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "hdc-dot" + (i === 0 ? " active" : "");
    dot.setAttribute("aria-label", `Scène ${i + 1} : ${s.title}`);
    dot.addEventListener("click", () => goTo(i));
    dotsBox.appendChild(dot);

    const thumb = document.createElement("div");
    thumb.className = "hdf-card" + (i === 0 ? " active" : "");
    thumb.tabIndex = 0;
    thumb.setAttribute("role", "button");
    thumb.setAttribute("aria-label", `Afficher : ${s.title}`);
    thumb.innerHTML = `
      <img src="${s.img}" alt="${escapeHTML(s.title)}" width="320" height="200" loading="lazy" decoding="async" />
      <span>${escapeHTML(s.title)}</span>
    `;
    thumb.addEventListener("click", () => goTo(i));
    thumb.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); goTo(i); }
    });
    strip.appendChild(thumb);
  });

  const slides = [...stage.children];
  const dots = [...dotsBox.children];
  const thumbs = [...strip.children];

  function goTo(index) {
    cur = (index + HD_SCENES.length) % HD_SCENES.length;
    slides.forEach((el, i) => el.classList.toggle("active", i === cur));
    dots.forEach((el, i) => el.classList.toggle("active", i === cur));
    thumbs.forEach((el, i) => el.classList.toggle("active", i === cur));
  }

  function startAuto() {
    clearInterval(timer);
    if (isReducedMotion()) return;
    timer = setInterval(() => {
      if (!paused && !document.hidden) goTo(cur + 1);
    }, 5200);
  }

  $("#hdc-prev")?.addEventListener("click", () => { goTo(cur - 1); startAuto(); });
  $("#hdc-next")?.addEventListener("click", () => { goTo(cur + 1); startAuto(); });
  carousel.addEventListener("mouseenter", () => { paused = true; });
  carousel.addEventListener("mouseleave", () => { paused = false; });

  stage.addEventListener("click", (e) => {
    const playBtn = e.target.closest("[data-play-vid]");
    if (playBtn && window.__playVideoBySrc) {
      window.__playVideoBySrc(playBtn.dataset.playVid);
      return;
    }
    const zoomBtn = e.target.closest("[data-zoom-hd]");
    if (zoomBtn) {
      const s = HD_SCENES[Number(zoomBtn.dataset.zoomHd)];
      if (s && window.__openGlobalLightbox) {
        window.__openGlobalLightbox({ photo: s.img, nom: s.title, msg: s.desc });
      }
    }
  });

  startAuto();
})();

/* =========================================================
   APPARITIONS AU SCROLL & PROGRESSION
   ========================================================= */
(function initRevealAndScroll() {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll(".reveal").forEach((el) => io.observe(el));

  const bar = $("#progress");
  const cta = $("#cta-float");
  const rsvp = $("#rsvp");
  const tl = document.querySelector(".timeline");

  function onScroll() {
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    if (bar) bar.style.transform = `scaleX(${max ? h.scrollTop / max : 0})`;

    if (cta) {
      const past = h.scrollTop > 420;
      let rsvpVisible = false;
      if (rsvp) {
        const r = rsvp.getBoundingClientRect();
        rsvpVisible = r.top < innerHeight * 0.8 && r.bottom > innerHeight * 0.2;
      }
      cta.classList.toggle("show", past && !rsvpVisible);
    }

    if (tl) {
      const r = tl.getBoundingClientRect();
      const passed = Math.min(Math.max(innerHeight * 0.72 - r.top, 0), r.height);
      tl.style.setProperty("--line", `${(passed / r.height) * 100}%`);
    }
  }
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();
})();

/* =========================================================
   COMPTE À REBOURS + CALENDRIER
   ========================================================= */
(function initCountdown() {
  const start = new Date(CONFIG.eventStart);
  const end = new Date(CONFIG.eventEnd);
  const el = { d: $("#cd-days"), h: $("#cd-hours"), m: $("#cd-mins"), s: $("#cd-secs") };

  function tick() {
    const now = new Date();
    const diff = start - now;
    if (diff <= 0) {
      const cd = $("#countdown");
      if (cd) {
        cd.innerHTML = now < end
          ? '<div class="cd-box" style="min-width:210px"><span>🎄 En cours</span><small>Jusqu\'à 15h00</small></div>'
          : '<div class="cd-box" style="min-width:210px"><span>Joyeux Noël ✦</span><small>Événement célébré</small></div>';
      }
      clearInterval(timer);
      return;
    }
    const d = Math.floor(diff / 864e5);
    const h = Math.floor((diff % 864e5) / 36e5);
    const m = Math.floor((diff % 36e5) / 6e4);
    const s = Math.floor((diff % 6e4) / 1e3);
    if (el.d) el.d.textContent = String(d);
    if (el.h) el.h.textContent = pad(h);
    if (el.m) el.m.textContent = pad(m);
    if (el.s) el.s.textContent = pad(s);
  }
  const timer = setInterval(tick, 1000);
  tick();

  const fmt = (x) => x.toISOString().replace(/[-:]|\.\d{3}/g, "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: CONFIG.eventName,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: "Un Sauveur est né : Il est le cadeau ! Ticket d'entrée : venir accompagné(e) d'au moins un(e) invité(e).",
    location: CONFIG.place,
  });
  if ($("#btn-gcal")) $("#btn-gcal").href = `https://calendar.google.com/calendar/render?${params}`;

  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//EclairerLeMonde//NoelAboisso//FR",
    "BEGIN:VEVENT",
    "UID:noel-aboisso-24-dec-2026@eclairer-le-monde",
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${CONFIG.eventName}`,
    "DESCRIPTION:Un Sauveur est né : Il est le cadeau ! Ticket d'entrée : venir accompagné(e) d'au moins 1 invité(e).",
    `LOCATION:${CONFIG.place}`,
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
  if ($("#btn-ics")) $("#btn-ics").href = "data:text/calendar;charset=utf-8," + encodeURIComponent(ics);
})();

/* ---------- Partage & Copie ---------- */
$("#copy-address")?.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(CONFIG.place);
    toast("📍 Adresse copiée !");
  } catch {
    toast("Adresse : " + CONFIG.place);
  }
});

document.querySelectorAll("[data-copy-link]").forEach((btn) => {
  btn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      toast("🔗 Lien copié !");
    } catch {
      toast("Impossible de copier le lien 😕");
    }
  });
});

(function initShare() {
  const text = "✦ Un Sauveur est né · Il est le Cadeau ✦\nVous êtes invité·e au Grand Noël des Enfants & Familles 🎄\n« Gloire à Dieu dans les lieux Très-Hauts, et paix sur la terre » (Luc 2:14)\n📅 Jeudi 24 décembre 2026, 10h–15h\n📍 Salle des fêtes de la mairie d'Aboisso\n🎟️ Ticket d'entrée : venir accompagné·e d'au moins un·e invité·e !";
  const url = location.href;
  document.querySelectorAll("[data-share-wa]").forEach((a) => {
    a.href = `https://wa.me/?text=${encodeURIComponent(text + "\n👉 " + url)}`;
  });
})();

/* =========================================================
   INSCRIPTION ULTRA-SIMPLE EN 1 ÉCRAN + BILLET EN DIRECT
   ========================================================= */
(function initRsvp() {
  const form = $("#rsvp-form");
  const done = $("#rsvp-done");
  if (!form || !done) return;

  const nomInput = $("#f-nom");
  const statutSelect = $("#f-statut-select");
  const presenceSelect = $("#f-presence-select");
  const membreFields = $("#membre-fields");
  const inviteBlock = $("#invite-block");
  const accompInput = $("#f-accomp");
  const invList = $("#inv-amis");

  /* Éléments du Billet en Direct (Colonne de droite) */
  const ltNum = $("#lt-num");
  const ltName = $("#lt-name");
  const ltCompanion = $("#lt-companion");
  const ltStatus = $("#lt-status");
  const ltQrImg = $("#i-qr");
  const ltActions = $("#lt-actions");

  let currentInvite = null;
  let invCounter = 0;

  function addInviteRow() {
    invCounter += 1;
    const idNom = `inv-nom-${invCounter}`;
    const idTel = `inv-tel-${invCounter}`;
    const row = document.createElement("div");
    row.className = "inv-row";
    row.innerHTML = `
      <div class="field">
        <label for="${idNom}">${invCounter === 1 ? "Nom & prénom de votre invité·e *" : "Autre invité·e"}</label>
        <input id="${idNom}" class="inv-nom" type="text" maxlength="80" placeholder="Ex. Koffi Yao" />
      </div>
      <div class="field">
        <label for="${idTel}">Son WhatsApp (facultatif)</label>
        <input id="${idTel}" class="inv-tel" type="tel" inputmode="tel" placeholder="07 00 00 00 00" />
      </div>
      <button class="inv-x" type="button" title="Retirer" aria-label="Retirer cette personne">✕</button>
      <p class="inv-msg hidden" aria-live="polite"></p>
    `;
    row.querySelector(".inv-x").addEventListener("click", () => {
      row.remove();
      if (!invList.children.length) addInviteRow();
      updateLiveTicketPreview();
    });
    const nEl = row.querySelector(".inv-nom");
    const tEl = row.querySelector(".inv-tel");
    nEl.addEventListener("input", updateLiveTicketPreview);
    nEl.addEventListener("change", () => checkInviteRow(row));
    tEl.addEventListener("change", () => checkInviteRow(row));
    invList.appendChild(row);
    return row;
  }

  function collectInvites() {
    const out = [];
    for (const row of Array.from(invList.children)) {
      const nom = row.querySelector(".inv-nom")?.value.trim() || "";
      const tel = row.querySelector(".inv-tel")?.value.trim() || "";
      if (nom || tel) out.push({ type: "ami", nom, tel });
    }
    return out;
  }

  function rowMsg(row, text, ok = false) {
    const m = row.querySelector(".inv-msg");
    if (!m) return;
    m.textContent = text || "";
    m.classList.toggle("hidden", !text);
    m.classList.toggle("ok", ok && !!text);
  }

  async function checkInviteRow(row) {
    const nom = row.querySelector(".inv-nom")?.value.trim() || "";
    const tel = row.querySelector(".inv-tel")?.value.trim() || "";
    if (!nom && !tel) { rowMsg(row, ""); return; }
    if (!nom) { rowMsg(row, "Indiquez aussi son nom 🙏"); return; }
    try {
      const res = await fetch("/api/invites/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom, tel }),
      });
      const j = await res.json();
      if (j.dup) rowMsg(row, `ℹ️ « ${nom} » a déjà été invité·e (${j.info || "inscrit·e"})`);
      else rowMsg(row, "✓ Ticket d'entrée validé avec cet·te invité·e !", true);
    } catch { rowMsg(row, ""); }
  }

  document.querySelector('[data-add-invite="ami"]')?.addEventListener("click", () => {
    const r = addInviteRow();
    r.querySelector(".inv-nom")?.focus();
  });
  addInviteRow();

  /* Synchronisation Statut (Membre / Ami) & Présence */
  function syncFormUI() {
    const isMembre = (statutSelect?.value || "membre") === "membre";
    const isPresent = (presenceSelect?.value || "present") === "present";
    membreFields?.classList.toggle("hidden", !isMembre);
    inviteBlock?.classList.toggle("hidden", !isPresent);
    if (accompInput) {
      accompInput.min = isPresent ? "2" : "1";
      if (isPresent && parseInt(accompInput.value, 10) < 2) accompInput.value = "2";
    }
    updateLiveTicketPreview();
  }
  statutSelect?.addEventListener("change", syncFormUI);
  presenceSelect?.addEventListener("change", syncFormUI);
  nomInput?.addEventListener("input", updateLiveTicketPreview);

  function getCompanionText(d) {
    const names = [];
    if (Array.isArray(d?.invites) && d.invites.length) {
      d.invites.forEach((i) => { if (i && i.nom) names.push(i.nom); });
    } else {
      if (d?.ami_nom) names.push(d.ami_nom);
      if (d?.inactif_nom) names.push(d.inactif_nom);
    }
    if (names.length) return names.join(", ");
    return "1 invité·e accompagnant·e";
  }

  function inviteLink(d) {
    if (location.protocol.startsWith("http")) return location.origin + location.pathname + "#billet-" + d.num;
    return "https://invitation-noel-aboisso.onrender.com/#billet-" + d.num;
  }

  function makeQR(text) {
    try {
      if (typeof qrcode !== "function") return null;
      const qr = qrcode(0, "M");
      qr.addData(encodeURI(text));
      qr.make();
      return qr.createDataURL(8, 4);
    } catch { return null; }
  }

  /* Mise à jour en temps réel de l'aperçu du Billet pendant la saisie */
  function updateLiveTicketPreview() {
    if (!form.classList.contains("hidden")) {
      const typedNom = nomInput?.value.trim() || "";
      const typedInvites = collectInvites().filter((i) => i.nom).map((i) => i.nom);
      if (ltName) ltName.textContent = typedNom || "Votre nom apparaîtra ici";
      if (ltCompanion) {
        ltCompanion.textContent = typedInvites.length
          ? typedInvites.join(", ")
          : "Votre invité·e apparaîtra ici";
      }
      if (accompInput && typedInvites.length >= 1) {
        const minP = 1 + typedInvites.length;
        if (parseInt(accompInput.value, 10) < minP) accompInput.value = String(minP);
      }
    }
  }

  /* Afficher un billet validé dans la carte de droite */
  function showInvite(d) {
    if (!d) return;
    currentInvite = d;
    if (ltNum) ltNum.textContent = `Billet N°${d.num}`;
    if (ltName) ltName.textContent = d.nom;
    if (ltCompanion) ltCompanion.textContent = getCompanionText(d);
    if (ltStatus) ltStatus.textContent = `✅ Billet N°${d.num} validé (${d.people || 2} personnes)`;

    const qrData = makeQR(inviteLink(d));
    if (ltQrImg && qrData) {
      ltQrImg.src = qrData;
      ltQrImg.classList.remove("hidden");
    }
    ltActions?.classList.remove("hidden");
    $("#live-ticket")?.scrollIntoView({ behavior: isReducedMotion() ? "auto" : "smooth", block: "nearest" });
  }

  function renderInvitesShare(invites, membreNom) {
    const box = $("#invites-share");
    if (!box) return;
    box.innerHTML = "";
    const list = (invites || []).filter((i) => i && i.nom);
    if (!list.length) { box.classList.add("hidden"); return; }
    const h = document.createElement("p");
    h.className = "is-title";
    h.textContent = "💌 Envoyez maintenant son invitation personnalisée à votre invité·e :";
    box.appendChild(h);
    const base = location.protocol.startsWith("http") ? location.origin + location.pathname : "https://invitation-noel-aboisso.onrender.com/";
    for (const inv of list) {
      const qs = new URLSearchParams({ pour: inv.nom, de: membreNom });
      const personalUrl = `${base}?${qs.toString()}`;
      const msg = `✦ Un Sauveur est né · Il est le Cadeau ✦\nCher·ère ${inv.nom},\n${membreNom} vous a inscrit·e comme son invité·e pour la fête de Noël « Éclairer le Monde » 🎄\n📅 Jeudi 24 décembre 2026 · 10h00 – 15h00\n📍 Salle des fêtes de la mairie d'Aboisso\n💌 Ouvrez votre invitation personnelle : ${personalUrl}`;
      const num = telKey(inv.tel) ? normalizePhone(inv.tel) : "";
      const a = document.createElement("a");
      a.className = "btn btn-green btn-sm";
      a.href = num ? `https://wa.me/${num}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
      a.target = "_blank"; a.rel = "noopener";
      a.textContent = `💬 Envoyer à ${inv.nom} sur WhatsApp`;
      box.appendChild(a);
    }
    box.classList.remove("hidden");
  }

  /* État initial si un billet existe déjà sur l'appareil */
  let last = getLastRsvp();
  if (last) {
    $("#done-name").textContent = last.nom.split(" ")[0];
    form.classList.add("hidden");
    done.classList.remove("hidden");
    showInvite(last);
    if (Array.isArray(last.invites) && last.invites.length) {
      renderInvitesShare(last.invites, last.nom);
    }
  } else {
    syncFormUI();
  }

  $("#view-invite")?.addEventListener("click", () => {
    if (last) showInvite(last);
  });

  $("#new-rsvp-btn")?.addEventListener("click", () => {
    done.classList.add("hidden");
    form.classList.remove("hidden");
    nomInput?.focus();
    updateLiveTicketPreview();
  });

  function showFormError(msg, focusEl = null) {
    const err = $("#rsvp-error");
    if (err) {
      err.textContent = msg;
      err.classList.remove("hidden");
    }
    if (focusEl) focusEl.focus();
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nom = (nomInput?.value || "").trim();
    if (!nom) {
      showFormError("Merci d'indiquer votre nom & prénom 🙏", nomInput);
      return;
    }

    const presence = presenceSelect?.value || "present";
    const statut = statutSelect?.value || "membre";
    const invites = presence === "present" ? collectInvites() : [];
    const namedInvites = invites.filter((i) => i.nom);

    if (presence === "present" && namedInvites.length < 1) {
      const firstInvInput = invList.querySelector(".inv-nom");
      showFormError(
        "🎟️ Votre ticket d'entrée est de venir avec au moins 1 invité·e ! Merci d'indiquer son nom ci-dessous 🙏",
        firstInvInput
      );
      return;
    }

    $("#rsvp-error")?.classList.add("hidden");

    const minPeople = presence === "present" ? Math.max(2, 1 + namedInvites.length) : 1;
    const rawPeople = parseInt(accompInput?.value || String(minPeople), 10) || minPeople;

    const data = {
      num: Math.floor(100 + Math.random() * 900),
      nom,
      presence,
      statut,
      tel: ($("#f-tel")?.value || "").trim(),
      people: Math.min(Math.max(rawPeople, minPeople), 30),
      branche: ($("#f-branche")?.value || "").trim(),
      localite: ($("#f-localite")?.value || "").trim(),
      note: ($("#f-note")?.value || "").trim(),
      invites: namedInvites,
      ami_nom: namedInvites[0]?.nom || "",
      ami_tel: namedInvites[0]?.tel || "",
      inactif_nom: namedInvites[1]?.nom || "",
      inactif_tel: namedInvites[1]?.tel || "",
      at: new Date().toISOString(),
    };

    try {
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const j = await res.json();
        if (j.entry && j.entry.num) data.num = j.entry.num;
      }
    } catch {}

    saveRsvp(data);
    currentInvite = data;
    last = data;

    showInvite(data);
    form.reset();
    invList.innerHTML = "";
    invCounter = 0;
    addInviteRow();
    syncFormUI();

    form.classList.add("hidden");
    $("#done-name").textContent = nom.split(" ")[0];
    done.classList.remove("hidden");
    renderInvitesShare(namedInvites, nom);
    toast("🎟️ Billet d'entrée généré avec succès !");
  });

  /* ---------- Génération de la Carte Billet en Image HD (Canvas 2x) ---------- */
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

  async function buildInviteCanvas(d) {
    if (document.fonts && document.fonts.ready) {
      try { await document.fonts.ready; } catch {}
    }
    const scale = 2;
    const W = 760, H = 1030;
    const c = document.createElement("canvas");
    c.width = W * scale; c.height = H * scale;
    const x = c.getContext("2d");
    x.scale(scale, scale);

    /* Fond Ivoire Doux */
    x.fillStyle = "#FDFBF9"; x.fillRect(0, 0, W, H);

    /* Arche Carmin & Rose */
    const AG = x.createLinearGradient(0, 50, 0, H - 300);
    AG.addColorStop(0, "#E5738A"); AG.addColorStop(0.5, "#C8102E"); AG.addColorStop(1, "#9E0B22");
    archPath(x, W / 2, 50, W - 90, H - 300);
    x.fillStyle = AG; x.fill();

    x.strokeStyle = "rgba(246, 213, 220, 0.85)"; x.lineWidth = 3;
    archPath(x, W / 2, 66, W - 122, H - 326); x.stroke();

    x.fillStyle = "#F6D5DC";
    drawStar(x, W / 2, 195, 36, 14);

    x.textAlign = "center";
    x.fillStyle = "#FCECEF";
    x.font = "italic 600 32px 'Playfair Display', Georgia, serif";
    x.fillText("Un Sauveur est né · Il est le Cadeau", W / 2, 275);

    x.fillStyle = "#FFFFFF";
    x.font = "700 38px 'Plus Jakarta Sans', sans-serif";
    let y = wrapText(x, "Célébrez la naissance de Jésus-Christ avec nous", W / 2, 328, W - 240, 48);

    x.fillStyle = "#F6D5DC";
    drawRoundRect(x, W / 2 - 205, y + 24, 410, 46, 23); x.fill();
    x.fillStyle = "#2D1219";
    x.font = "800 21px 'Plus Jakarta Sans', sans-serif";
    x.fillText("JEUDI 24 DÉCEMBRE 2026", W / 2, y + 55);

    x.fillStyle = "#FCECEF";
    x.font = "500 22px 'Plus Jakarta Sans', sans-serif";
    x.fillText("Billet d'entrée officiel de", W / 2, y + 104);

    const rawName = String(d.nom || "Invité·e").trim();
    const fontSize = rawName.length > 26 ? 32 : rawName.length > 18 ? 38 : 42;
    x.fillStyle = "#FFFFFF";
    x.font = `800 ${fontSize}px 'Plus Jakarta Sans', sans-serif`;
    x.fillText(rawName.length > 36 ? rawName.slice(0, 35) + "…" : rawName, W / 2, y + 150);

    const comp = `🎟️ Invité·e(s) : ${getCompanionText(d)}`;
    x.fillStyle = "#FFE09E";
    x.font = "700 21px 'Plus Jakarta Sans', sans-serif";
    x.fillText(comp.length > 44 ? comp.slice(0, 43) + "…" : comp, W / 2, y + 188);

    x.fillStyle = "#FFFFFF";
    x.font = "600 24px 'Plus Jakarta Sans', sans-serif";
    x.fillText("10h00 – 15h00 · Salle des fêtes de la mairie d'ABOISSO", W / 2, y + 234);

    return new Promise((resolve) => {
      const done = () => resolve(c);
      const qrData = makeQR(inviteLink(d));
      if (qrData) {
        const img = new Image();
        img.onload = () => {
          const qy = H - 260;
          x.fillStyle = "#FFFFFF";
          drawRoundRect(x, W / 2 - 80, qy, 160, 160, 18); x.fill();
          x.strokeStyle = "rgba(200, 16, 46, 0.25)"; x.lineWidth = 2;
          drawRoundRect(x, W / 2 - 80, qy, 160, 160, 18); x.stroke();
          x.drawImage(img, W / 2 - 68, qy + 12, 136, 136);
          x.fillStyle = "#5A4349";
          x.font = "600 19px 'Plus Jakarta Sans', sans-serif";
          x.fillText("Église de Jésus-Christ des Saints des Derniers Jours", W / 2, H - 72);
          x.fillStyle = "#7C636A";
          x.font = "500 16px 'Plus Jakarta Sans', sans-serif";
          x.fillText(`Billet N°${d.num} · Ticket d'entrée : Participant·e + Invité·e`, W / 2, H - 42);
          done();
        };
        img.onerror = done;
        img.src = qrData;
      } else {
        done();
      }
    });
  }

  $("#dl-invite")?.addEventListener("click", async () => {
    const d = currentInvite ?? getLastRsvp();
    if (!d) return;
    toast("📤 Préparation de votre billet HD…");
    const c = await buildInviteCanvas(d);
    const a = document.createElement("a");
    a.download = `billet-noel-aboisso-${d.num}.png`;
    a.href = c.toDataURL("image/png");
    a.click();
    toast("⬇️ Billet téléchargé !");
  });

  $("#wa-invite-img")?.addEventListener("click", async () => {
    const d = currentInvite ?? getLastRsvp();
    if (!d) return;
    toast("📤 Préparation du billet pour WhatsApp…");
    const c = await buildInviteCanvas(d);
    const blob = await new Promise((r) => c.toBlob(r, "image/png"));
    const file = new File([blob], `billet-noel-aboisso-${d.num}.png`, { type: "image/png" });
    const msg = `✦ Un Sauveur est né · Il est le Cadeau ✦\nVoici notre billet d'entrée (N°${d.num}) pour la fête de Noël du jeudi 24 décembre 2026 (10h–15h) à la salle des fêtes de la mairie d'Aboisso 🎄`;
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "Billet Noël à Aboisso", text: msg });
        return;
      } catch {}
    }
    const a = document.createElement("a");
    a.download = file.name;
    a.href = c.toDataURL("image/png");
    a.click();
    const wa = d.tel ? normalizePhone(d.tel) : CONFIG.contactPhone;
    window.open(`https://wa.me/${wa}?text=${encodeURIComponent(msg)}`, "_blank");
  });

  /* Lecture directe #billet-NUM (scan QR Code) */
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
      } catch {}
    }
    if (found) {
      document.querySelector("#intro")?.remove();
      document.body.style.overflow = "";
      showInvite(found);
      document.querySelector("#rsvp")?.scrollIntoView({ behavior: "smooth" });
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

  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; } };
  const save = (arr) => { try { localStorage.setItem(KEY, JSON.stringify(arr)); } catch {} };

  let serverEntries = null;
  (async () => {
    try {
      const res = await fetch("/api/guestbook");
      if (res.ok) { serverEntries = await res.json(); render(); }
    } catch {}
  })();

  function entries() { return serverEntries ?? load(); }

  function render() {
    const entriesList = entries();
    list.innerHTML = "";
    if (!entriesList.length) {
      const li = document.createElement("li");
      li.className = "gb-empty";
      li.textContent = "Soyez la première personne à partager ses vœux de Noël ✨";
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
      when.textContent = new Date(e.at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
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
        const arr = load(); arr.push(payload); save(arr);
      }
    } catch {
      const arr = load(); arr.push(payload); save(arr);
    }
    form.reset();
    count.textContent = "0/200";
    render();
    toast("💌 Merci pour vos vœux de Noël !");
  });

  render();
})();

/* =========================================================
   MUR PHOTO — « Je serai là ! »
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

  const LIKES_KEY = "noel-aboisso-likes";
  const getLikes = () => { try { return JSON.parse(localStorage.getItem(LIKES_KEY) || "{}"); } catch { return {}; } };
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
    }
    try { localStorage.setItem(LIKES_KEY, JSON.stringify(likes)); } catch {}
  }

  const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; } };
  const save = (arr) => { try { localStorage.setItem(KEY, JSON.stringify(arr)); } catch {} };
  const entries = () => serverEntries ?? load();

  (async () => {
    try {
      const res = await fetch("/api/photo-wall");
      if (res.ok) { serverEntries = await res.json(); render(); }
    } catch {}
  })();

  function canvasToCompressedDataURL(canvas) {
    const webp = canvas.toDataURL("image/webp", 0.76);
    if (webp.startsWith("data:image/webp")) return webp;
    return canvas.toDataURL("image/jpeg", 0.74);
  }

  function resizeImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const side = Math.min(img.width, img.height);
        const c = document.createElement("canvas");
        c.width = c.height = 500;
        c.getContext("2d").drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, 500, 500);
        URL.revokeObjectURL(url);
        resolve(canvasToCompressedDataURL(c));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(); };
      img.src = url;
    });
  }

  function choosePhoto() { fileInput.click(); }
  drop.addEventListener("click", choosePhoto);
  drop.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); choosePhoto(); } });
  $("#btn-choose")?.addEventListener("click", (e) => { e.preventDefault(); choosePhoto(); });

  fileInput.addEventListener("change", async () => {
    const f = fileInput.files[0];
    if (!f) return;
    try {
      photoData = await resizeImage(f);
      preview.src = photoData;
      preview.classList.remove("hidden");
      placeholder.classList.add("hidden");
    } catch { toast("Impossible de lire cette image 😕"); }
  });

  async function stopCamera() {
    if (camStream) { camStream.getTracks().forEach((t) => t.stop()); camStream = null; }
  }
  async function openCamera() {
    camModal.classList.remove("hidden");
    try {
      camStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      camVideo.srcObject = camStream;
    } catch {
      await stopCamera();
      camModal.classList.add("hidden");
      fileInput.capture = "environment";
      choosePhoto();
      setTimeout(() => fileInput.removeAttribute("capture"), 1000);
    }
  }
  function closeCamera() { stopCamera(); camModal.classList.add("hidden"); }
  $("#btn-camera")?.addEventListener("click", (e) => { e.preventDefault(); openCamera(); });
  $("#btn-cam-close")?.addEventListener("click", closeCamera);

  $("#btn-capture")?.addEventListener("click", () => {
    const v = camVideo;
    if (!v.videoWidth) return;
    const side = Math.min(v.videoWidth, v.videoHeight);
    camCanvas.width = camCanvas.height = 500;
    camCanvas.getContext("2d").drawImage(v, (v.videoWidth - side) / 2, (v.videoHeight - side) / 2, side, side, 0, 0, 500, 500);
    photoData = canvasToCompressedDataURL(camCanvas);
    preview.src = photoData;
    preview.classList.remove("hidden");
    placeholder.classList.add("hidden");
    closeCamera();
  });

  async function drawFramedPhoto(e) {
    if (document.fonts && document.fonts.ready) { try { await document.fonts.ready; } catch {} }
    const W = 760, H = 980;
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const x = c.getContext("2d");

    drawRoundRect(x, 0, 0, W, H, 30); x.fillStyle = "#C8102E"; x.fill();
    drawRoundRect(x, 16, 16, W - 32, H - 32, 18); x.fillStyle = "#FDFBF9"; x.fill();

    const px = 64, py = 64, pw = W - 128;
    const img = new Image();
    img.crossOrigin = "anonymous";
    const finish = () => {
      const a = document.createElement("a");
      a.download = `noel-aboisso-${(e.nom || "photo").replace(/\s+/g, "-").toLowerCase()}.png`;
      a.href = c.toDataURL("image/png");
      a.click();
    };
    img.onload = () => {
      x.save();
      drawRoundRect(x, px, py, pw, pw, 12); x.clip();
      const side = Math.min(img.width, img.height);
      x.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, px, py, pw, pw);
      x.restore();
      x.textAlign = "center";
      x.fillStyle = "#2D1219";
      x.font = "italic 600 38px 'Playfair Display', Georgia, serif";
      x.fillText("Il est le Cadeau · Noël à Aboisso", W / 2, py + pw + 75);
      if (e.nom) {
        x.font = "700 26px 'Plus Jakarta Sans', sans-serif";
        x.fillText(e.nom, W / 2, py + pw + 115);
      }
      x.fillStyle = "#7C636A";
      x.font = "500 18px 'Plus Jakarta Sans', sans-serif";
      x.fillText("Jeudi 24 Décembre 2026 · Mairie d'Aboisso", W / 2, py + pw + 150);
      finish();
    };
    img.onerror = finish;
    img.src = e.photo;
  }

  function render() {
    const all = entries();
    grid.innerHTML = "";
    empty.classList.toggle("hidden", all.length > 0);

    const countEl = $("#wall-count");
    if (countEl) {
      if (all.length > 0) {
        countEl.classList.remove("hidden");
        $("#wall-count-n").textContent = all.length;
        $("#wall-count-txt").textContent = all.length > 1 ? "photos partagées" : "photo partagée";
      } else countEl.classList.add("hidden");
    }

    const reversed = all.slice().reverse();
    const slice = reversed.slice(0, visibleCount);
    if (moreWrap) {
      const rem = reversed.length - slice.length;
      moreWrap.classList.toggle("hidden", rem <= 0);
    }

    slice.forEach((e) => {
      const fig = document.createElement("figure");
      fig.className = "wall-card";
      const ph = document.createElement("div");
      ph.className = "wc-ph";
      const img = document.createElement("img");
      img.src = e.photo; img.alt = e.nom || "Participant";
      img.width = 250; img.height = 250; img.loading = "lazy";
      ph.appendChild(img);
      const cap = document.createElement("figcaption");
      cap.className = "wc-name"; cap.textContent = e.nom;
      fig.append(ph, cap);

      const pid = photoId(e);
      const like = document.createElement("button");
      like.type = "button"; like.className = "wc-like" + (getLikes()[pid] ? " on" : "");
      like.innerHTML = getLikes()[pid] ? "❤️<b>1</b>" : "🤍";
      like.addEventListener("click", (ev) => { ev.stopPropagation(); toggleLike(pid, like); });
      fig.appendChild(like);

      const dl = document.createElement("button");
      dl.type = "button"; dl.className = "wc-dl"; dl.textContent = "⬇️";
      dl.addEventListener("click", (ev) => { ev.stopPropagation(); drawFramedPhoto(e); });
      fig.appendChild(dl);

      fig.addEventListener("click", () => openLightbox(e));
      grid.appendChild(fig);
    });
  }

  moreBtn?.addEventListener("click", () => { visibleCount += PAGE_SIZE; render(); });

  const lightbox = $("#wall-lightbox");
  function openLightbox(e) {
    $("#wl-img").src = e.photo;
    $("#wl-name").textContent = e.nom || "";
    $("#wl-msg").textContent = e.msg || "";
    $("#wl-msg").classList.toggle("hidden", !e.msg);
    lightbox.classList.remove("hidden");
  }
  window.__openGlobalLightbox = openLightbox;
  function closeLightbox() { lightbox.classList.add("hidden"); }
  $("#wl-close")?.addEventListener("click", closeLightbox);
  lightbox?.addEventListener("click", (ev) => { if (ev.target === lightbox) closeLightbox(); });
  addEventListener("keydown", (ev) => { if (ev.key === "Escape") closeLightbox(); });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nom = $("#w-nom").value.trim();
    if (!photoData || !nom) { error.classList.remove("hidden"); return; }
    error.classList.add("hidden");
    const payload = { nom, msg: $("#w-msg").value.trim(), photo: photoData, at: new Date().toISOString() };
    try {
      const res = await fetch("/api/photo-wall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { toast(json.error || "Envoi impossible 😕"); return; }
      serverEntries = [...(serverEntries ?? []), json.entry];
    } catch {
      const arr = load(); arr.push(payload); save(arr);
    }
    form.reset();
    photoData = null;
    fileInput.value = "";
    preview.src = "";
    preview.classList.add("hidden");
    placeholder.classList.remove("hidden");
    render();
    toast("📸 Votre photo est publiée sur le mur !");
  });

  render();
})();

/* =========================================================
   LECTEUR DE MUSIQUE DISCRET (AVEC FONDU 3S)
   ========================================================= */
(function initMusic() {
  const KEY_VOL = "noel-aboisso-volume";
  const audio = new Audio();
  window.__musicAudio = audio;
  audio.preload = "metadata";
  let savedVol = 0.7;
  try { savedVol = parseFloat(localStorage.getItem(KEY_VOL) ?? "0.7") || 0.7; } catch {}
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

  function startFadeIn() {
    clearInterval(fadeTimer);
    audio.volume = Math.min(0.03, targetVolume);
    let step = 0;
    fadeTimer = setInterval(() => {
      step += 1;
      audio.volume = Math.min(targetVolume, (targetVolume * step) / 30);
      if (step >= 30) clearInterval(fadeTimer);
    }, 100);
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
    els.title.textContent = `🎵 ${PLAYLIST[idx].title}`;
    [...list.children].forEach((li, k) => li.classList.toggle("active", k === idx));
    audio.play().then(() => {
      if (withFade && token === loadToken) startFadeIn();
    }).catch(() => {
      audio.volume = targetVolume;
    });
  }

  function playRandom(withFade = false) {
    let next;
    do { next = Math.floor(Math.random() * PLAYLIST.length); } while (next === idx && PLAYLIST.length > 1);
    playIndex(next, withFade);
  }

  function updatePlayState() {
    const playing = !audio.paused && !audio.ended;
    els.play.textContent = playing ? "⏸" : "▶";
    fab.classList.toggle("paused", !playing);
  }

  els.play.addEventListener("click", () => {
    if (!started) return playRandom(false);
    audio.paused ? audio.play() : audio.pause();
  });
  els.next.addEventListener("click", () => (shuffle ? playRandom(false) : playIndex(idx + 1, false)));
  els.prev.addEventListener("click", () => (shuffle ? playRandom(false) : playIndex(idx - 1, false)));
  audio.addEventListener("ended", () => (shuffle ? playRandom(false) : playIndex(idx + 1, false)));
  audio.addEventListener("pause", updatePlayState);
  audio.addEventListener("play", updatePlayState);

  els.shuffle.addEventListener("click", () => {
    shuffle = !shuffle;
    els.shuffle.classList.toggle("on", shuffle);
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
      els.bar.style.width = `${(audio.currentTime / audio.duration) * 100}%`;
      els.cur.textContent = fmtTime(audio.currentTime);
      els.dur.textContent = fmtTime(audio.duration);
    }
  });
  els.progress.addEventListener("click", (e) => {
    if (!audio.duration) return;
    const rect = els.progress.getBoundingClientRect();
    audio.currentTime = ((e.clientX - rect.left) / rect.width) * audio.duration;
  });

  let panelOpen = false;
  fab.addEventListener("click", () => {
    if (!started) { playRandom(false); panelOpen = true; panel.classList.remove("hidden"); return; }
    panelOpen = !panelOpen;
    panel.classList.toggle("hidden", !panelOpen);
  });
  els.close.addEventListener("click", () => { panelOpen = false; panel.classList.add("hidden"); });

  window.__startMusic = (withFade = true) => {
    if (!started) playRandom(withFade);
  };
})();
