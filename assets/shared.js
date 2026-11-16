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
    isReducedMotion: () => !!reducedMotionQuery.matches,
  };
})(window);
