/* =========================================================
   Serveur du site + API — Éclairer le Monde · Noël à Aboisso
   Zéro dépendance : Node.js pur (npm install inutile)
   Démarrage local :  node server.js  →  http://localhost:3000
   Déploiement Render : commande "node server.js" (PORT auto)
   ========================================================= */
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

/* ---------- CONFIGURATION ---------- */
const CONFIG = {
  port: process.env.PORT || 3000,
  // ⚠️ À CHANGER : mot de passe du back office (ou variable d'environnement ADMIN_PASSWORD)
  adminPassword: process.env.ADMIN_PASSWORD || "noel2026",
  dataDir: path.join(__dirname, "data"),
};

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".mp3": "audio/mpeg",
  ".ics": "text/calendar; charset=utf-8",
  ".woff2": "font/woff2",
};

/* ---------- STOCKAGE (fichiers JSON) ---------- */
function ensureDataDir() { fs.mkdirSync(CONFIG.dataDir, { recursive: true }); }
function readJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(path.join(CONFIG.dataDir, file), "utf8")); }
  catch { return fallback; }
}
function writeJSON(file, data) {
  ensureDataDir();
  fs.writeFileSync(path.join(CONFIG.dataDir, file), JSON.stringify(data, null, 2));
}

/* ---------- SESSIONS ADMIN ---------- */
const tokens = new Set(); // tokens valides (perdus au redémarrage : il suffit de se reconnecter)

function isAuth(req) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : "";
  return tokens.has(token);
}

/* ---------- HELPERS HTTP ---------- */
function send(res, status, body, headers = {}) {
  const isObj = typeof body === "object" && body !== null && !(body instanceof Buffer);
  const data = isObj ? JSON.stringify(body) : body;
  res.writeHead(status, {
    "Content-Type": isObj ? "application/json; charset=utf-8" : headers["Content-Type"] || "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
    ...headers,
  });
  res.end(data);
}
function readBody(req, max = 1e6) {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (c) => { raw += c; if (raw.length > max) req.destroy(); });
    req.on("end", () => {
      try { resolve(JSON.parse(raw || "{}")); } catch { resolve({}); }
    });
  });
}
function clean(s, max = 200) { return String(s ?? "").trim().slice(0, max); }

/* ---------- FICHIERS STATIQUES (avec garde-fous) ---------- */
const BLOCKED = ["server.js", "data", "package.json", ".git", "rename.ps1"];
function serveStatic(req, res, urlPath) {
  const safe = path.normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[\/\\])+/, "");
  if (BLOCKED.some((b) => safe.toLowerCase().startsWith(b) || ("/" + safe).includes("/" + b))) {
    return send(res, 404, "Not found");
  }
  let filePath = path.join(__dirname, safe === "/" ? "index.html" : safe);
  if (!filePath.startsWith(__dirname)) return send(res, 403, "Forbidden");
  fs.stat(filePath, (err, st) => {
    if (!err && st.isDirectory()) filePath = path.join(filePath, "index.html");
    fs.readFile(filePath, (err2, data) => {
      if (err2) return send(res, 404, "Not found");
      send(res, 200, data, {
        "Content-Type": MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream",
        "Cache-Control": "public, max-age=3600",
      });
    });
  });
}

/* ---------- API ---------- */
async function handleAPI(req, res, url) {
  const { pathname, searchParams } = url;

  /* --- Connexion admin --- */
  if (pathname === "/api/login" && req.method === "POST") {
    const body = await readBody(req);
    if (clean(body.password) === CONFIG.adminPassword) {
      const token = crypto.randomBytes(24).toString("hex");
      tokens.add(token);
      return send(res, 200, { ok: true, token });
    }
    return send(res, 401, { ok: false, error: "Mot de passe incorrect" });
  }

  /* --- RSVP (public : envoi) --- */
  if (pathname === "/api/rsvp" && req.method === "POST") {
    const body = await readBody(req);
    const nom = clean(body.nom, 80);
    if (!nom) return send(res, 400, { ok: false, error: "Nom requis" });
    const rsvps = readJSON("rsvps.json", []);
    const entry = {
      id: (rsvps.reduce((m, r) => Math.max(m, r.id || 0), 0) || 0) + 1,
      num: Math.floor(100 + Math.random() * 900),
      nom,
      presence: body.presence === "absent" ? "absent" : "present",
      tel: clean(body.tel, 30),
      people: Math.min(Math.max(parseInt(body.people) || 1, 1), 30),
      note: clean(body.note, 150),
      at: new Date().toISOString(),
    };
    rsvps.push(entry);
    writeJSON("rsvps.json", rsvps);
    return send(res, 200, { ok: true, entry });
  }

  /* --- Livre d'or (public : lire / écrire) --- */
  if (pathname === "/api/guestbook" && req.method === "GET") {
    const all = readJSON("guestbook.json", []);
    return send(res, 200, all.slice(-80));
  }
  if (pathname === "/api/guestbook" && req.method === "POST") {
    const body = await readBody(req);
    const nom = clean(body.nom, 60);
    const msg = clean(body.msg, 250);
    if (!nom || !msg) return send(res, 400, { ok: false, error: "Nom et message requis" });
    const all = readJSON("guestbook.json", []);
    const entry = { id: Date.now(), nom, msg, at: new Date().toISOString() };
    all.push(entry);
    writeJSON("guestbook.json", all);
    return send(res, 200, { ok: true, entry });
  }

  /* --- Mur photo « Je serai là ! » (public : lire / ajouter) --- */
  if (pathname === "/api/photo-wall" && req.method === "GET") {
    return send(res, 200, readJSON("photo-wall.json", []));
  }
  if (pathname === "/api/photo-wall" && req.method === "POST") {
    const body = await readBody(req, 5e5); // ~500 Ko max (photo base64)
    const nom = clean(body.nom, 40);
    const msg = clean(body.msg, 80);
    const photo = typeof body.photo === "string" ? body.photo : "";
    if (!nom) return send(res, 400, { ok: false, error: "Nom requis" });
    if (!photo.startsWith("data:image/")) return send(res, 400, { ok: false, error: "Photo requise" });
    if (photo.length > 45e4) return send(res, 413, { ok: false, error: "Photo trop lourde — choisissez-en une plus petite" });
    const all = readJSON("photo-wall.json", []);
    if (all.length >= 300) all.shift(); // garde-fou : 300 photos maximum
    const entry = { id: Date.now(), nom, msg, photo, at: new Date().toISOString() };
    all.push(entry);
    writeJSON("photo-wall.json", all);
    return send(res, 200, { ok: true, entry });
  }

  /* --- Back office (protégé) --- */
  if (pathname.startsWith("/api/admin/")) {
    if (!isAuth(req)) return send(res, 401, { ok: false, error: "Non autorisé" });

    if (pathname === "/api/admin/summary" && req.method === "GET") {
      const rsvps = readJSON("rsvps.json", []);
      const guestbook = readJSON("guestbook.json", []);
      const wall = readJSON("photo-wall.json", []);
      const stats = {
        total: rsvps.length,
        presents: rsvps.filter((r) => r.presence === "present").length,
        absents: rsvps.filter((r) => r.presence === "absent").length,
        people: rsvps.filter((r) => r.presence === "present").reduce((s, r) => s + (r.people || 1), 0),
        messages: guestbook.length,
      };
      return send(res, 200, { ok: true, rsvps, guestbook, wall, stats });
    }

    if (pathname === "/api/admin/export.csv" && req.method === "GET") {
      const rsvps = readJSON("rsvps.json", []);
      const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      const lines = [
        ["N° billet", "Nom", "Présence", "Personnes", "Téléphone", "Note", "Date"].join(";"),
        ...rsvps.map((r) => [
          r.num, esc(r.nom), r.presence === "present" ? "Présent(e)" : "Absent(e)",
          r.people, esc(r.tel), esc(r.note), esc(new Date(r.at).toLocaleString("fr-FR")),
        ].join(";")),
      ];
      return send(res, 200, "\uFEFF" + lines.join("\r\n"), {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=inscriptions-noel-aboisso.csv",
      });
    }

    if (pathname === "/api/admin/rsvp" && req.method === "DELETE") {
      const id = parseInt(searchParams.get("id"));
      const rsvps = readJSON("rsvps.json", []).filter((r) => r.id !== id);
      writeJSON("rsvps.json", rsvps);
      return send(res, 200, { ok: true });
    }

    if (pathname === "/api/admin/guestbook" && req.method === "DELETE") {
      const id = parseInt(searchParams.get("id"));
      const all = readJSON("guestbook.json", []).filter((g) => g.id !== id);
      writeJSON("guestbook.json", all);
      return send(res, 200, { ok: true });
    }

    if (pathname === "/api/admin/photo-wall" && req.method === "DELETE") {
      const id = parseInt(searchParams.get("id"));
      const all = readJSON("photo-wall.json", []).filter((p) => p.id !== id);
      writeJSON("photo-wall.json", all);
      return send(res, 200, { ok: true });
    }
    return send(res, 404, { ok: false, error: "Route inconnue" });
  }

  return send(res, 404, { ok: false, error: "Route inconnue" });
}

/* ---------- SERVEUR ---------- */
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (url.pathname.startsWith("/api/")) return await handleAPI(req, res, url);
    return serveStatic(req, res, url.pathname);
  } catch (e) {
    return send(res, 500, { ok: false, error: "Erreur serveur" });
  }
});

ensureDataDir();
server.listen(CONFIG.port, () => {
  console.log(`✦ Site    : http://localhost:${CONFIG.port}`);
  console.log(`✦ Back office : http://localhost:${CONFIG.port}/admin.html`);
  console.log(`✦ Mot de passe admin : ${CONFIG.adminPassword === "noel2026" ? "noel2026 (PENSEZ À LE CHANGER)" : "(personnalisé)"}`);
});
