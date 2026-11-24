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

  /* Étoile géométrique Éclairer le Monde (partagée Front & Back-office) */
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
      { txt: "Éclairer", font: "800 28px 'Plus Jakarta Sans', 'Inter', sans-serif" },
      { txt: "Le", font: "300 28px 'Plus Jakarta Sans', 'Inter', sans-serif" },
      { txt: "Monde.org", font: "800 28px 'Plus Jakarta Sans', 'Inter', sans-serif" },
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

  /* Découpe un texte en lignes selon une largeur max */
  function splitWrappedLines(ctx, text, maxW, maxLines = 2) {
    const words = String(text || "").trim().split(/\s+/).filter(Boolean);
    const lines = [];
    let line = "";
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > maxW && line) {
        lines.push(line);
        line = w;
        if (lines.length === maxLines - 1) break;
      } else {
        line = test;
      }
    }
    if (line) {
      const consumed = lines.join(" ").split(/\s+/).filter(Boolean).length;
      const rest = words.slice(consumed).join(" ");
      let lastLine = rest || line;
      while (ctx.measureText(lastLine).width > maxW && lastLine.length > 4) {
        lastLine = lastLine.slice(0, -2) + "…";
      }
      lines.push(lastLine);
    }
    return lines.length ? lines : [""];
  }

  /* Carte Photo Souvenir « Éclairer le Monde — Noël à Aboisso » (Design UX éditorial, Canvas 2x) */
  async function downloadFramedPhoto(e) {
    if (document.fonts && document.fonts.ready) {
      try { await document.fonts.ready; } catch {}
    }
    toast("📤 Préparation de la photo encadrée…");

    const scale = 2;
    const W = 760, H = 1080;
    const RED = "#CC092F";
    const FONT = "'Plus Jakarta Sans', 'Inter', -apple-system, sans-serif";
    const c = document.createElement("canvas");
    c.width = W * scale;
    c.height = H * scale;
    const x = c.getContext("2d");
    x.scale(scale, scale);

    /* Fond blanc pur + double cadre géométrique rouge Éclairer le Monde */
    x.fillStyle = "#FFFFFF";
    x.fillRect(0, 0, W, H);
    drawElwFrame(x, W, H);

    /* Étoile géométrique centrée */
    drawLightTheWorldStar(x, W / 2, 96, 0.56);

    /* En-tête éditorial hiérarchisé : Éclairer le Monde — Noël à Aboisso */
    x.textAlign = "center";
    x.fillStyle = RED;
    x.font = `800 17px ${FONT}`;
    const kicker = "ÉCLAIRER LE MONDE";
    const kw = x.measureText(kicker).width;
    x.fillText(kicker, W / 2, 172);

    /* Petits filets décoratifs encadrant « ÉCLAIRER LE MONDE » */
    x.strokeStyle = "rgba(204, 9, 47, 0.45)";
    x.lineWidth = 1.8;
    x.beginPath();
    x.moveTo(W / 2 - kw / 2 - 42, 166);
    x.lineTo(W / 2 - kw / 2 - 14, 166);
    x.moveTo(W / 2 + kw / 2 + 14, 166);
    x.lineTo(W / 2 + kw / 2 + 42, 166);
    x.stroke();

    x.fillStyle = RED;
    x.font = `800 44px ${FONT}`;
    x.fillText("Noël à Aboisso", W / 2, 220);

    const pw = 472;
    const px = (W - pw) / 2;
    const py = 244;
    const slogan = String(e.msg || "").trim() || "J'y serai, et toi ?";
    const nom = String(e.nom || "").trim();

    const drawCardDetails = () => {
      /* Pilule slogan rouge carmin chevauchant élégamment le bas de la photo */
      const sloganText = `« ${slogan} »`;
      const fontSize = sloganText.length > 34 ? 21 : 25;
      x.font = `800 ${fontSize}px ${FONT}`;
      const lines = splitWrappedLines(x, sloganText, 480, 2);
      const lineH = fontSize + 8;
      const maxLineW = Math.max(...lines.map((l) => x.measureText(l).width));
      const pillW = Math.min(544, Math.max(260, maxLineW + 68));
      const pillH = lines.length * lineH + 26;
      const pillX = (W - pillW) / 2;
      const pillY = py + pw - 24;
      const pillR = lines.length > 1 ? 26 : pillH / 2;

      x.save();
      x.shadowColor = "rgba(204, 9, 47, 0.28)";
      x.shadowBlur = 20;
      x.shadowOffsetY = 8;
      drawRoundRect(x, pillX, pillY, pillW, pillH, pillR);
      x.fillStyle = RED;
      x.fill();
      x.restore();

      x.save();
      drawRoundRect(x, pillX, pillY, pillW, pillH, pillR);
      x.strokeStyle = "#FFFFFF";
      x.lineWidth = 4.5;
      x.stroke();
      x.restore();

      x.textAlign = "center";
      x.fillStyle = "#FFFFFF";
      x.font = `800 ${fontSize}px ${FONT}`;
      const startY = pillY + (pillH - (lines.length - 1) * lineH) / 2 + fontSize * 0.34;
      lines.forEach((l, i) => x.fillText(l, W / 2, startY + i * lineH));

      const pillBottom = pillY + pillH;

      /* Nom du participant */
      let cursorY = pillBottom + 24;
      if (nom) {
        const nameY = pillBottom + 42;
        x.fillStyle = "#1F1B1D";
        x.font = `800 28px ${FONT}`;
        x.fillText(nom, W / 2, nameY);
        cursorY = nameY + 22;
      }

      /* Cartouche événementiel doux & structuré */
      const boxW = 544;
      const boxH = 84;
      const boxX = (W - boxW) / 2;
      const boxY = Math.min(cursorY, 850);
      x.save();
      drawRoundRect(x, boxX, boxY, boxW, boxH, 16);
      x.fillStyle = "#FFF6F8";
      x.fill();
      x.strokeStyle = "#F2C4CE";
      x.lineWidth = 1.5;
      x.stroke();
      x.restore();

      x.fillStyle = RED;
      x.font = `800 20px ${FONT}`;
      x.fillText("Jeudi 24 décembre 2026 · 10h00 – 15h00", W / 2, boxY + 34);

      x.fillStyle = "#2D2326";
      x.font = `600 17px ${FONT}`;
      x.fillText("Salle des fêtes de la mairie d'Aboisso · Entrée gratuite", W / 2, boxY + 64);

      /* Mention Église équilibrée au-dessus de ÉclairerLeMonde.org */
      const churchY = Math.max(boxY + boxH + 34, 956);
      x.fillStyle = "#5F4B51";
      x.font = `600 15.5px ${FONT}`;
      x.fillText("L'Église de Jésus-Christ des Saints des Derniers Jours", W / 2, churchY);
      x.fillStyle = "#7A6369";
      x.font = `600 14.5px ${FONT}`;
      x.fillText("District d'Aboisso", W / 2, churchY + 22);
    };

    const finish = () => {
      const a = document.createElement("a");
      a.download = `noel-aboisso-${(nom || "souvenir").replace(/\s+/g, "-").toLowerCase()}.png`;
      a.href = c.toDataURL("image/png");
      a.click();
      toast("⬇️ Photo encadrée enregistrée ! Partagez-la à vos proches ✨");
    };

    /* Passe-partout blanc studio avec ombre portée douce */
    const drawPhotoMat = () => {
      x.save();
      x.shadowColor = "rgba(45, 18, 25, 0.14)";
      x.shadowBlur = 24;
      x.shadowOffsetY = 10;
      drawRoundRect(x, px - 8, py - 8, pw + 16, pw + 16, 20);
      x.fillStyle = "#FFFFFF";
      x.fill();
      x.restore();

      x.save();
      drawRoundRect(x, px - 8, py - 8, pw + 16, pw + 16, 20);
      x.strokeStyle = "rgba(204, 9, 47, 0.35)";
      x.lineWidth = 2;
      x.stroke();
      x.restore();
    };

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      drawPhotoMat();
      x.save();
      drawRoundRect(x, px, py, pw, pw, 14);
      x.clip();
      const side = Math.min(img.width, img.height);
      x.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, px, py, pw, pw);
      x.restore();

      drawCardDetails();
      finish();
    };
    img.onerror = () => {
      drawPhotoMat();
      drawCardDetails();
      finish();
    };
    img.src = e.photo;
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
    drawLightTheWorldStar,
    drawElwFrame,
    downloadFramedPhoto,
    isReducedMotion: () => !!reducedMotionQuery.matches,
  };
})(window);
