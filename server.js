/* =========================================================
   Serveur du site + API — Éclairer le Monde · Noël à Aboisso
   Stockage : PostgreSQL (Neon) si DATABASE_URL est défini,
   sinon fichiers JSON locaux (data/). Zéro autre dépendance.
   Démarrage local :  node server.js  →  http://localhost:3000
   Déploiement Render : commande "node server.js" (PORT auto)
   ========================================================= */
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const zlib = require("zlib");

/* ---------- CONFIGURATION ---------- */
const CONFIG = {
  port: process.env.PORT || 3000,
  // ⚠️ Mot de passe du back office : variable d'environnement ADMIN_PASSWORD
  adminPassword: process.env.ADMIN_PASSWORD || "noel2026",
  dataDir: path.join(__dirname, "data"),
};

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".ics": "text/calendar; charset=utf-8",
  ".woff2": "font/woff2",
};

const COMPRESSIBLE = new Set([".html", ".css", ".js", ".json", ".webmanifest", ".svg", ".ics"]);

/* =========================================================
   STOCKAGE — PostgreSQL (Neon) ou fichiers JSON
   ========================================================= */
let db = null; // Pool Postgres si disponible
if (process.env.DATABASE_URL) {
  try {
    const { Pool } = require("pg");
    db = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }, // exigé par Neon
      max: 5,
    });
  } catch {
    console.warn("⚠️  Package pg absent (npm install) — stockage local utilisé");
    db = null;
  }
}

/* Fichiers JSON (mode local / repli) */
function readJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(path.join(CONFIG.dataDir, file), "utf8")); }
  catch { return fallback; }
}
function writeJSON(file, data) {
  fs.mkdirSync(CONFIG.dataDir, { recursive: true });
  fs.writeFileSync(path.join(CONFIG.dataDir, file), JSON.stringify(data, null, 2));
}

/* Création des tables + import des anciennes données JSON (1re fois) */
async function initDB() {
  if (!db) return;
  await db.query(`
    CREATE TABLE IF NOT EXISTS rsvps (
      id SERIAL PRIMARY KEY,
      num INT NOT NULL,
      nom TEXT NOT NULL,
      presence TEXT NOT NULL DEFAULT 'present',
      tel TEXT DEFAULT '',
      people INT NOT NULL DEFAULT 1,
      note TEXT DEFAULT '',
      at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS guestbook (
      id SERIAL PRIMARY KEY,
      nom TEXT NOT NULL,
      msg TEXT NOT NULL,
      at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS photo_wall (
      id SERIAL PRIMARY KEY,
      nom TEXT NOT NULL,
      msg TEXT DEFAULT '',
      photo TEXT NOT NULL,
      at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS invites (
      id SERIAL PRIMARY KEY,
      rsvp_id INT,
      type TEXT NOT NULL DEFAULT 'ami',
      nom TEXT NOT NULL,
      tel TEXT DEFAULT '',
      at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS lights (
      id SERIAL PRIMARY KEY,
      nom TEXT DEFAULT '',
      inspiration TEXT DEFAULT '',
      at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );`);

  /* Colonnes RSVP ajoutées avec le formulaire enrichi (statut, branche,
     localite, invités : ami + membre inactif + pointage Jour J) — sans casser l'existant */
  for (const col of ["statut", "branche", "localite", "ami_nom", "ami_tel", "inactif_nom", "inactif_tel"]) {
    await db.query(`ALTER TABLE rsvps ADD COLUMN IF NOT EXISTS ${col} TEXT DEFAULT ''`);
  }
  await db.query(`ALTER TABLE rsvps ADD COLUMN IF NOT EXISTS checked_in BOOLEAN DEFAULT FALSE`);
  await db.query(`ALTER TABLE rsvps ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ`);

  /* Import automatique des données locales si les tables sont vides */
  const local = {
    rsvps: readJSON("rsvps.json", []),
    guestbook: readJSON("guestbook.json", []),
    "photo-wall": readJSON("photo-wall.json", []),
  };
  for (const [table, rows] of Object.entries(local)) {
    if (!rows.length) continue;
    const dbTable = table === "photo-wall" ? "photo_wall" : table;
    const c = await db.query(`SELECT COUNT(*)::int AS n FROM ${dbTable}`);
    if (c.rows[0].n > 0) continue;
    for (const r of rows) {
      if (table === "rsvps") {
        await db.query(
          `INSERT INTO rsvps (num, nom, presence, tel, people, note, at) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [r.num, r.nom, r.presence === "absent" ? "absent" : "present", r.tel || "", r.people || 1, r.note || "", r.at]
        );
      } else if (table === "guestbook") {
        await db.query(`INSERT INTO guestbook (nom, msg, at) VALUES ($1,$2,$3)`, [r.nom, r.msg, r.at]);
      } else {
        await db.query(`INSERT INTO photo_wall (nom, msg, photo, at) VALUES ($1,$2,$3,$4)`, [r.nom, r.msg || "", r.photo, r.at]);
      }
    }
    console.log(`✦ Import local → Neon : ${rows.length} ligne(s) dans ${dbTable}`);
  }
}

/* ---------- SESSIONS ADMIN & SÉCURITÉ ---------- */
const tokens = new Set(); // tokens valides (perdus au redémarrage : il suffit de se reconnecter)

function isAuth(req, searchParams = null) {
  const h = req.headers.authorization || "";
  const headerToken = h.startsWith("Bearer ") ? h.slice(7).trim() : "";
  const queryToken = searchParams ? (searchParams.get("token") || "").trim() : "";
  const token = headerToken || queryToken;
  return !!token && tokens.has(token);
}

/* Comparaison à temps constant pour éviter les attaques temporelles */
function verifyPassword(input, expected) {
  const a = Buffer.from(String(input || ""), "utf8");
  const b = Buffer.from(String(expected || ""), "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/* Limitation de débit (Rate-Limiting) en mémoire par IP et par route */
const rateMap = new Map();
function checkRateLimit(req, keySuffix, maxReq = 15, windowMs = 60_000) {
  const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "local").split(",")[0].trim();
  const key = `${ip}:${keySuffix}`;
  const now = Date.now();
  const entry = rateMap.get(key) || { count: 0, resetAt: now + windowMs };
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + windowMs;
  }
  entry.count += 1;
  rateMap.set(key, entry);
  return entry.count <= maxReq;
}

/* Nettoyage périodique de la table de rate-limiting */
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of rateMap.entries()) {
    if (now > v.resetAt) rateMap.delete(k);
  }
}, 120_000).unref();

/* ---------- HELPERS HTTP ---------- */
function send(req, res, status, body, headers = {}) {
  const isBuf = Buffer.isBuffer(body);
  const isObj = typeof body === "object" && body !== null && !isBuf;
  const raw = isObj ? Buffer.from(JSON.stringify(body), "utf8") : isBuf ? body : Buffer.from(String(body ?? ""), "utf8");
  const contentType = isObj
    ? "application/json; charset=utf-8"
    : headers["Content-Type"] || "text/plain; charset=utf-8";

  const baseHeaders = {
    "Content-Type": contentType,
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    ...headers,
  };

  /* Compression Gzip automatique pour les réponses JSON/texte > 1 Ko */
  const acceptGzip = (req.headers["accept-encoding"] || "").includes("gzip");
  if (acceptGzip && raw.length > 1024 && !baseHeaders["Content-Encoding"] && /^(application\/json|text\/)/.test(contentType)) {
    zlib.gzip(raw, (err, compressed) => {
      if (err) {
        res.writeHead(status, { ...baseHeaders, "Content-Length": raw.length });
        return res.end(raw);
      }
      res.writeHead(status, { ...baseHeaders, "Content-Encoding": "gzip", "Content-Length": compressed.length });
      res.end(compressed);
    });
    return;
  }

  res.writeHead(status, { ...baseHeaders, "Content-Length": raw.length });
  res.end(raw);
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

/* ---------- FICHIERS STATIQUES (avec garde-fous, Gzip & HTTP 206 Range) ---------- */
const BLOCKED = ["server.js", "data", "package.json", "package-lock.json", "node_modules", ".git", "rename.ps1"];
function serveStatic(req, res, urlPath) {
  const safe = path.normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[\/\\])+/, "");
  if (BLOCKED.some((b) => safe.toLowerCase().startsWith(b) || ("/" + safe).toLowerCase().includes("/" + b))) {
    return send(req, res, 404, "Not found");
  }
  let filePath = path.join(__dirname, safe === "/" ? "index.html" : safe);
  if (!filePath.startsWith(__dirname)) return send(req, res, 403, "Forbidden");
  fs.stat(filePath, (err, st) => {
    if (err) return send(req, res, 404, "Not found");
    if (st.isDirectory()) {
      filePath = path.join(filePath, "index.html");
      return fs.stat(filePath, (err2, st2) => {
        if (err2) return send(req, res, 404, "Not found");
        streamStaticFile(req, res, filePath, st2);
      });
    }
    streamStaticFile(req, res, filePath, st);
  });
}

function streamStaticFile(req, res, filePath, st) {
  const ext = path.extname(filePath).toLowerCase();
  const baseName = path.basename(filePath).toLowerCase();
  const contentType = MIME[ext] || "application/octet-stream";
  const cacheControl = (ext === ".html" || baseName === "sw.js") ? "no-cache" : "public, max-age=86400";

  /* Support HTTP 206 Partial Content (streaming fluide des MP3 et vidéos MP4 sur mobile/Safari) */
  const isMedia = ext === ".mp3" || ext === ".mp4";
  if (isMedia && req.headers.range) {
    const [startStr, endStr] = req.headers.range.replace(/bytes=/, "").split("-");
    const start = Math.max(0, parseInt(startStr, 10) || 0);
    const end = endStr ? Math.min(st.size - 1, parseInt(endStr, 10)) : st.size - 1;
    if (start >= st.size || start > end) {
      res.writeHead(416, { "Content-Range": `bytes */${st.size}` });
      return res.end();
    }
    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${st.size}`,
      "Accept-Ranges": "bytes",
      "Content-Length": end - start + 1,
      "Content-Type": contentType,
      "Cache-Control": cacheControl,
      "X-Content-Type-Options": "nosniff",
    });
    return fs.createReadStream(filePath, { start, end }).pipe(res);
  }

  /* Compression Gzip à la volée pour les ressources textuelles */
  const acceptGzip = (req.headers["accept-encoding"] || "").includes("gzip");
  if (acceptGzip && COMPRESSIBLE.has(ext) && st.size > 512) {
    res.writeHead(200, {
      "Content-Type": contentType,
      "Content-Encoding": "gzip",
      "Cache-Control": cacheControl,
      "X-Content-Type-Options": "nosniff",
    });
    return fs.createReadStream(filePath).pipe(zlib.createGzip()).pipe(res);
  }

  res.writeHead(200, {
    "Content-Type": contentType,
    "Content-Length": st.size,
    "Accept-Ranges": isMedia ? "bytes" : "none",
    "Cache-Control": cacheControl,
    "X-Content-Type-Options": "nosniff",
  });
  fs.createReadStream(filePath).pipe(res);
}

/* ---------- API : couche données ---------- */
async function generateUniqueTicketNum() {
  const existing = new Set();
  if (db) {
    const r = await db.query(`SELECT num FROM rsvps`);
    r.rows.forEach((row) => existing.add(Number(row.num)));
  } else {
    readJSON("rsvps.json", []).forEach((row) => existing.add(Number(row.num)));
  }
  for (let attempt = 0; attempt < 150; attempt++) {
    const candidate = Math.floor(100 + Math.random() * 900);
    if (!existing.has(candidate)) return candidate;
  }
  return 1000 + existing.size + 1;
}

async function addRsvp(d) {
  if (db) {
    const r = await db.query(
      `INSERT INTO rsvps (num, nom, presence, tel, people, note, statut, branche, localite, ami_nom, ami_tel, inactif_nom, inactif_tel)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING id, num, nom, presence, tel, people, note, statut, branche, localite, ami_nom, ami_tel, inactif_nom, inactif_tel, checked_in, checked_in_at, at`,
      [d.num, d.nom, d.presence, d.tel, d.people, d.note, d.statut || "membre", d.branche || "", d.localite || "",
       d.ami_nom || "", d.ami_tel || "", d.inactif_nom || "", d.inactif_tel || ""]
    );
    return r.rows[0];
  }
  const all = readJSON("rsvps.json", []);
  const entry = {
    id: (all.reduce((m, r) => Math.max(m, r.id || 0), 0) || 0) + 1,
    ...d,
    checked_in: false,
    checked_in_at: null,
    at: new Date().toISOString(),
  };
  all.push(entry);
  writeJSON("rsvps.json", all);
  return entry;
}

async function listRsvps() {
  if (db) return (await db.query(
    `SELECT id, num, nom, presence, tel, people, note, statut, branche, localite, ami_nom, ami_tel, inactif_nom, inactif_tel, checked_in, checked_in_at, at FROM rsvps ORDER BY id ASC`
  )).rows;
  return readJSON("rsvps.json", []);
}

async function setRsvpCheckin({ id, num, checked_in = true }) {
  const flag = !!checked_in;
  const ts = flag ? new Date().toISOString() : null;
  if (db) {
    const query = id
      ? `UPDATE rsvps SET checked_in = $1, checked_in_at = $2 WHERE id = $3 RETURNING id, num, nom, presence, tel, people, note, statut, branche, localite, checked_in, checked_in_at, at`
      : `UPDATE rsvps SET checked_in = $1, checked_in_at = $2 WHERE num = $3 RETURNING id, num, nom, presence, tel, people, note, statut, branche, localite, checked_in, checked_in_at, at`;
    const param = id ? parseInt(id, 10) : parseInt(num, 10);
    if (!param) return null;
    const r = await db.query(query, [flag, ts, param]);
    return r.rows[0] || null;
  }
  const all = readJSON("rsvps.json", []);
  const target = all.find((r) => (id ? String(r.id) === String(id) : String(r.num) === String(num)));
  if (!target) return null;
  target.checked_in = flag;
  target.checked_in_at = ts;
  writeJSON("rsvps.json", all);
  return target;
}

async function findTicketByNum(num) {
  const n = parseInt(num, 10);
  if (!n) return null;
  if (db) {
    const r = await db.query(
      `SELECT num, nom, presence, people, statut, branche, checked_in, at FROM rsvps WHERE num = $1 ORDER BY id DESC LIMIT 1`,
      [n]
    );
    return r.rows[0] || null;
  }
  const all = readJSON("rsvps.json", []);
  const found = all.filter((r) => Number(r.num) === n).pop();
  if (!found) return null;
  return {
    num: found.num,
    nom: found.nom,
    presence: found.presence,
    people: found.people,
    statut: found.statut || "membre",
    branche: found.branche || "",
    checked_in: !!found.checked_in,
    at: found.at,
  };
}

async function listGuestbook() {
  if (db) {
    /* les 80 derniers messages, du plus ancien au plus récent */
    const r = await db.query(
      `SELECT id, nom, msg, at FROM (SELECT id, nom, msg, at FROM guestbook ORDER BY id DESC LIMIT 80) t ORDER BY id ASC`
    );
    return r.rows;
  }
  return readJSON("guestbook.json", []).slice(-80);
}

async function addGuestbook(entry) {
  if (db) {
    const r = await db.query(
      `INSERT INTO guestbook (nom, msg) VALUES ($1,$2) RETURNING id, nom, msg, at`,
      [entry.nom, entry.msg]
    );
    return r.rows[0];
  }
  const all = readJSON("guestbook.json", []);
  all.push(entry);
  writeJSON("guestbook.json", all);
  return entry;
}

/* ---------- Constellation d'Aboisso (Bougies allumées — Défi Éclairer le Monde) ---------- */
const BASE_LIGHTS_COUNT = 25; // 25 lumières initiales symbolisant les 25 jours de décembre
async function getLightsSummary() {
  if (db) {
    const [c, recent] = await Promise.all([
      db.query(`SELECT COUNT(*)::int AS n FROM lights`),
      db.query(`SELECT id, nom, inspiration, at FROM lights ORDER BY id DESC LIMIT 12`),
    ]);
    return { count: BASE_LIGHTS_COUNT + (c.rows[0]?.n || 0), recent: recent.rows };
  }
  const all = readJSON("lights.json", []);
  return { count: BASE_LIGHTS_COUNT + all.length, recent: all.slice(-12).reverse() };
}

async function addLight({ nom, inspiration }) {
  if (db) {
    await db.query(`INSERT INTO lights (nom, inspiration) VALUES ($1, $2)`, [nom, inspiration]);
    return getLightsSummary();
  }
  const all = readJSON("lights.json", []);
  all.push({ id: Date.now(), nom, inspiration, at: new Date().toISOString() });
  writeJSON("lights.json", all);
  return getLightsSummary();
}

/* Liste légère des métadonnées du Mur Photo (sans renvoyer les Mo de Base64 à chaque poll) */
async function listWallMeta() {
  if (db) {
    const r = await db.query(`SELECT id, nom, msg, at FROM photo_wall ORDER BY id ASC`);
    return r.rows.map((row) => ({
      id: row.id,
      nom: row.nom,
      msg: row.msg,
      photo: `/api/photo-wall/img?id=${encodeURIComponent(row.id)}`,
      at: row.at,
    }));
  }
  return readJSON("photo-wall.json", []).map((row) => ({
    id: row.id,
    nom: row.nom,
    msg: row.msg,
    photo: row.id ? `/api/photo-wall/img?id=${encodeURIComponent(row.id)}` : row.photo,
    at: row.at,
  }));
}

async function getWallPhotoData(id) {
  if (!id) return null;
  if (db) {
    const r = await db.query(`SELECT photo FROM photo_wall WHERE id = $1 LIMIT 1`, [id]);
    return r.rows[0] ? r.rows[0].photo : null;
  }
  const found = readJSON("photo-wall.json", []).find((r) => String(r.id) === String(id));
  return found ? found.photo : null;
}

/* ---------- Invitations (amis & membres inactifs proposés par les membres) ---------- */
function normTel(t) { return String(t || "").replace(/\D/g, ""); }
function normName(n) {
  return String(n || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
}

async function listInvitesRaw() {
  if (db) return (await db.query(
    `SELECT i.id, i.rsvp_id, i.type, i.nom, i.tel, i.at, r.nom AS par
     FROM invites i LEFT JOIN rsvps r ON r.id = i.rsvp_id ORDER BY i.id ASC`
  )).rows;
  const invites = readJSON("invites.json", []);
  const rsvps = readJSON("rsvps.json", []);
  return invites.map((i) => ({ ...i, par: (rsvps.find((r) => r.id === i.rsvp_id) || {}).nom || "" }));
}

/* Un invité est un doublon si son téléphone OU son nom correspond déjà
   (inscriptions comme invitations précédentes) */
async function findInviteDup(nom, tel) {
  const nk = normName(nom), tk = normTel(tel);
  if (!nk && !tk) return null;
  const invites = db ? (await db.query(`SELECT nom, tel, at FROM invites`)).rows : readJSON("invites.json", []);
  const rsvps = db ? (await db.query(`SELECT nom, tel, at FROM rsvps`)).rows : readJSON("rsvps.json", []);
  const scan = (list, label) => {
    for (const r of list) {
      const sameTel = tk && normTel(r.tel) === tk;
      const sameNom = nk && normName(r.nom) === nk;
      if (sameTel || (sameNom && (!tk || !normTel(r.tel)))) {
        return { src: label };
      }
    }
    return null;
  };
  return scan(invites, "invitations") || scan(rsvps, "inscriptions");
}

async function addInvites(rsvpId, list) {
  const saved = [], skipped = [];
  for (const inv of Array.isArray(list) ? list.slice(0, 40) : []) {
    const nom = clean(inv.nom, 80);
    const tel = clean(inv.tel, 30);
    if (!nom && !tel) continue;
    if (!nom) continue; /* sans nom on ne peut pas personnaliser l'invitation */
    const dup = await findInviteDup(nom, tel);
    if (dup) { skipped.push(nom); continue; }
    const type = inv.type === "inactif" ? "inactif" : "ami";
    if (db) {
      await db.query(`INSERT INTO invites (rsvp_id, type, nom, tel) VALUES ($1,$2,$3,$4)`,
        [rsvpId || null, type, nom, tel]);
    } else {
      const all = readJSON("invites.json", []);
      all.push({ id: Date.now() + saved.length, rsvp_id: rsvpId || null, type, nom, tel, at: new Date().toISOString() });
      writeJSON("invites.json", all);
    }
    saved.push({ type, nom, tel });
  }
  return { saved, skipped };
}

async function addWall(entry) {
  if (db) {
    const r = await db.query(
      `INSERT INTO photo_wall (nom, msg, photo) VALUES ($1,$2,$3) RETURNING id, nom, msg, at`,
      [entry.nom, entry.msg, entry.photo]
    );
    const row = r.rows[0];
    return {
      id: row.id,
      nom: row.nom,
      msg: row.msg,
      photo: `/api/photo-wall/img?id=${encodeURIComponent(row.id)}`,
      at: row.at,
    };
  }
  const all = readJSON("photo-wall.json", []);
  if (all.length >= 300) all.shift();
  all.push(entry);
  writeJSON("photo-wall.json", all);
  return {
    id: entry.id,
    nom: entry.nom,
    msg: entry.msg,
    photo: `/api/photo-wall/img?id=${encodeURIComponent(entry.id)}`,
    at: entry.at,
  };
}

async function deleteRow(table, id) {
  if (db) {
    const allowed = { rsvp: "rsvps", guestbook: "guestbook", "photo-wall": "photo_wall", invite: "invites" };
    const t = allowed[table];
    if (!t) return;
    if (t === "rsvps") {
      await db.query(`DELETE FROM invites WHERE rsvp_id = $1`, [id]);
    }
    await db.query(`DELETE FROM ${t} WHERE id = $1`, [id]);
    return;
  }
  const files = { rsvp: "rsvps.json", guestbook: "guestbook.json", "photo-wall": "photo-wall.json", invite: "invites.json" };
  const file = files[table];
  if (!file) return;
  const numId = parseInt(id, 10);
  if (table === "rsvp") {
    writeJSON("invites.json", readJSON("invites.json", []).filter((i) => i.rsvp_id !== numId));
  }
  writeJSON(file, readJSON(file, []).filter((r) => r.id !== numId));
}

/* Échappement CSV sécurisé contre l'injection de formules Excel (=, +, -, @, TAB, CR) */
function escCSV(v) {
  let s = String(v ?? "").replace(/"/g, '""');
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return `"${s}"`;
}

/* ---------- API ---------- */
async function handleAPI(req, res, url) {
  const { pathname, searchParams } = url;

  /* --- Connexion admin (avec protection anti-bruteforce) --- */
  if (pathname === "/api/login" && req.method === "POST") {
    if (!checkRateLimit(req, "login", 10, 60_000)) {
      return send(req, res, 429, { ok: false, error: "Trop de tentatives. Réessayez dans une minute." });
    }
    const body = await readBody(req);
    if (verifyPassword(clean(body.password), CONFIG.adminPassword)) {
      const token = crypto.randomBytes(24).toString("hex");
      tokens.add(token);
      return send(req, res, 200, { ok: true, token });
    }
    return send(req, res, 401, { ok: false, error: "Mot de passe incorrect" });
  }

  /* --- Consultation publique d'un billet par numéro (pour le scan du QR Code sur tout appareil) --- */
  if (pathname === "/api/ticket" && req.method === "GET") {
    const entry = await findTicketByNum(searchParams.get("num"));
    if (!entry) return send(req, res, 404, { ok: false, error: "Billet introuvable" });
    return send(req, res, 200, { ok: true, entry });
  }

  /* --- Constellation d'Aboisso : Bougies allumées (public : lire / allumer) --- */
  if (pathname === "/api/lights" && req.method === "GET") {
    const summary = await getLightsSummary();
    return send(req, res, 200, { ok: true, ...summary });
  }
  if (pathname === "/api/lights" && req.method === "POST") {
    if (!checkRateLimit(req, "lights", 15, 60_000)) {
      return send(req, res, 429, { ok: false, error: "Patientez un instant avant de rallumer une bougie." });
    }
    const body = await readBody(req);
    const nom = clean(body.nom, 50) || "Une âme bienveillante";
    const inspiration = clean(body.inspiration, 160);
    const summary = await addLight({ nom, inspiration });
    return send(req, res, 200, { ok: true, ...summary });
  }

  /* --- RSVP (public : envoi) --- */
  if (pathname === "/api/rsvp" && req.method === "POST") {
    if (!checkRateLimit(req, "rsvp", 20, 60_000)) {
      return send(req, res, 429, { ok: false, error: "Trop de requêtes. Veuillez patienter un instant." });
    }
    const body = await readBody(req);
    const nom = clean(body.nom, 80);
    if (!nom) return send(req, res, 400, { ok: false, error: "Nom requis" });
    const num = await generateUniqueTicketNum();
    const entry = await addRsvp({
      num,
      nom,
      presence: body.presence === "absent" ? "absent" : "present",
      statut: body.statut === "ami" ? "ami" : "membre",
      tel: clean(body.tel, 30),
      people: Math.min(Math.max(parseInt(body.people, 10) || 1, 1), 30),
      branche: clean(body.branche, 80),
      localite: clean(body.localite, 80),
      ami_nom: clean(body.ami_nom, 80),
      ami_tel: clean(body.ami_tel, 30),
      inactif_nom: clean(body.inactif_nom, 80),
      inactif_tel: clean(body.inactif_tel, 30),
      note: clean(body.note, 150),
    });
    /* Invitations dynamiques : doublons filtrés (nom / téléphone déjà connus) */
    const { saved, skipped } = await addInvites(entry.id, body.invites);
    return send(req, res, 200, { ok: true, entry, saved, skipped });
  }

  /* --- Invitations : vérifier si une personne a déjà été invitée (public, sans fuite de date) --- */
  if (pathname === "/api/invites/check" && req.method === "POST") {
    if (!checkRateLimit(req, "invites-check", 45, 60_000)) {
      return send(req, res, 429, { ok: false, error: "Trop de vérifications." });
    }
    const body = await readBody(req);
    const nom = clean(body.nom, 80);
    const tel = clean(body.tel, 30);
    if (!nom) return send(req, res, 400, { ok: false, error: "Nom requis" });
    const dup = await findInviteDup(nom, tel);
    const info = dup
      ? (dup.src === "inscriptions" ? "déjà inscrit·e" : "déjà dans les invitations")
      : "";
    return send(req, res, 200, { ok: true, dup: !!dup, info });
  }

  /* --- Livre d'or (public : lire / écrire) --- */
  if (pathname === "/api/guestbook" && req.method === "GET") {
    return send(req, res, 200, await listGuestbook());
  }
  if (pathname === "/api/guestbook" && req.method === "POST") {
    if (!checkRateLimit(req, "guestbook", 12, 60_000)) {
      return send(req, res, 429, { ok: false, error: "Veuillez patienter avant d'envoyer un autre message." });
    }
    const body = await readBody(req);
    const nom = clean(body.nom, 60);
    const msg = clean(body.msg, 250);
    if (!nom || !msg) return send(req, res, 400, { ok: false, error: "Nom et message requis" });
    const entry = await addGuestbook({ id: Date.now(), nom, msg, at: new Date().toISOString() });
    return send(req, res, 200, { ok: true, entry });
  }

  /* --- Mur photo « Je serai là ! » (public : lire métadonnées / servir image binaire / ajouter) --- */
  if (pathname === "/api/photo-wall" && req.method === "GET") {
    return send(req, res, 200, await listWallMeta());
  }
  if (pathname === "/api/photo-wall/img" && req.method === "GET") {
    const id = searchParams.get("id");
    const dataUrl = await getWallPhotoData(id);
    if (!dataUrl || !dataUrl.startsWith("data:image/")) {
      return send(req, res, 404, "Image introuvable");
    }
    const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
    if (!match) return send(req, res, 404, "Format d'image invalide");
    const mime = match[1];
    const buf = Buffer.from(match[2], "base64");
    const etag = `"pw-${id}-${buf.length}"`;
    if (req.headers["if-none-match"] === etag) {
      res.writeHead(304);
      return res.end();
    }
    res.writeHead(200, {
      "Content-Type": mime,
      "Content-Length": buf.length,
      "Cache-Control": "public, max-age=31536000, immutable",
      "ETag": etag,
      "X-Content-Type-Options": "nosniff",
    });
    return res.end(buf);
  }
  if (pathname === "/api/photo-wall" && req.method === "POST") {
    if (!checkRateLimit(req, "photo-wall", 10, 60_000)) {
      return send(req, res, 429, { ok: false, error: "Trop d'envois de photos. Réessayez dans une minute." });
    }
    const body = await readBody(req, 5e5); // ~500 Ko max (photo base64)
    const nom = clean(body.nom, 40);
    const msg = clean(body.msg, 80);
    const photo = typeof body.photo === "string" ? body.photo : "";
    if (!nom) return send(req, res, 400, { ok: false, error: "Nom requis" });
    if (!photo.startsWith("data:image/")) return send(req, res, 400, { ok: false, error: "Photo requise" });
    if (photo.length > 45e4) return send(req, res, 413, { ok: false, error: "Photo trop lourde — choisissez-en une plus petite" });
    const entry = await addWall({ id: Date.now(), nom, msg, photo, at: new Date().toISOString() });
    return send(req, res, 200, { ok: true, entry });
  }

  /* --- Back office (protégé) --- */
  if (pathname.startsWith("/api/admin/")) {
    if (!isAuth(req, searchParams)) return send(req, res, 401, { ok: false, error: "Non autorisé" });

    if (pathname === "/api/admin/summary" && req.method === "GET") {
      const [rsvps, guestbook, wall, invites] = await Promise.all([
        listRsvps(),
        listGuestbook(),
        listWallMeta(),
        listInvitesRaw(),
      ]);
      const checkedInList = rsvps.filter((r) => r.checked_in);
      const stats = {
        total: rsvps.length,
        presents: rsvps.filter((r) => r.presence === "present").length,
        absents: rsvps.filter((r) => r.presence === "absent").length,
        people: rsvps.filter((r) => r.presence === "present").reduce((s, r) => s + (r.people || 1), 0),
        checkedInRsvps: checkedInList.length,
        checkedInPeople: checkedInList.reduce((s, r) => s + (r.people || 1), 0),
        messages: guestbook.length,
        invites: invites.length,
      };
      return send(req, res, 200, { ok: true, rsvps, guestbook, wall, invites, stats });
    }

    /* Pointage Jour J (Check-in par ID ou par N° de billet scanné au QR code) */
    if (pathname === "/api/admin/checkin" && req.method === "POST") {
      const body = await readBody(req);
      const updated = await setRsvpCheckin({
        id: body.id,
        num: body.num,
        checked_in: body.checked_in !== undefined ? !!body.checked_in : true,
      });
      if (!updated) {
        return send(req, res, 404, { ok: false, error: "Aucun billet correspondant trouvé" });
      }
      return send(req, res, 200, { ok: true, entry: updated });
    }

    if (pathname === "/api/admin/export.csv" && req.method === "GET") {
      const [rsvps, invites] = await Promise.all([listRsvps(), listInvitesRaw()]);
      const invitesByRsvp = new Map();
      for (const inv of invites) {
        if (!inv.rsvp_id) continue;
        if (!invitesByRsvp.has(inv.rsvp_id)) invitesByRsvp.set(inv.rsvp_id, []);
        invitesByRsvp.get(inv.rsvp_id).push(inv);
      }
      const lines = [
        [
          "N° billet", "Nom", "Statut", "Présence", "Pointage Jour J", "Personnes", "Téléphone", "Branche", "Localité",
          "Personnes invitées (toutes)", "Ami invité (1er)", "Contact ami", "Membre inactif invité (1er)", "Contact membre", "Note", "Date",
        ].join(";"),
        ...rsvps.map((r) => {
          const linked = invitesByRsvp.get(r.id) || [];
          const allInvText = linked.length
            ? linked.map((i) => `${i.type === "inactif" ? "[Inactif]" : "[Ami]"} ${i.nom}${i.tel ? ` (${i.tel})` : ""}`).join(" | ")
            : [
                r.ami_nom ? `[Ami] ${r.ami_nom}${r.ami_tel ? ` (${r.ami_tel})` : ""}` : "",
                r.inactif_nom ? `[Inactif] ${r.inactif_nom}${r.inactif_tel ? ` (${r.inactif_tel})` : ""}` : "",
              ].filter(Boolean).join(" | ");
          return [
            r.num,
            escCSV(r.nom),
            escCSV(r.statut === "ami" ? "Ami·e / visiteur·se" : "Membre"),
            r.presence === "present" ? "Présent(e)" : "Absent(e)",
            r.checked_in ? "Arrivé(e)" : "En attente",
            r.people,
            escCSV(r.tel),
            escCSV(r.branche || ""),
            escCSV(r.localite || ""),
            escCSV(allInvText),
            escCSV(r.ami_nom || ""),
            escCSV(r.ami_tel || ""),
            escCSV(r.inactif_nom || ""),
            escCSV(r.inactif_tel || ""),
            escCSV(r.note),
            escCSV(new Date(r.at).toLocaleString("fr-FR")),
          ].join(";");
        }),
      ];
      return send(req, res, 200, "\uFEFF" + lines.join("\r\n"), {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=inscriptions-noel-aboisso.csv",
      });
    }

    if (pathname === "/api/admin/rsvp" && req.method === "DELETE") {
      await deleteRow("rsvp", searchParams.get("id"));
      return send(req, res, 200, { ok: true });
    }

    if (pathname === "/api/admin/guestbook" && req.method === "DELETE") {
      await deleteRow("guestbook", searchParams.get("id"));
      return send(req, res, 200, { ok: true });
    }

    if (pathname === "/api/admin/photo-wall" && req.method === "DELETE") {
      await deleteRow("photo-wall", searchParams.get("id"));
      return send(req, res, 200, { ok: true });
    }

    if (pathname === "/api/admin/invite" && req.method === "DELETE") {
      await deleteRow("invite", searchParams.get("id"));
      return send(req, res, 200, { ok: true });
    }
    return send(req, res, 404, { ok: false, error: "Route inconnue" });
  }

  return send(req, res, 404, { ok: false, error: "Route inconnue" });
}

/* ---------- SERVEUR ---------- */
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  try {
    if (url.pathname.startsWith("/api/")) return await handleAPI(req, res, url);
    return serveStatic(req, res, url.pathname);
  } catch (e) {
    console.error(e);
    return send(req, res, 500, { ok: false, error: "Erreur serveur" });
  }
});

initDB()
  .then(() => {
    server.listen(CONFIG.port, () => {
      console.log(`✦ Site        : http://localhost:${CONFIG.port}`);
      console.log(`✦ Back office : http://localhost:${CONFIG.port}/admin.html`);
      console.log(db
        ? "✦ Stockage    : PostgreSQL (Neon) ✨"
        : `✦ Stockage    : fichiers JSON locaux (data/) — définissez DATABASE_URL pour Neon`);
      console.log(`✦ Mot de passe admin : ${CONFIG.adminPassword === "noel2026" ? "noel2026 (PENSEZ À LE CHANGER)" : "(personnalisé)"}`);
    });
  })
  .catch((e) => {
    console.error("⚠️  Impossible d'initialiser la base :", e.message);
    server.listen(CONFIG.port, () => console.log(`✦ Démarré en mode dégradé : http://localhost:${CONFIG.port}`));
  });
