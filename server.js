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
    );`);

  /* Colonnes RSVP ajoutées avec le formulaire enrichi (statut, branche,
     localité, invités : ami + membre inactif) — sans casser l'existant */
  for (const col of ["statut", "branche", "localite", "ami_nom", "ami_tel", "inactif_nom", "inactif_tel"]) {
    await db.query(`ALTER TABLE rsvps ADD COLUMN IF NOT EXISTS ${col} TEXT DEFAULT ''`);
  }

  /* Import automatique des données locales si les tables sont vides */
  const local = {
    rsvps: readJSON("rsvps.json", []),
    guestbook: readJSON("guestbook.json", []),
    "photo-wall": readJSON("photo-wall.json", []),
  };
  for (const [table, rows] of Object.entries(local)) {
    if (!rows.length) continue;
    const c = await db.query(`SELECT COUNT(*)::int AS n FROM ${table}`);
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
    console.log(`✦ Import local → Neon : ${rows.length} ligne(s) dans ${table}`);
  }
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
const BLOCKED = ["server.js", "data", "package.json", "node_modules", ".git", "rename.ps1"];
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

/* ---------- API : couche données ---------- */
async function addRsvp(d) {
  if (db) {
    const r = await db.query(
      `INSERT INTO rsvps (num, nom, presence, tel, people, note, statut, branche, localite, ami_nom, ami_tel, inactif_nom, inactif_tel)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING id, num, nom, presence, tel, people, note, statut, branche, localite, ami_nom, ami_tel, inactif_nom, inactif_tel, at`,
      [d.num, d.nom, d.presence, d.tel, d.people, d.note, d.statut || "membre", d.branche || "", d.localite || "",
       d.ami_nom || "", d.ami_tel || "", d.inactif_nom || "", d.inactif_tel || ""]
    );
    return r.rows[0];
  }
  const all = readJSON("rsvps.json", []);
  const entry = {
    id: (all.reduce((m, r) => Math.max(m, r.id || 0), 0) || 0) + 1,
    ...d,
    at: new Date().toISOString(),
  };
  all.push(entry);
  writeJSON("rsvps.json", all);
  return entry;
}

async function listRsvps() {
  if (db) return (await db.query(
    `SELECT id, num, nom, presence, tel, people, note, statut, branche, localite, ami_nom, ami_tel, inactif_nom, inactif_tel, at FROM rsvps ORDER BY id ASC`
  )).rows;
  return readJSON("rsvps.json", []);
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

async function listWall() {
  if (db) return (await db.query(`SELECT id, nom, msg, photo, at FROM photo_wall ORDER BY id ASC`)).rows;
  return readJSON("photo-wall.json", []);
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
        return { src: label, nom: r.nom, at: r.at };
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
      `INSERT INTO photo_wall (nom, msg, photo) VALUES ($1,$2,$3) RETURNING id, nom, msg, photo, at`,
      [entry.nom, entry.msg, entry.photo]
    );
    return r.rows[0];
  }
  const all = readJSON("photo-wall.json", []);
  if (all.length >= 300) all.shift();
  all.push(entry);
  writeJSON("photo-wall.json", all);
  return entry;
}

async function deleteRow(table, id) {
  if (db) {
    const allowed = { rsvp: "rsvps", guestbook: "guestbook", "photo-wall": "photo_wall", invite: "invites" };
    const t = allowed[table];
    if (!t) return;
    await db.query(`DELETE FROM ${t} WHERE id = $1`, [id]);
    return;
  }
  const files = { rsvp: "rsvps.json", guestbook: "guestbook.json", "photo-wall": "photo-wall.json", invite: "invites.json" };
  const file = files[table];
  if (!file) return;
  writeJSON(file, readJSON(file, []).filter((r) => r.id !== parseInt(id)));
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
    const entry = await addRsvp({
      num: Math.floor(100 + Math.random() * 900),
      nom,
      presence: body.presence === "absent" ? "absent" : "present",
      statut: body.statut === "ami" ? "ami" : "membre",
      tel: clean(body.tel, 30),
      people: Math.min(Math.max(parseInt(body.people) || 1, 1), 30),
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
    return send(res, 200, { ok: true, entry, saved, skipped });
  }

  /* --- Invitations : vérifier si une personne a déjà été invitée (public) --- */
  if (pathname === "/api/invites/check" && req.method === "POST") {
    const body = await readBody(req);
    const nom = clean(body.nom, 80);
    const tel = clean(body.tel, 30);
    if (!nom) return send(res, 400, { ok: false, error: "Nom requis" });
    const dup = await findInviteDup(nom, tel);
    const info = dup
      ? (dup.src === "inscriptions" ? "déjà inscrit·e" : "déjà dans les invitations") +
        (dup.at ? " le " + new Date(dup.at).toLocaleDateString("fr-FR") : "")
      : "";
    return send(res, 200, { ok: true, dup: !!dup, info });
  }

  /* --- Livre d'or (public : lire / écrire) --- */
  if (pathname === "/api/guestbook" && req.method === "GET") {
    return send(res, 200, await listGuestbook());
  }
  if (pathname === "/api/guestbook" && req.method === "POST") {
    const body = await readBody(req);
    const nom = clean(body.nom, 60);
    const msg = clean(body.msg, 250);
    if (!nom || !msg) return send(res, 400, { ok: false, error: "Nom et message requis" });
    const entry = await addGuestbook({ id: Date.now(), nom, msg, at: new Date().toISOString() });
    return send(res, 200, { ok: true, entry });
  }

  /* --- Mur photo « Je serai là ! » (public : lire / ajouter) --- */
  if (pathname === "/api/photo-wall" && req.method === "GET") {
    return send(res, 200, await listWall());
  }
  if (pathname === "/api/photo-wall" && req.method === "POST") {
    const body = await readBody(req, 5e5); // ~500 Ko max (photo base64)
    const nom = clean(body.nom, 40);
    const msg = clean(body.msg, 80);
    const photo = typeof body.photo === "string" ? body.photo : "";
    if (!nom) return send(res, 400, { ok: false, error: "Nom requis" });
    if (!photo.startsWith("data:image/")) return send(res, 400, { ok: false, error: "Photo requise" });
    if (photo.length > 45e4) return send(res, 413, { ok: false, error: "Photo trop lourde — choisissez-en une plus petite" });
    const entry = await addWall({ id: Date.now(), nom, msg, photo, at: new Date().toISOString() });
    return send(res, 200, { ok: true, entry });
  }

  /* --- Back office (protégé) --- */
  if (pathname.startsWith("/api/admin/")) {
    if (!isAuth(req)) return send(res, 401, { ok: false, error: "Non autorisé" });

    if (pathname === "/api/admin/summary" && req.method === "GET") {
      const [rsvps, guestbook, wall, invites] = await Promise.all([listRsvps(), listGuestbook(), listWall(), listInvitesRaw()]);
      const stats = {
        total: rsvps.length,
        presents: rsvps.filter((r) => r.presence === "present").length,
        absents: rsvps.filter((r) => r.presence === "absent").length,
        people: rsvps.filter((r) => r.presence === "present").reduce((s, r) => s + (r.people || 1), 0),
        messages: guestbook.length,
        invites: invites.length,
      };
      return send(res, 200, { ok: true, rsvps, guestbook, wall, invites, stats });
    }

    if (pathname === "/api/admin/export.csv" && req.method === "GET") {
      const rsvps = await listRsvps();
      const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      const lines = [
        ["N° billet", "Nom", "Statut", "Présence", "Personnes", "Téléphone", "Branche", "Localité",
         "Ami invité", "Contact ami", "Membre inactif invité", "Contact membre", "Note", "Date"].join(";"),
        ...rsvps.map((r) => [
          r.num, esc(r.nom), esc(r.statut === "ami" ? "Ami·e / visiteur·se" : "Membre"),
          r.presence === "present" ? "Présent(e)" : "Absent(e)",
          r.people, esc(r.tel), esc(r.branche || ""), esc(r.localite || ""),
          esc(r.ami_nom || ""), esc(r.ami_tel || ""), esc(r.inactif_nom || ""), esc(r.inactif_tel || ""),
          esc(r.note), esc(new Date(r.at).toLocaleString("fr-FR")),
        ].join(";")),
      ];
      return send(res, 200, "\uFEFF" + lines.join("\r\n"), {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": "attachment; filename=inscriptions-noel-aboisso.csv",
      });
    }

    if (pathname === "/api/admin/rsvp" && req.method === "DELETE") {
      await deleteRow("rsvp", searchParams.get("id"));
      return send(res, 200, { ok: true });
    }

    if (pathname === "/api/admin/guestbook" && req.method === "DELETE") {
      await deleteRow("guestbook", searchParams.get("id"));
      return send(res, 200, { ok: true });
    }

    if (pathname === "/api/admin/photo-wall" && req.method === "DELETE") {
      await deleteRow("photo-wall", searchParams.get("id"));
      return send(res, 200, { ok: true });
    }

    if (pathname === "/api/admin/invite" && req.method === "DELETE") {
      await deleteRow("invite", searchParams.get("id"));
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
    console.error(e);
    return send(res, 500, { ok: false, error: "Erreur serveur" });
  }
});

initDB()
  .then(() => {
    ensureNothing();
    server.listen(CONFIG.port, () => {
      console.log(`✦ Site    : http://localhost:${CONFIG.port}`);
      console.log(`✦ Back office : http://localhost:${CONFIG.port}/admin.html`);
      console.log(db
        ? "✦ Stockage : PostgreSQL (Neon) ✨"
        : `✦ Stockage : fichiers JSON locaux (data/) — définissez DATABASE_URL pour Neon`);
      console.log(`✦ Mot de passe admin : ${CONFIG.adminPassword === "noel2026" ? "noel2026 (PENSEZ À LE CHANGER)" : "(personnalisé)"}`);
    });
  })
  .catch((e) => {
    console.error("⚠️  Impossible d'initialiser la base :", e.message);
    server.listen(CONFIG.port, () => console.log(`✦ Démarré en mode dégradé : http://localhost:${CONFIG.port}`));
  });

function ensureNothing() { /* réservé pour extensions futures */ }
