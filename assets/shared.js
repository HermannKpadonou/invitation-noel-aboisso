/* =========================================================
   Utilitaires partagés (Front-office & Back-office)
   Éclairer le Monde — Noël à Aboisso
   ========================================================= */
(function (global) {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const pad = (n) => String(n).padStart(2, "0");

  /* Préférence d'accessibilité : réduction des animations */
  const reducedMotionQuery = global.matchMedia
    ? global.matchMedia("(prefers-reduced-motion: reduce)")
    : { matches: false };

  /* Numéro local ivoirien → format international pour les liens WhatsApp */
  function normalizePhone(t) {
    const p = String(t || "").replace(/\D/g, "");
    if (!p) return "";
    if (p.startsWith("225")) return p;       // déjà au format international
    if (p.startsWith("0")) return "225" + p; // numéro local 0X XX XX XX XX
    if (p.length === 8) return "225" + p;    // ancien format ivoirien à 8 chiffres
    return p;
  }

  /* Normalisation de chaîne sans accents ni ponctuation (comparaison doublons) */
  function normKey(s) {
    return String(s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "");
  }

  function telKey(s) {
    return String(s || "").replace(/\D/g, "");
  }

  /* Échappement HTML sécurisé contre XSS */
  function escapeHTML(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[c]));
  }

  /* Notification Toast accessible */
  function toast(msg, duration = 3200) {
    const t = document.getElementById("toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove("show"), duration);
  }

  /* Dessin d'un rectangle à coins arrondis compatible tous navigateurs */
  function drawRoundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (typeof ctx.roundRect === "function") {
      ctx.roundRect(x, y, w, h, r);
    } else {
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }
  }

  /* Synthèse sonore cristalline via Web Audio API (0 Ko d'asset externe) */
  let audioCtx = null;
  function playChime(kind = "envelope") {
    try {
      const Ctx = global.AudioContext || global.webkitAudioContext;
      if (!Ctx) return;
      if (!audioCtx) audioCtx = new Ctx();
      if (audioCtx.state === "suspended") audioCtx.resume();

      const now = audioCtx.currentTime;
      /* Arpèges célestes adaptés à l'action */
      const notes =
        kind === "candle"
          ? [523.25, 659.25, 783.99, 1046.5]               // Do5 - Mi5 - Sol5 - Do6 (chaleureux)
          : kind === "checkin"
          ? [587.33, 880.0, 1174.66]                       // Ré5 - La5 - Ré6 (validation claire)
          : [523.25, 659.25, 783.99, 987.77, 1318.51];     // Do5 - Mi5 - Sol5 - Si5 - Mi6 (ouverture féerique)

      notes.forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = i % 2 === 0 ? "sine" : "triangle";
        osc.frequency.setValueAtTime(freq, now + i * 0.085);

        gain.gain.setValueAtTime(0.0001, now + i * 0.085);
        gain.gain.exponentialRampToValueAtTime(0.075, now + i * 0.085 + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.085 + 1.15);

        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now + i * 0.085);
        osc.stop(now + i * 0.085 + 1.2);
      });
    } catch { /* audio non autorisé */ }
  }

  global.ELW = {
    $,
    $$,
    pad,
    normalizePhone,
    normKey,
    telKey,
    escapeHTML,
    toast,
    drawRoundRect,
    playChime,
    isReducedMotion: () => !!reducedMotionQuery.matches,
  };
})(window);
