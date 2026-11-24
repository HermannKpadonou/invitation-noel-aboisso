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
  x.arcTo(px + w, py + h, px, py + h, r);
  x.arcTo(px, py + h, px, py, r);
  x.arcTo(px, py, px + w, py, r);
  x.closePath();
};
const playChime = ELW.playChime || (() => {});
const isReducedMotion = ELW.isReducedMotion || (() => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

/* Validation souple des numéros ivoiriens (10 chiffres commençant par 01/05/07 ou +225, ou international) */
function isValidIvorianOrIntlPhone(raw) {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return true; // le téléphone est facultatif
  const digits = trimmed.replace(/\D/g, "");
  if (/^(01|05|07)\d{8}$/.test(digits)) return true;
  if (/^225(01|05|07)\d{8}$/.test(digits)) return true;
  if (/^225\d{8,10}$/.test(digits)) return true;
  if (trimmed.startsWith("+") && digits.length >= 10 && digits.length <= 15) return true;
  return false;
}

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

function getRsvpList() {
  return Object.values(getRsvps())
    .slice()
    .sort((a, b) => new Date(b.at || 0).getTime() - new Date(a.at || 0).getTime());
}

function clearSavedRsvps() {
  try { localStorage.removeItem(RSVP_KEY); } catch {}
}

function getLastRsvp() {
  const list = getRsvpList();
  return list.length ? list[0] : null;
}

/* =========================================================
   ÉCRAN D'OUVERTURE LENT & SOLENNEL + PLAYLIST AUTO
   ========================================================= */
(function initIntro() {
  const intro = $("#intro");
  const envelope = $("#envelope");
  if (!intro || !envelope) return;

  /* Toujours démarrer tout en haut de la page (sauf lien direct #billet-…) */
  const hasTicketHash = /^#billet-\d+/i.test(location.hash);
  if (!hasTicketHash) {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    document.body.style.overflow = "hidden";
  }

  /* Personnalisation uniquement depuis le lien (?pour=…&de=…) pour ne jamais garder l'ancien nom sur un téléphone partagé */
  const params = new URLSearchParams(location.search);
  const urlPour = (params.get("pour") || params.get("invite") || "").trim();
  const urlDe = (params.get("de") || params.get("par") || "").trim();
  const recipientName = urlPour;

  if (recipientName) {
    if ($("#ir-prefix")) $("#ir-prefix").textContent = "Bonjour ";
    if ($("#ir-nom")) $("#ir-nom").textContent = recipientName;
    if ($("#olc-greet")) $("#olc-greet").textContent = `Cher ${recipientName},`;
  } else {
    if ($("#ir-prefix")) $("#ir-prefix").textContent = "Cher ami, chère amie";
    if ($("#ir-nom")) $("#ir-nom").textContent = "";
    if ($("#olc-greet")) $("#olc-greet").textContent = "Cher ami, chère amie,";
  }

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

  const stageClosed = $("#intro-stage-closed");
  const stageLetter = $("#intro-stage-letter");
  let letterRevealed = false;
  let dismissed = false;

  /* Étape 1 → 2 : ouverture lente de l'enveloppe, sortie du carton, puis fondu vers la carte complète */
  function openEnvelopeCard() {
    if (letterRevealed || dismissed) return;
    letterRevealed = true;
    if (!isReducedMotion()) playChime("envelope");
    window.__startMusic?.(true); // Lance la playlist de cantiques automatiquement en fondu doux

    intro.classList.add("env-open");
    if (isReducedMotion()) {
      stageClosed?.classList.add("hidden");
      stageLetter?.classList.remove("hidden");
      intro.scrollTop = 0;
      $("#intro-enter-site")?.focus({ preventScroll: true });
      return;
    }

    /* Laisse le rabat s'ouvrir (1.15s) et le carton monter doucement hors de l'enveloppe (~1.85s) */
    setTimeout(() => {
      if (dismissed) return;
      stageClosed?.classList.add("fading-out");
    }, 1850);

    setTimeout(() => {
      if (dismissed) return;
      stageClosed?.classList.add("hidden");
      stageLetter?.classList.remove("hidden");
      intro.scrollTop = 0;
      window.scrollTo(0, 0);
      $("#intro-enter-site")?.focus({ preventScroll: true });
    }, 2400);
  }

  /* Étape 2 → Site : l'utilisateur choisit quand quitter la carte après l'avoir lue */
  function dismissIntro(scrollToTarget = null) {
    if (dismissed) return;
    dismissed = true;
    if (!letterRevealed && !isReducedMotion()) playChime("envelope");
    window.__startMusic?.(true);
    intro.classList.add("opening");
    document.body.style.overflow = "";
    if (scrollToTarget) {
      document.querySelector(scrollToTarget)?.scrollIntoView({ behavior: isReducedMotion() ? "auto" : "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "instant" });
      if (location.hash && !hasTicketHash) {
        try { history.replaceState(null, "", location.pathname + location.search); } catch {}
      }
    }
    setTimeout(() => intro.remove(), 650);
  }

  envelope.addEventListener("click", openEnvelopeCard);
  $("#intro-open-btn")?.addEventListener("click", openEnvelopeCard);
  $("#intro-skip-rsvp")?.addEventListener("click", (e) => {
    e.preventDefault();
    dismissIntro("#rsvp");
  });
  $("#intro-enter-rsvp")?.addEventListener("click", (e) => {
    e.preventDefault();
    dismissIntro("#rsvp");
  });
  $("#intro-enter-site")?.addEventListener("click", () => dismissIntro());

  envelope.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openEnvelopeCard(); }
  });
  addEventListener("keydown", function onEsc(ev) {
    if (ev.key === "Escape" && !dismissed) { dismissIntro(); removeEventListener("keydown", onEsc); }
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
    const count = Math.min(40, Math.floor(innerWidth / 28));
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
   CINÉMATHÈQUE DE NOËL (preload="none" + Pause auto musique)
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
      desc: "Le premier cadeau de Noël, tout simple, a été fait par un Père à tous ses enfants, à nous tous.",
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
      desc: "Joseph n'était qu'un humble charpentier quand Dieu lui a confié cette responsabilité sacrée.",
      video: "assets/le-premier-esprit-de-noel-fra-1080p.mp4",
    },
    {
      img: "assets/hd-scene-03.jpg",
      kicker: "Un Sauveur est né · Luc 2:11",
      title: "Souvenons-nous de Lui et suivons-Le",
      desc: "Célébrons la naissance du Fils de Dieu, qui peut nous délivrer du péché et de la tristesse.",
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
      desc: "Unissons nos voix pour apporter la lumière et la paix du Sauveur autour de nous.",
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
      <img src="${s.img}" alt="Scène de la Nativité : ${escapeHTML(s.title)}" width="1280" height="720" loading="lazy" decoding="async" />
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
      <img src="${s.img}" alt="Miniature : ${escapeHTML(s.title)}" width="320" height="200" loading="lazy" decoding="async" />
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
   COMPTE À REBOURS + MESSAGE JOUR J + CALENDRIER
   ========================================================= */
(function initCountdown() {
  const start = new Date(CONFIG.eventStart);
  const end = new Date(CONFIG.eventEnd);
  const el = { d: $("#cd-days"), h: $("#cd-hours"), m: $("#cd-mins"), s: $("#cd-secs") };

  function tick() {
    const now = new Date();
    const diff = start - now;
    const isSameDay = now.getUTCFullYear() === start.getUTCFullYear() &&
                      now.getUTCMonth() === start.getUTCMonth() &&
                      now.getUTCDate() === start.getUTCDate();
    if (diff <= 0 || isSameDay) {
      const cd = $("#countdown");
      if (cd) {
        if (now <= end) {
          cd.innerHTML = '<div class="cd-box" style="min-width:280px;padding:0.85rem 1.2rem"><span>🎄 C\'est aujourd\'hui !</span><small>10h00 – 15h00 · Salle des fêtes de la Mairie d\'Aboisso</small></div>';
        } else {
          cd.innerHTML = '<div class="cd-box" style="min-width:260px;padding:0.85rem 1.2rem"><span>Merci d\'être venus ! ✦</span><small>Découvrez et partagez les photos de la journée ci-dessous</small></div>';
        }
      }
      if (diff <= 0) clearInterval(timer);
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
    details: "Un Sauveur est né : Il est le cadeau ! Entrée gratuite — venez avec au moins une personne que vous invitez.",
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
    "DESCRIPTION:Un Sauveur est né : Il est le cadeau ! Entrée gratuite — venez avec au moins un invité.",
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
  const text = "✦ Un Sauveur est né · Il est le Cadeau ✦\nVous êtes cordialement invité au Grand Noël des Enfants & Familles 🎄\n« Gloire à Dieu dans les lieux Très-Hauts, et paix sur la terre » (Luc 2:14)\n📅 Jeudi 24 décembre 2026, 10h00–15h00\n📍 Salle des fêtes de la mairie d'Aboisso\n🤝 Entrée gratuite et ouverte à tous — venez seul, en famille ou avec un proche invité !";
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
  const telInput = $("#f-tel");
  const brancheSelect = $("#f-branche");
  const statutSelect = $("#f-statut-select");
  const presenceSelect = $("#f-presence-select");
  const membreFields = $("#membre-fields");
  const inviteBlock = $("#invite-block");
  const accompInput = $("#f-accomp");
  const childrenInput = $("#f-children");
  const transportCheck = $("#f-transport");
  const wantMoreCheck = $("#f-want-more");
  const invList = $("#inv-amis");
  const submitBtn = $("#rsvp-submit-btn");

  /* Messages d'erreur sous chaque champ */
  const errNom = $("#err-nom");
  const errTel = $("#err-tel");
  const errBranche = $("#err-branche");
  const errInvites = $("#err-invites");

  /* Éléments du Billet en Direct (Colonne de droite) */
  const ltNum = $("#lt-num");
  const ltName = $("#lt-name");
  const ltCompanion = $("#lt-companion");
  const ltCompanionRow = $("#lt-companion-row");
  const ltStatus = $("#lt-status");
  const ltQrImg = $("#i-qr");
  const ltActions = $("#lt-actions");

  let currentInvite = null;
  let invCounter = 0;

  function setFieldError(el, msg) {
    if (!el) return;
    el.textContent = msg || "";
    el.classList.toggle("hidden", !msg);
  }

  function clearAllFieldErrors() {
    setFieldError(errNom, "");
    setFieldError(errTel, "");
    setFieldError(errBranche, "");
    setFieldError(errInvites, "");
    $("#rsvp-error")?.classList.add("hidden");
  }

  /* Formatage propre du titre de confirmation sans virgule orpheline */
  function setDoneHeading(nom, presence = "present") {
    const prenom = String(nom || "").trim().split(/\s+/)[0] || "";
    const titleEl = $("#done-title");
    const descEl = $("#done-desc");
    if (titleEl) {
      if (presence === "absent") {
        titleEl.textContent = prenom ? `Merci pour votre réponse, ${prenom} !` : "Merci pour votre réponse !";
      } else {
        titleEl.textContent = prenom ? `Votre billet est prêt, ${prenom} !` : "Votre billet est prêt !";
      }
    }
    if (descEl) {
      descEl.innerHTML = presence === "absent"
        ? "Nous avons bien noté que vous ne pourrez pas être présent le jeudi 24 décembre 2026. Joyeux Noël à vous et à votre famille !"
        : "Votre inscription est bien enregistrée pour le <strong>jeudi 24 décembre 2026 (10h00 – 15h00)</strong>.";
    }
  }

  function updateSelfReminderLink(d) {
    const btn = $("#wa-self-reminder");
    if (!btn || !d) return;
    if (d.presence === "absent") {
      btn.classList.add("hidden");
      return;
    }
    btn.classList.remove("hidden");
    const link = inviteLink(d);
    const msg = `🔔 *Rappel — Noël à Aboisso (Billet N°${d.num})*\n📅 Jeudi 24 décembre 2026 · 10h00 – 15h00\n📍 Salle des fêtes de la mairie d'Aboisso\n👤 Participant : ${d.nom}\n🤝 Accompagnement : ${getCompanionText(d)}\n🎟️ Lien de mon billet QR : ${link}`;
    const num = telKey(d.tel) ? normalizePhone(d.tel) : "";
    btn.href = num ? `https://wa.me/${num}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
  }

  function addInviteRow() {
    invCounter += 1;
    const idNom = `inv-nom-${invCounter}`;
    const idTel = `inv-tel-${invCounter}`;
    const row = document.createElement("div");
    row.className = "inv-row";
    row.innerHTML = `
      <div class="field">
        <label for="${idNom}">${invCounter === 1 ? "Nom et prénom de votre invité (facultatif)" : "Autre invité"}</label>
        <input id="${idNom}" class="inv-nom" type="text" maxlength="80" placeholder="Ex. Koffi Yao" />
      </div>
      <div class="field">
        <label for="${idTel}">Son WhatsApp (facultatif)</label>
        <input id="${idTel}" class="inv-tel" type="tel" inputmode="tel" placeholder="07 00 00 00 00" />
      </div>
      <button class="inv-x" type="button" title="Retirer" aria-label="Retirer cet invité">✕</button>
      <p class="inv-msg hidden" aria-live="polite"></p>
    `;
    row.querySelector(".inv-x").addEventListener("click", () => {
      row.remove();
      if (!invList.children.length) addInviteRow();
      updateLiveTicketPreview();
    });
    const nEl = row.querySelector(".inv-nom");
    const tEl = row.querySelector(".inv-tel");
    nEl.addEventListener("input", () => {
      setFieldError(errInvites, "");
      updateLiveTicketPreview();
    });
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
    if (!nom) { rowMsg(row, "Indiquez aussi le nom de votre invité 🙏"); return; }
    try {
      const res = await fetch("/api/invites/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom, tel }),
      });
      const j = await res.json();
      if (j.dup) rowMsg(row, `ℹ️ « ${nom} » a déjà été invité (${j.info || "inscrit"})`);
      else rowMsg(row, "✓ Invité validé !", true);
    } catch { rowMsg(row, ""); }
  }

  document.querySelector('[data-add-invite="ami"]')?.addEventListener("click", () => {
    const r = addInviteRow();
    r.querySelector(".inv-nom")?.focus();
  });
  addInviteRow();

  /* Synchronisation Statut (Membre / Ami) & Présence (Présent / Absent) */
  function syncFormUI() {
    const isMembre = (statutSelect?.value || "membre") === "membre";
    const isPresent = (presenceSelect?.value || "present") === "present";
    membreFields?.classList.toggle("hidden", !isMembre);
    inviteBlock?.classList.toggle("hidden", !isPresent);
    ltCompanionRow?.classList.toggle("hidden", !isPresent);
    if (!isPresent) setFieldError(errInvites, "");
    if (!isMembre) setFieldError(errBranche, "");
    if (accompInput) {
      accompInput.min = "1";
      if (parseInt(accompInput.value, 10) < 1) accompInput.value = "1";
    }
    if (submitBtn && !submitBtn.disabled) {
      submitBtn.textContent = isPresent
        ? "🎟️ Valider et obtenir mon billet"
        : "📩 Enregistrer ma réponse";
    }
    updateLiveTicketPreview();
  }
  statutSelect?.addEventListener("change", syncFormUI);
  presenceSelect?.addEventListener("change", syncFormUI);
  nomInput?.addEventListener("input", () => {
    setFieldError(errNom, "");
    updateLiveTicketPreview();
  });
  telInput?.addEventListener("input", () => setFieldError(errTel, ""));
  brancheSelect?.addEventListener("change", () => setFieldError(errBranche, ""));

  function getCompanionText(d) {
    if (d?.presence === "absent") return "Absence signalée";
    const names = [];
    if (Array.isArray(d?.invites) && d.invites.length) {
      d.invites.forEach((i) => { if (i && i.nom) names.push(i.nom); });
    } else {
      if (d?.ami_nom) names.push(d.ami_nom);
      if (d?.inactif_nom) names.push(d.inactif_nom);
    }
    if (names.length) return names.join(", ");
    return (d?.people || 1) > 1 ? `${d.people} personnes (famille / proches)` : "Participation personnelle";
  }

  function inviteLink(d) {
    const suffix = d.ticket_code ? `${d.num}-${d.ticket_code}` : `${d.num}`;
    if (location.protocol.startsWith("http")) return location.origin + location.pathname + "#billet-" + suffix;
    return "https://invitation-noel-aboisso.onrender.com/#billet-" + suffix;
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
      const isPresent = (presenceSelect?.value || "present") === "present";
      const typedInvites = isPresent ? collectInvites().filter((i) => i.nom).map((i) => i.nom) : [];
      if (ltName) ltName.textContent = typedNom || "Votre nom apparaîtra ici";
      if (ltCompanion) {
        ltCompanion.textContent = typedInvites.length
          ? typedInvites.join(", ")
          : "Seul(e) ou avec un proche invité";
      }
      if (isPresent && accompInput && typedInvites.length >= 1) {
        const minP = 1 + typedInvites.length;
        if (parseInt(accompInput.value, 10) < minP) accompInput.value = String(minP);
      }
    }
  }

  /* Afficher un billet validé dans la carte de droite */
  function showInvite(d) {
    if (!d) return;
    currentInvite = d;
    const isAbsent = d.presence === "absent";
    if (ltNum) ltNum.textContent = `Billet N°${d.num}`;
    if (ltName) ltName.textContent = d.nom || "Invité";
    ltCompanionRow?.classList.toggle("hidden", isAbsent);
    if (ltCompanion && !isAbsent) ltCompanion.textContent = getCompanionText(d);
    if (ltStatus) {
      const pCount = d.people || 1;
      const cCount = d.children || 0;
      const cText = cCount > 0 ? `, dont ${cCount} enfant${cCount > 1 ? "s" : ""}` : "";
      ltStatus.textContent = isAbsent
        ? `📩 Réponse enregistrée (N°${d.num})`
        : `✅ Billet N°${d.num} validé (${pCount} pers.${cText})`;
    }

    const qrData = makeQR(inviteLink(d));
    if (ltQrImg && qrData) {
      ltQrImg.src = qrData;
      ltQrImg.classList.remove("hidden");
    }
    ltActions?.classList.toggle("hidden", isAbsent);
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
    h.textContent = "💌 Envoyez maintenant son invitation personnalisée à votre invité :";
    box.appendChild(h);
    const base = location.protocol.startsWith("http") ? location.origin + location.pathname : "https://invitation-noel-aboisso.onrender.com/";
    for (const inv of list) {
      const qs = new URLSearchParams({ pour: inv.nom, de: membreNom });
      const personalUrl = `${base}?${qs.toString()}`;
      const msg = `✦ Un Sauveur est né · Il est le Cadeau ✦\nBonjour ${inv.nom},\n${membreNom} vous a inscrit comme son invité pour la célébration de Noël « Éclairer le Monde » 🎄\n📅 Jeudi 24 décembre 2026 · 10h00 – 15h00\n📍 Salle des fêtes de la mairie d'Aboisso\n💌 Ouvrez votre invitation personnelle : ${personalUrl}`;
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

  /* Réinitialisation complète de la carte d'aperçu pour inscrire une nouvelle personne */
  function resetLiveTicketPreview() {
    currentInvite = null;
    if (ltNum) ltNum.textContent = "N° ---";
    if (ltName) ltName.textContent = "Votre nom apparaîtra ici";
    ltCompanionRow?.classList.remove("hidden");
    if (ltCompanion) ltCompanion.textContent = "Seul(e) ou avec un proche invité";
    if (ltStatus) ltStatus.textContent = "Remplissez le formulaire pour activer votre billet QR";
    if (ltQrImg) {
      ltQrImg.removeAttribute("src");
      ltQrImg.classList.add("hidden");
    }
    ltActions?.classList.add("hidden");
    document.querySelectorAll(".stb-chip.active").forEach((c) => c.classList.remove("active"));
  }

  /* Portefeuille des billets enregistrés sur cet appareil (permet d'inscrire plusieurs personnes sans perdre leurs billets) */
  function renderSavedTicketsBar(activeNum = null) {
    const bar = $("#saved-tickets-bar");
    const listBox = $("#stb-list");
    const titleEl = $("#stb-title");
    if (!bar || !listBox) return;
    const savedList = getRsvpList();
    if (!savedList.length) {
      bar.classList.add("hidden");
      listBox.innerHTML = "";
      return;
    }
    if (titleEl) {
      titleEl.textContent = savedList.length > 1
        ? `🎟️ ${savedList.length} billets enregistrés sur ce téléphone`
        : "🎟️ 1 billet enregistré sur ce téléphone";
    }
    listBox.innerHTML = "";
    savedList.forEach((item) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "stb-chip" + (String(activeNum) === String(item.num) ? " active" : "");
      const shortName = String(item.nom || "Invité").trim().split(/\s+/).slice(0, 2).join(" ");
      chip.innerHTML = `<b>N°${escapeHTML(item.num)}</b> ${escapeHTML(shortName)}`;
      chip.addEventListener("click", () => {
        last = item;
        showInvite(item);
        renderSavedTicketsBar(item.num);
        toast(`🎟️ Billet N°${item.num} de ${item.nom} affiché`);
      });
      listBox.appendChild(chip);
    });
    bar.classList.remove("hidden");
  }

  $("#stb-clear")?.addEventListener("click", () => {
    if (!confirm("Effacer l'historique des billets de ce téléphone ? (Les inscriptions restent bien enregistrées sur le serveur.)")) return;
    clearSavedRsvps();
    last = null;
    done.classList.add("hidden");
    form.classList.remove("hidden");
    resetLiveTicketPreview();
    renderSavedTicketsBar();
    toast("🧹 Historique effacé sur ce téléphone — prêt pour une nouvelle inscription.");
  });

  /* État initial : le formulaire reste toujours vierge et prêt pour inscrire une nouvelle personne,
     tandis que les billets déjà enregistrés sur ce téléphone restent accessibles en 1 clic dans la barre ci-dessus */
  let last = getLastRsvp();
  renderSavedTicketsBar();
  syncFormUI();

  $("#view-invite")?.addEventListener("click", () => {
    if (last) showInvite(last);
  });

  $("#new-rsvp-btn")?.addEventListener("click", () => {
    done.classList.add("hidden");
    form.classList.remove("hidden");
    form.reset();
    invList.innerHTML = "";
    invCounter = 0;
    addInviteRow();
    clearAllFieldErrors();
    resetLiveTicketPreview();
    syncFormUI();
    nomInput?.focus();
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
    clearAllFieldErrors();

    const nom = (nomInput?.value || "").trim();
    const tel = (telInput?.value || "").trim();
    const presence = presenceSelect?.value || "present";
    const statut = statutSelect?.value || "membre";
    const branche = (brancheSelect?.value || "").trim();

    /* 1. Validation du nom (au moins 2 caractères) */
    if (nom.length < 2) {
      setFieldError(errNom, "Veuillez indiquer le nom et prénom (au moins 2 caractères).");
      nomInput?.focus();
      return;
    }

    /* 2. Validation du téléphone ivoirien / international (si renseigné) */
    if (tel && !isValidIvorianOrIntlPhone(tel)) {
      setFieldError(errTel, "Numéro invalide. Utilisez un numéro à 10 chiffres (01, 05, 07…) ou +225.");
      telInput?.focus();
      return;
    }

    /* 3. Validation de la branche (obligatoire pour les membres) */
    if (statut === "membre" && !branche) {
      setFieldError(errBranche, "Veuillez choisir la branche dans la liste.");
      brancheSelect?.focus();
      return;
    }

    /* 4. Invités (facultatifs : si un invité est saisi, on l'enregistre) */
    const invites = presence === "present" ? collectInvites() : [];
    const namedInvites = invites.filter((i) => i.nom && i.nom.length >= 2);

    const minPeople = presence === "present" ? Math.max(1, 1 + namedInvites.length) : 1;
    const rawPeople = parseInt(accompInput?.value || String(minPeople), 10) || minPeople;
    const peopleCount = presence === "present" ? Math.min(Math.max(rawPeople, minPeople), 30) : 1;
    const childrenCount = presence === "present"
      ? Math.min(Math.max(parseInt(childrenInput?.value || "0", 10) || 0, 0), peopleCount)
      : 0;

    const data = {
      num: null,
      ticket_code: "",
      nom,
      presence,
      statut,
      tel,
      people: peopleCount,
      children: childrenCount,
      need_transport: presence === "present" && !!transportCheck?.checked,
      want_more: !!wantMoreCheck?.checked,
      branche: statut === "membre" ? branche : "",
      localite: ($("#f-localite")?.value || "").trim(),
      note: ($("#f-note")?.value || "").trim(),
      invites: namedInvites,
      ami_nom: namedInvites[0]?.nom || "",
      ami_tel: namedInvites[0]?.tel || "",
      inactif_nom: namedInvites[1]?.nom || "",
      inactif_tel: namedInvites[1]?.tel || "",
      at: new Date().toISOString(),
    };

    /* Désactivation du bouton pendant l'envoi pour éviter les doubles clics */
    const originalBtnText = submitBtn ? submitBtn.textContent : "";
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "⏳ Envoi en cours…";
    }

    try {
      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) {
        showFormError(j.error || "Une erreur est survenue lors de l'enregistrement. Veuillez réessayer.");
        return;
      }
      if (j.entry && j.entry.num) data.num = j.entry.num;
      if (j.entry && j.entry.ticket_code) data.ticket_code = j.entry.ticket_code;
      if (j.duplicate) {
        toast(`ℹ️ Cette personne était déjà inscrite : voici son billet N°${data.num}`);
      } else {
        toast("🎟️ Billet validé et enregistré !");
      }
    } catch {
      /* Toujours bloquer en cas d'échec réseau afin de ne jamais créer un billet fictif absent du serveur */
      showFormError(
        navigator.onLine
          ? "Le serveur met un instant à répondre. Patientez quelques secondes puis appuyez de nouveau sur « Valider » (vos informations saisies sont conservées)."
          : "Pas de connexion Internet. Vérifiez votre réseau et réessayez (vos informations saisies sont conservées)."
      );
      return;
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
      }
    }

    saveRsvp(data);
    currentInvite = data;
    last = data;

    form.reset();
    invList.innerHTML = "";
    invCounter = 0;
    addInviteRow();
    form.classList.add("hidden");
    syncFormUI();

    renderSavedTicketsBar(data.num);
    setDoneHeading(nom, presence);
    updateSelfReminderLink(data);
    done.classList.remove("hidden");
    renderInvitesShare(namedInvites, nom);
    showInvite(data);
  });

  /* ---------- Génération de la Carte d'Invitation HD (Design Éclairer le Monde — Canvas 2x) ---------- */
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

  /* Étoile géométrique Éclairer le Monde */
  function drawLightTheWorldStar(x, cx, cy, scale = 1) {
    x.save();
    x.translate(cx, cy);
    x.scale(scale, scale);
    x.strokeStyle = "#CC092F";
    x.lineWidth = 4.2;
    x.lineCap = "butt";
    const segs = [
      [0, -44, 0, 62],
      [0, 71, 0, 80],
      [-34, 0, 26, 0],
      [33, 0, 41, 0],
      [0, 0, -18, -18],
      [-23, -23, -31, -31],
      [0, 0, 24, -24],
      [0, 0, -16, 16],
      [0, 0, 26, 26],
    ];
    for (const [x1, y1, x2, y2] of segs) {
      x.beginPath();
      x.moveTo(x1, y1);
      x.lineTo(x2, y2);
      x.stroke();
    }
    x.restore();
  }

  /* Double cadre géométrique rouge Éclairer le Monde (2 tracés entrelacés exacts) */
  function drawElwFrame(x, W, H) {
    const RED = "#CC092F";
    const r = 46;
    x.save();
    x.strokeStyle = RED;
    x.lineWidth = 2.2;

    /* Tracé A : coin concave haut-gauche, angles droits ailleurs */
    const ax1 = 44, ay1 = 30, ax2 = W - 62, ay2 = H - 48;
    x.beginPath();
    x.moveTo(ax1 + r, ay1);
    x.lineTo(ax2, ay1);
    x.lineTo(ax2, ay2);
    x.lineTo(ax1, ay2);
    x.lineTo(ax1, ay1 + r);
    x.arc(ax1, ay1, r, Math.PI / 2, 0, true);
    x.stroke();

    /* Tracé B : coin concave bas-droite, angles droits ailleurs */
    const bx1 = 62, by1 = 48, bx2 = W - 44, by2 = H - 30;
    x.beginPath();
    x.moveTo(bx1, by1);
    x.lineTo(bx2, by1);
    x.lineTo(bx2, by2 - r);
    x.arc(bx2, by2, r, -Math.PI / 2, Math.PI, true);
    x.lineTo(bx1, by2);
    x.closePath();
    x.stroke();

    /* Losanges rouges interrompant les lignes verticales gauche et droite */
    const drawDiamond = (dx, dy) => {
      x.save();
      x.translate(dx, dy);
      x.fillStyle = "#FFFFFF";
      x.fillRect(-10, -22, 20, 44);
      x.rotate(Math.PI / 4);
      x.fillStyle = RED;
      x.fillRect(-6, -6, 12, 12);
      x.restore();
    };
    drawDiamond(ax1, 252);
    drawDiamond(bx2, H - 236);

    /* Signature ÉclairerLeMonde.org incrustée sur les bordures inférieures */
    x.fillStyle = "#FFFFFF";
    x.fillRect(W / 2 - 150, H - 62, 300, 44);
    x.textAlign = "left";
    x.fillStyle = RED;
    const parts = [
      { txt: "Éclairer", font: "800 28px 'Plus Jakarta Sans', sans-serif" },
      { txt: "Le", font: "300 28px 'Plus Jakarta Sans', sans-serif" },
      { txt: "Monde.org", font: "800 28px 'Plus Jakarta Sans', sans-serif" },
    ];
    let totalW = 0;
    for (const p of parts) {
      x.font = p.font;
      totalW += x.measureText(p.txt).width;
    }
    let px = (W - totalW) / 2;
    for (const p of parts) {
      x.font = p.font;
      x.fillText(p.txt, px, H - 30);
      px += x.measureText(p.txt).width;
    }
    x.restore();
  }

  async function buildInviteCanvas(d) {
    if (document.fonts && document.fonts.ready) {
      try { await document.fonts.ready; } catch {}
    }
    const scale = 2;
    const W = 760, H = 1080;
    const c = document.createElement("canvas");
    c.width = W * scale; c.height = H * scale;
    const x = c.getContext("2d");
    x.scale(scale, scale);

    /* Fond blanc pur */
    x.fillStyle = "#FFFFFF";
    x.fillRect(0, 0, W, H);

    /* Double cadre géométrique rouge + losanges + signature ÉclairerLeMonde.org */
    drawElwFrame(x, W, H);

    /* Étoile Éclairer le Monde en haut */
    drawLightTheWorldStar(x, W / 2, 148, 1.08);

    x.textAlign = "center";

    /* Titre principal fidèle à la carte */
    x.fillStyle = "#CC092F";
    x.font = "600 28px 'Plus Jakarta Sans', sans-serif";
    x.fillText("Célébrez la naissance de", W / 2, 286);

    x.font = "800 60px 'Plus Jakarta Sans', sans-serif";
    x.fillText("Jésus-Christ", W / 2, 348);

    x.font = "600 28px 'Plus Jakarta Sans', sans-serif";
    x.fillText("avec nous", W / 2, 386);

    /* Bloc nominatif discret et élégant */
    x.fillStyle = "#FDF7F8";
    drawRoundRect(x, 108, 412, W - 216, 126, 16);
    x.fill();
    x.strokeStyle = "#F0D6DC";
    x.lineWidth = 1.5;
    drawRoundRect(x, 108, 412, W - 216, 126, 16);
    x.stroke();

    x.fillStyle = "#745B62";
    x.font = "700 15px 'Plus Jakarta Sans', sans-serif";
    x.fillText(`BILLET PERSONNEL · N°${d.num} (${d.people || 1} PERS.)`, W / 2, 444);

    const rawName = String(d.nom || "Invité").trim();
    const fontSize = rawName.length > 26 ? 26 : rawName.length > 18 ? 30 : 34;
    x.fillStyle = "#1A1517";
    x.font = `800 ${fontSize}px 'Plus Jakarta Sans', sans-serif`;
    x.fillText(rawName.length > 36 ? rawName.slice(0, 35) + "…" : rawName, W / 2, 486);

    const comp = `Accompagnement : ${getCompanionText(d)}`;
    x.fillStyle = "#CC092F";
    x.font = "600 18px 'Plus Jakarta Sans', sans-serif";
    x.fillText(comp.length > 48 ? comp.slice(0, 47) + "…" : comp, W / 2, 520);

    /* Petit trait séparateur rouge */
    x.fillStyle = "#CC092F";
    x.fillRect(W / 2 - 24, 566, 48, 3);

    /* Date, Église & Lieu */
    x.fillStyle = "#1A1517";
    x.font = "800 22px 'Plus Jakarta Sans', sans-serif";
    x.fillText("DATE  |  Jeudi 24/12/2026 · 10h–15h", W / 2, 616);

    x.font = "800 21px 'Plus Jakarta Sans', sans-serif";
    x.fillText("L'Église de Jésus-Christ", W / 2, 658);
    x.fillText("des Saints des Derniers Jours", W / 2, 686);

    x.fillStyle = "#362F32";
    x.font = "500 21px 'Plus Jakarta Sans', sans-serif";
    x.fillText("Salle des fêtes d'Aboisso", W / 2, 728);

    /* Personnes à contacter */
    x.fillStyle = "#1A1517";
    x.font = "800 16px 'Plus Jakarta Sans', sans-serif";
    x.fillText("Personnes à contacter :", W / 2, 932);
    x.fillStyle = "#2E272A";
    x.font = "600 16px 'Plus Jakarta Sans', sans-serif";
    x.fillText("Président Kpadonou (Président du District) : 05 74 15 29 55", W / 2, 958);
    x.fillStyle = "#52464B";
    x.font = "600 16px 'Plus Jakarta Sans', sans-serif";
    x.fillText("Les missionnaires : 07 15 26 82 82 / 07 15 26 81 81", W / 2, 984);

    return new Promise((resolve) => {
      const done = () => resolve(c);
      const qrData = makeQR(inviteLink(d));
      if (qrData) {
        const img = new Image();
        img.onload = () => {
          const qy = 746;
          x.fillStyle = "#FFFFFF";
          drawRoundRect(x, W / 2 - 78, qy, 156, 156, 14); x.fill();
          x.strokeStyle = "#EAD2D8"; x.lineWidth = 2;
          drawRoundRect(x, W / 2 - 78, qy, 156, 156, 14); x.stroke();
          x.drawImage(img, W / 2 - 66, qy + 12, 132, 132);
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
    const msg = `✦ Un Sauveur est né · Il est le Cadeau ✦\nVoici notre billet (N°${d.num}) pour la fête de Noël du jeudi 24 décembre 2026 (10h00–15h00) à la salle des fêtes de la mairie d'Aboisso 🎄`;
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

  /* Lecture directe #billet-NUM ou #billet-NUM-CODE (scan QR Code) */
  async function checkTicketHash() {
    const mHash = location.hash.match(/^#billet-(\d+)(?:-([a-f0-9]+))?$/i);
    if (!mHash) return;
    const ticketNum = mHash[1];
    const ticketCode = mHash[2] || "";
    let found = Object.values(getRsvps()).find((r) => String(r.num) === ticketNum);
    if (!found) {
      try {
        const qs = new URLSearchParams({ num: ticketNum });
        if (ticketCode) qs.set("code", ticketCode);
        const res = await fetch(`/api/ticket?${qs.toString()}`);
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

/* ---------- Signalement public d'un contenu (Mur photo ou Vœu) ---------- */
async function reportCommunityItem(type, id) {
  if (!id || String(id).startsWith("seed-")) {
    toast("ℹ️ Cet élément fait partie de la présentation officielle.");
    return;
  }
  if (!confirm("Signaler ce contenu aux responsables du district pour vérification ?")) return;
  try {
    await fetch("/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, id }),
    });
    toast("🚩 Merci, ce contenu a été signalé à l'administrateur.");
  } catch {
    toast("Impossible d'envoyer le signalement pour le moment.");
  }
}

/* =========================================================
   LIVRE D'OR (AVEC PRÉ-MODÉRATION, CONSENTEMENT & SIGNALEMENT)
   ========================================================= */
(function initGuestbook() {
  const KEY = "noel-aboisso-guestbook";
  const form = $("#guestbook-form");
  const list = $("#gb-list");
  const msg = $("#g-msg");
  const count = $("#g-count");
  const consent = $("#g-consent");
  if (!form || !list || !msg || !count) return;

  const DEFAULT_SEEDS = [
    { id: 101, nom: "Présidence du District d'Aboisso", msg: "Soyez les bienvenus avec vos proches et vos invités pour célébrer la naissance de notre Sauveur Jésus-Christ ce jeudi 24 décembre !", at: "2026-11-15T10:00:00.000Z" },
    { id: 102, nom: "Famille Kouamé (Aboisso 1)", msg: "Quelle joie de proclamer ensemble : « Un Sauveur est né, Il est le cadeau ! » Nous viendrons avec nos voisins.", at: "2026-11-16T14:30:00.000Z" },
    { id: 103, nom: "Sœur Adjoua (Branche d'Ayamé)", msg: "Hâte de partager les cantiques, le théâtre de la Nativité et le repas fraternel avec tous nos amis invités !", at: "2026-11-18T17:15:00.000Z" },
  ];

  const load = () => {
    try {
      const parsed = JSON.parse(localStorage.getItem(KEY) || "[]");
      return parsed.length ? parsed : DEFAULT_SEEDS;
    } catch { return DEFAULT_SEEDS; }
  };
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
      const who = document.createElement("div");
      who.className = "who";
      const left = document.createElement("span");
      left.textContent = e.nom;
      const when = document.createElement("span");
      when.className = "when";
      when.textContent = new Date(e.at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
      left.appendChild(when);

      const repBtn = document.createElement("button");
      repBtn.type = "button";
      repBtn.className = "gb-report";
      repBtn.title = "Signaler ce message";
      repBtn.setAttribute("aria-label", `Signaler le message de ${e.nom}`);
      repBtn.textContent = "🚩 Signaler";
      repBtn.addEventListener("click", () => reportCommunityItem("guestbook", e.id));

      who.append(left, repBtn);
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
    if (consent && !consent.checked) { toast("Veuillez cocher la case d'accord avant de publier 🙏"); return; }

    const submitBtn = $("#gb-submit-btn");
    if (submitBtn) submitBtn.disabled = true;

    const payload = { nom, msg: texte, at: new Date().toISOString() };
    let isPending = false;
    try {
      const res = await fetch("/api/guestbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(j.error || "Envoi impossible.");
        return;
      }
      isPending = !!j.pending;
      if (j.entry && !isPending) {
        serverEntries = [...(serverEntries ?? []), j.entry];
      }
    } catch {
      toast("Impossible d'envoyer votre message. Vérifiez votre connexion Internet.");
      return;
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
    form.reset();
    count.textContent = "0/200";
    render();
    toast(
      isPending
        ? "💌 Merci ! Vos vœux seront affichés après validation par l'équipe du district."
        : "💌 Merci pour vos vœux de Noël !",
      4500
    );
  });

  render();
})();

/* =========================================================
   MUR PHOTO — « Je serai là ! » (AVEC CONSENTEMENT, LIMITE 5 Mo & SIGNALEMENT)
   ========================================================= */
(function initPhotoWall() {
  const KEY = "noel-aboisso-wall";
  const PAGE_SIZE = 24;
  const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 Mo max
  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

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
  const consent = $("#w-consent");
  const camModal = $("#cam-modal");
  const camVideo = $("#cam-video");
  const camCanvas = $("#cam-canvas");
  if (!form || !grid || !drop || !fileInput) return;

  const DEFAULT_WALL_SEEDS = [
    { id: "seed-1", nom: "Présidence du District", msg: "Soyez les bienvenus à Aboisso le 24 décembre !", photo: "assets/photo-event.jpg", at: "2026-11-14T09:00:00.000Z" },
    { id: "seed-2", nom: "Chorales & Jeunes d'Aboisso", msg: "En répétition pour les cantiques de la Nativité 🎶", photo: "assets/nativite-famille.jpg", at: "2026-11-15T11:30:00.000Z" },
    { id: "seed-3", nom: "Équipe d'Accueil & Missionnaires", msg: "Nous vous attendons dès 10h00 avec votre invité !", photo: "assets/sapin-noel.jpg", at: "2026-11-17T16:00:00.000Z" },
  ];

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

  const load = () => {
    try {
      const parsed = JSON.parse(localStorage.getItem(KEY) || "[]");
      return parsed.length ? parsed : DEFAULT_WALL_SEEDS;
    } catch { return DEFAULT_WALL_SEEDS; }
  };
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
    if (f.type && !ALLOWED_TYPES.includes(f.type)) {
      toast("Format non supporté : choisissez une image JPG, PNG ou WebP.");
      fileInput.value = "";
      return;
    }
    if (f.size > MAX_FILE_BYTES) {
      toast("Cette photo dépasse 5 Mo. Choisissez une photo plus légère.");
      fileInput.value = "";
      return;
    }
    try {
      photoData = await resizeImage(f);
      preview.src = photoData;
      preview.classList.remove("hidden");
      placeholder.classList.add("hidden");
      error?.classList.add("hidden");
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
      x.fillStyle = "#654E55";
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
    empty?.classList.toggle("hidden", all.length > 0);

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
      img.src = e.photo;
      img.alt = `Photo partagée par ${e.nom || "un participant"}${e.msg ? " : " + e.msg : ""}`;
      img.width = 250; img.height = 250; img.loading = "lazy";
      ph.appendChild(img);
      const cap = document.createElement("figcaption");
      cap.className = "wc-name"; cap.textContent = e.nom;
      fig.append(ph, cap);

      const pid = photoId(e);
      const like = document.createElement("button");
      like.type = "button"; like.className = "wc-like" + (getLikes()[pid] ? " on" : "");
      like.setAttribute("aria-label", `Aimer la photo de ${e.nom}`);
      like.innerHTML = getLikes()[pid] ? "❤️<b>1</b>" : "🤍";
      like.addEventListener("click", (ev) => { ev.stopPropagation(); toggleLike(pid, like); });
      fig.appendChild(like);

      const dl = document.createElement("button");
      dl.type = "button"; dl.className = "wc-dl"; dl.textContent = "⬇️";
      dl.setAttribute("aria-label", `Télécharger la photo souvenir de ${e.nom}`);
      dl.addEventListener("click", (ev) => { ev.stopPropagation(); drawFramedPhoto(e); });
      fig.appendChild(dl);

      const rep = document.createElement("button");
      rep.type = "button"; rep.className = "wc-report"; rep.textContent = "🚩";
      rep.title = "Signaler cette photo";
      rep.setAttribute("aria-label", `Signaler la photo de ${e.nom}`);
      rep.addEventListener("click", (ev) => { ev.stopPropagation(); reportCommunityItem("photo-wall", e.id); });
      fig.appendChild(rep);

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
    if (!photoData || !nom || (consent && !consent.checked)) {
      error.classList.remove("hidden");
      return;
    }
    error.classList.add("hidden");
    const submitBtn = $("#wall-submit-btn");
    if (submitBtn) submitBtn.disabled = true;

    const payload = { nom, msg: $("#w-msg").value.trim(), photo: photoData, at: new Date().toISOString() };
    let isPending = false;
    try {
      const res = await fetch("/api/photo-wall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(json.error || "Envoi impossible 😕");
        return;
      }
      isPending = !!json.pending;
      if (json.entry && !isPending) {
        serverEntries = [...(serverEntries ?? []), json.entry];
      }
    } catch {
      toast("Impossible d'envoyer votre photo. Vérifiez votre connexion Internet.");
      return;
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
    form.reset();
    photoData = null;
    fileInput.value = "";
    preview.src = "";
    preview.classList.add("hidden");
    placeholder.classList.remove("hidden");
    render();
    toast(
      isPending
        ? "📸 Merci ! Votre photo sera publiée sur le mur après validation par l'équipe du district."
        : "📸 Votre photo est publiée sur le mur !",
      4500
    );
  });

  render();
})();

/* =========================================================
   LECTEUR DE MUSIQUE DISCRET (preload="none" — LANCÉ UNIQUEMENT AU CLIC)
   ========================================================= */
(function initMusic() {
  const KEY_VOL = "noel-aboisso-volume";
  const audio = new Audio();
  window.__musicAudio = audio;
  audio.preload = "none";
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

  let userPaused = false;

  els.play.addEventListener("click", () => {
    if (!started) { userPaused = false; return playRandom(false); }
    if (audio.paused) {
      userPaused = false;
      audio.play().catch(() => {});
    } else {
      userPaused = true;
      audio.pause();
    }
  });
  els.next.addEventListener("click", () => { userPaused = false; shuffle ? playRandom(false) : playIndex(idx + 1, false); });
  els.prev.addEventListener("click", () => { userPaused = false; shuffle ? playRandom(false) : playIndex(idx - 1, false); });
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
    if (!started) { userPaused = false; playRandom(true); panelOpen = true; panel.classList.remove("hidden"); return; }
    panelOpen = !panelOpen;
    panel.classList.toggle("hidden", !panelOpen);
  });
  els.close.addEventListener("click", () => { panelOpen = false; panel.classList.add("hidden"); });

  window.__startMusic = (withFade = true) => {
    if (!started && !userPaused) playRandom(withFade);
  };

  /* Sécurité : si l'écran d'ouverture a été sauté (lien direct #billet-…), lance la playlist au 1er clic/toucher */
  const autoStartOnce = () => {
    if (!started && !userPaused) {
      const vid = $("#main-video");
      if (!vid || vid.paused) playRandom(true);
    }
    removeEventListener("pointerdown", autoStartOnce);
  };
  addEventListener("pointerdown", autoStartOnce, { passive: true });
})();
