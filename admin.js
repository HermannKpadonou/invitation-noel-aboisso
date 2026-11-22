/* =========================================================
   Back office — logique du tableau de bord & Pointage Jour J
   ========================================================= */
const ELW = window.ELW || {};
const $ = ELW.$ || ((sel, root = document) => root.querySelector(sel));
const normalizePhone = ELW.normalizePhone || function (t) {
  const p = String(t || "").replace(/\D/g, "");
  if (!p) return "";
  if (p.startsWith("225")) return p;
  if (p.startsWith("0")) return "225" + p;
  if (p.length === 8) return "225" + p;
  return p;
};
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
const normKey = ELW.normKey || ((s) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, ""));
const playChime = ELW.playChime || (() => {});

/* ---------- Petites icônes (style Lucide) ---------- */
const ICON = {
  dots: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>`,
  wa: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.6 8.6 0 0 1-3.8-.9L3 21l2-4.9a8.4 8.4 0 1 1 16-4.6Z"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>`,
  users: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>`,
};

/* ---------- Authentification ---------- */
const TOKEN_KEY = "noel-admin-token";
let token = sessionStorage.getItem(TOKEN_KEY) || null;

async function api(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && token) { logout(); throw new Error("Session expirée"); }
  if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
  return data;
}

function showDash() {
  $("#login-screen").classList.add("hidden");
  $("#dash").classList.remove("hidden");
  refresh();
}
function logout() {
  token = null;
  sessionStorage.removeItem(TOKEN_KEY);
  stopQrScanner();
  closeGuestDrawer();
  $("#dash").classList.add("hidden");
  $("#login-screen").classList.remove("hidden");
}

$("#login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const pass = $("#l-pass").value;
  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pass }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      $("#l-error").textContent = data.error || "Mot de passe incorrect 🙏";
      throw new Error();
    }
    token = data.token;
    sessionStorage.setItem(TOKEN_KEY, token);
    $("#l-error").classList.add("hidden");
    $("#l-pass").value = "";
    showDash();
  } catch {
    $("#l-error").classList.remove("hidden");
  }
});
$("#btn-logout").addEventListener("click", logout);

if (token) {
  /* Session déjà active : on vérifie qu'elle est encore valide */
  api("/api/admin/summary").then(showDash).catch(() => logout());
}

/* ---------- Téléchargement CSV authentifié (corrige le 401 sur les liens <a download>) ---------- */
document.querySelectorAll('a[href="/api/admin/export.csv"]').forEach((link) => {
  link.addEventListener("click", async (e) => {
    e.preventDefault();
    if (!token) return toast("⚠️ Session expirée — veuillez vous reconnecter.");
    try {
      const res = await fetch("/api/admin/export.csv", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) { logout(); return; }
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `inscriptions-noel-aboisso-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast("⬇️ Export CSV téléchargé avec succès !");
    } catch {
      toast("😕 Impossible de télécharger le fichier CSV.");
    }
  });
});

/* ---------- État + rendu ---------- */
let STATE = { rsvps: [], guestbook: [], wall: [], invites: [], stats: {} };
let currentTab = "rsvps";
let autoTimer = null;
let currentDrawerId = null;

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

/* Récupère toutes les personnes invitées par un inscrit (table invites + colonnes ami_nom/inactif_nom) */
function getGuestsForRsvp(r) {
  const seen = new Set();
  const list = [];
  const pushUnique = (type, nom, tel) => {
    if (!nom) return;
    const key = `${normKey(nom)}|${normalizePhone(tel)}`;
    if (seen.has(key)) return;
    seen.add(key);
    list.push({
      type: type === "inactif" ? "inactif" : "ami",
      icon: type === "inactif" ? "⛪" : "🤝",
      nom,
      tel: tel || "",
    });
  };
  for (const inv of STATE.invites || []) {
    if (String(inv.rsvp_id) === String(r.id)) {
      pushUnique(inv.type, inv.nom, inv.tel);
    }
  }
  if (r.ami_nom) pushUnique("ami", r.ami_nom, r.ami_tel);
  if (r.inactif_nom) pushUnique("inactif", r.inactif_nom, r.inactif_tel);
  return list;
}

/* ---------- Action de pointage Jour J (Check-in) ---------- */
async function toggleCheckin({ id = null, num = null, checked_in = true, showBanner = false }) {
  try {
    const res = await api("/api/admin/checkin", {
      method: "POST",
      body: JSON.stringify({ id, num, checked_in }),
    });
    const entry = res.entry;
    if (checked_in) playChime("checkin");
    await refresh(true);
    if (showBanner && $("#checkin-result")) {
      const box = $("#checkin-result");
      box.classList.remove("hidden", "err");
      box.innerHTML = `
        <strong>✅ Bienvenue à ${escapeHTML(entry.nom)} (Billet N°${entry.num}) !</strong>
        <span>${entry.people} personne${entry.people > 1 ? "s" : ""} · ${escapeHTML(entry.branche || (entry.statut === "ami" ? "Ami·e / visiteur·se" : "Membre"))}</span>
      `;
    }
    toast(checked_in ? `✅ Arrivée pointée : ${entry.nom} (N°${entry.num})` : `↩️ Pointage annulé pour ${entry.nom}`);
    return entry;
  } catch (err) {
    if (showBanner && $("#checkin-result")) {
      const box = $("#checkin-result");
      box.classList.remove("hidden");
      box.classList.add("err");
      box.innerHTML = `<strong>⚠️ Billet introuvable</strong><span>Aucun inscrit ne correspond à ce numéro de billet.</span>`;
    }
    toast(`⚠️ ${err.message || "Billet introuvable"}`);
    return null;
  }
}

/* ---------- Tiroir latéral (Drawer) pour afficher tous les détails d'un inscrit ---------- */
function openGuestDrawer(rsvpId) {
  const r = (STATE.rsvps || []).find((x) => String(x.id) === String(rsvpId));
  if (!r) {
    closeGuestDrawer();
    return;
  }
  currentDrawerId = String(r.id);
  const guests = getGuestsForRsvp(r);
  const tel = r.tel ? normalizePhone(r.tel) : "";
  const wa = tel ? `https://wa.me/${tel}` : "";
  const lieu = [r.branche, r.localite].filter(Boolean).join(" · ");

  $("#dr-num").textContent = `Billet N°${r.num}`;
  $("#dr-name").textContent = r.nom;

  $("#dr-body").innerHTML = `
    <div class="rsvp-card-pills">
      <span class="pill ${r.statut === "ami" ? "ami" : "membre"}">${r.statut === "ami" ? "Ami·e / visiteur·se" : "Membre"}</span>
      <span class="pill ${r.presence === "present" ? "present" : "absent"}">${r.presence === "present" ? "Présent·e" : "Absent·e"}</span>
      <span class="pill inactif">${r.people} personne${r.people > 1 ? "s" : ""}</span>
      ${r.checked_in ? `<span class="pill checkedin">✅ Arrivé·e (${fmtDate(r.checked_in_at)})</span>` : ""}
    </div>
    <div class="d-item">
      <small>Pointage Jour J (Accueil Mairie d'Aboisso)</small>
      <div style="display:flex;align-items:center;justify-content:space-between;gap:.6rem;margin-top:.2rem">
        <p>${r.checked_in ? "✅ Présence confirmée en salle" : "⏳ En attente d'arrivée"}</p>
        <button class="btn ${r.checked_in ? "btn-outline" : "btn-red"} btn-sm" type="button" data-checkin-id="${r.id}" data-checkin-val="${r.checked_in ? "0" : "1"}">
          ${r.checked_in ? "↩️ Annuler" : "✅ Pointer l'arrivée"}
        </button>
      </div>
    </div>
    <div class="d-item">
      <small>Téléphone / WhatsApp</small>
      <p>${r.tel ? `<a href="tel:${tel}">${escapeHTML(r.tel)}</a>` : "Non renseigné"}</p>
    </div>
    <div class="d-item">
      <small>Branche &amp; Localité</small>
      <p>${lieu ? escapeHTML(lieu) : "Non renseigné"}</p>
    </div>
    <div class="d-item">
      <small>Personnes invitées par ${escapeHTML(r.nom.split(" ")[0])} (${guests.length})</small>
      ${guests.length
        ? `<div class="dr-invite-list">
            ${guests.map((g) => {
              const gTel = g.tel ? normalizePhone(g.tel) : "";
              const gWaMsg = encodeURIComponent(`✦ Un Sauveur est né · Il est le Cadeau ✦\nCher·ère ${g.nom}, ${r.nom} vous a inscrit·e comme son invité·e pour la fête de Noël 🎄 Jeudi 24 décembre 2026 · 10h–15h · Salle des fêtes de la mairie d'Aboisso.`);
              return `<div class="dr-invite-row">
                <div>
                  <strong>${g.icon} ${escapeHTML(g.nom)}</strong>
                  <small style="display:block">${g.type === "inactif" ? "Membre inactif·ve" : "Ami·e"}${g.tel ? ` · ${escapeHTML(g.tel)}` : ""}</small>
                </div>
                ${gTel ? `<a class="btn btn-outline btn-sm" href="https://wa.me/${gTel}?text=${gWaMsg}" target="_blank" rel="noopener">💬 WhatsApp</a>` : ""}
              </div>`;
            }).join("")}
          </div>`
        : `<p style="color:var(--ink-soft)">Aucune personne invitée</p>`}
    </div>
    <div class="d-item">
      <small>Petit mot / Note</small>
      <p>${r.note ? escapeHTML(r.note) : "—"}</p>
    </div>
    <div class="d-item">
      <small>Date d'enregistrement</small>
      <p>${fmtDate(r.at)}</p>
    </div>
  `;

  $("#dr-foot").innerHTML = `
    ${wa ? `<a class="btn btn-red" style="flex:1" href="${wa}" target="_blank" rel="noopener">${ICON.wa} Contacter sur WhatsApp</a>` : ""}
    <button class="btn btn-outline" type="button" data-del-rsvp="${r.id}" style="color:var(--crimson)">${ICON.trash} Supprimer</button>
  `;

  $("#drawer-backdrop").classList.remove("hidden");
  $("#guest-drawer").classList.remove("hidden");
  document.querySelectorAll("#tbl-rsvps tbody tr.tr-main").forEach((tr) => {
    tr.classList.toggle("open", tr.dataset.expand === currentDrawerId);
  });
}

function closeGuestDrawer() {
  currentDrawerId = null;
  $("#drawer-backdrop")?.classList.add("hidden");
  $("#guest-drawer")?.classList.add("hidden");
  document.querySelectorAll("#tbl-rsvps tbody tr.tr-main.open").forEach((tr) => tr.classList.remove("open"));
}

$("#dr-close")?.addEventListener("click", closeGuestDrawer);
$("#drawer-backdrop")?.addEventListener("click", closeGuestDrawer);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && currentDrawerId) closeGuestDrawer();
});

function render() {
  const { rsvps, guestbook, stats } = STATE;

  /* Statistiques */
  $("#st-total").textContent = stats.total ?? 0;
  $("#st-presents").textContent = stats.presents ?? 0;
  $("#st-people").textContent = stats.people ?? 0;
  $("#st-messages").textContent = stats.messages ?? 0;
  $("#st-invites").textContent = stats.invites ?? 0;

  /* Barre de progression « Présents annoncés » */
  const total = stats.total ?? 0, pres = stats.presents ?? 0;
  const pct = total > 0 ? Math.round((pres / total) * 100) : 0;
  $("#st-present-bar").style.width = pct + "%";
  $("#st-present-label").textContent = total ? `${pres} sur ${total} réponses · ${pct} %` : "En attente de réponses";

  /* Statistiques de pointage Jour J */
  const checkedRsvps = stats.checkedInRsvps ?? rsvps.filter((r) => r.checked_in).length;
  const checkedPeople = stats.checkedInPeople ?? rsvps.filter((r) => r.checked_in).reduce((s, r) => s + (r.people || 1), 0);
  const expectedPeople = stats.people || 0;
  const checkinPct = expectedPeople > 0 ? Math.min(100, Math.round((checkedPeople / expectedPeople) * 100)) : 0;
  if ($("#st-checkedin")) $("#st-checkedin").textContent = checkedRsvps;
  if ($("#st-checkin-bar")) $("#st-checkin-bar").style.width = checkinPct + "%";
  if ($("#st-checkin-label")) $("#st-checkin-label").textContent = `${checkedPeople} pers. en salle sur ${expectedPeople || 0}`;
  if ($("#c-checkin")) $("#c-checkin").textContent = checkedRsvps;

  $("#c-rsvps").textContent = rsvps.length;
  $("#c-gb").textContent = guestbook.length;
  $("#c-wall").textContent = (STATE.wall ?? []).length;
  $("#c-inv").textContent = (STATE.invites ?? []).length;

  /* Table des inscriptions (avec filtres) */
  const q = $("#f-search").value.trim().toLowerCase();
  const filter = $("#f-filter").value;
  const matchesFilter = (r) => {
    if (filter === "all") return true;
    if (filter === "checkedin") return !!r.checked_in;
    if (filter === "present" || filter === "absent") return r.presence === filter;
    if (filter === "membre") return (r.statut || "membre") === "membre";
    if (filter === "ami") return r.statut === "ami";
    return true;
  };
  const matchesSearch = (r) => {
    if (!q) return true;
    const guests = getGuestsForRsvp(r);
    return [
      r.nom,
      String(r.num || ""),
      r.branche,
      r.localite,
      r.tel,
      r.note,
      ...guests.map((g) => g.nom),
      ...guests.map((g) => g.tel),
    ].some((v) => (v || "").toLowerCase().includes(q));
  };
  const rows = rsvps
    .filter(matchesFilter)
    .filter(matchesSearch)
    .slice()
    .reverse();

  const tbody = $("#tbl-rsvps tbody");
  tbody.innerHTML = "";
  const cardsBox = $("#rsvp-cards");
  cardsBox.innerHTML = "";

  rows.forEach((r, i) => {
    const tel = r.tel ? normalizePhone(r.tel) : "";
    const wa = tel ? `https://wa.me/${tel}` : "";
    const guests = getGuestsForRsvp(r);
    const lieu = [r.branche, r.localite].filter(Boolean).join(" · ");

    /* ---------- Ligne principale compacte (6 colonnes, zéro défilement horizontal) ---------- */
    const tr = document.createElement("tr");
    tr.className = "tr-main" + (currentDrawerId === String(r.id) ? " open" : "");
    tr.dataset.expand = r.id;
    tr.tabIndex = 0;
    tr.setAttribute("role", "button");
    tr.setAttribute("aria-label", `Voir les détails de ${r.nom}`);

    const guestsBadge = guests.length
      ? `<span class="guests-badge">${ICON.users}${guests.length} invité${guests.length > 1 ? "s" : ""}</span>`
      : "";

    tr.innerHTML = `
      <td class="t-num">N°${r.num}</td>
      <td>
        <span class="t-name">${escapeHTML(r.nom)}</span>
        <span class="t-sub">${lieu ? escapeHTML(lieu) : fmtDate(r.at)}</span>
      </td>
      <td>
        <div class="t-pills">
          <span class="pill ${r.statut === "ami" ? "ami" : "membre"}">${r.statut === "ami" ? "Ami·e" : "Membre"}</span>
          <span class="pill ${r.presence === "present" ? "present" : "absent"}">${r.presence === "present" ? "Présent·e" : "Absent·e"}</span>
          ${r.checked_in ? `<span class="pill checkedin">✅ En salle</span>` : ""}
        </div>
      </td>
      <td><strong>${r.people}</strong></td>
      <td>
        <div class="t-contact">
          ${r.tel ? `<a href="tel:${tel}">${escapeHTML(r.tel)}</a>` : `<span style="color:var(--ink-soft)">—</span>`}
          ${guestsBadge}
        </div>
      </td>
      <td class="row-actions">
        <button class="btn-detail" type="button" data-open-drawer="${r.id}">Détails</button>
        <button class="icon-btn" type="button" data-menu="m${r.id}" title="Actions" aria-label="Actions pour ${escapeHTML(r.nom)}">${ICON.dots}</button>
        <div class="menu hidden" id="menu-m${r.id}">
          <button type="button" data-checkin-id="${r.id}" data-checkin-val="${r.checked_in ? "0" : "1"}">${ICON.check} ${r.checked_in ? "Annuler pointage" : "Pointer l'arrivée"}</button>
          ${wa ? `<a href="${wa}" target="_blank" rel="noopener">${ICON.wa} WhatsApp</a>` : ""}
          <button type="button" class="danger" data-del-rsvp="${r.id}">${ICON.trash} Supprimer</button>
        </div>
      </td>`;
    tbody.appendChild(tr);

    /* ---------- Carte (Tablette & Mobile ≤ 820px) ---------- */
    const card = document.createElement("article");
    card.className = "rsvp-card";
    card.style.animationDelay = `${Math.min(i * 40, 300)}ms`;
    card.innerHTML = `
      <div class="rsvp-card-top">
        <strong>${escapeHTML(r.nom)}</strong>
        <small>N°${r.num}</small>
      </div>
      <div class="rsvp-card-pills">
        <span class="pill ${r.statut === "ami" ? "ami" : "membre"}">${r.statut === "ami" ? "Ami·e" : "Membre"}</span>
        <span class="pill ${r.presence === "present" ? "present" : "absent"}">${r.presence === "present" ? "Présent·e" : "Absent·e"}</span>
        <span class="pill inactif">${r.people} personne${r.people > 1 ? "s" : ""}</span>
        ${r.checked_in ? `<span class="pill checkedin">✅ En salle</span>` : ""}
      </div>
      <div class="rsvp-card-meta">
        <p><small>Tél</small><span>${r.tel ? `<a href="tel:${tel}">${escapeHTML(r.tel)}</a>` : "—"}</span></p>
        <p><small>Lieu</small><span>${lieu ? escapeHTML(lieu) : "—"}</span></p>
        ${guests.length ? `<p><small>Invités</small><span>${guests.map((g) => `${g.icon} ${escapeHTML(g.nom)}`).join(" · ")}</span></p>` : ""}
        ${r.note ? `<p><small>Note</small><span>${escapeHTML(r.note)}</span></p>` : ""}
        <p><small>Date</small><span>${fmtDate(r.at)}</span></p>
      </div>
      <div class="rsvp-card-foot">
        <button class="btn btn-outline btn-sm" type="button" data-open-drawer="${r.id}">📋 Détails</button>
        <button class="btn ${r.checked_in ? "btn-outline" : "btn-red"} btn-sm" type="button" data-checkin-id="${r.id}" data-checkin-val="${r.checked_in ? "0" : "1"}">
          ${r.checked_in ? "↩️ Pointé" : "✅ Pointer"}
        </button>
        ${wa ? `<a class="btn btn-outline btn-sm" href="${wa}" target="_blank" rel="noopener">💬</a>` : ""}
      </div>`;
    cardsBox.appendChild(card);
  });
  $("#empty-rsvps").classList.toggle("hidden", rows.length > 0);

  /* Liste des arrivées dans l'onglet Pointage Jour J */
  const checkinListEl = $("#checkin-list");
  if (checkinListEl) {
    const arrived = rsvps
      .filter((r) => r.checked_in)
      .slice()
      .sort((a, b) => new Date(b.checked_in_at || 0) - new Date(a.checked_in_at || 0));
    checkinListEl.innerHTML = "";
    arrived.forEach((r) => {
      const div = document.createElement("div");
      div.className = "checkin-row";
      div.innerHTML = `
        <div>
          <strong>✅ ${escapeHTML(r.nom)} <span style="color:var(--crimson)">(N°${r.num})</span></strong>
          <small>${r.people} pers. · ${escapeHTML(r.branche || "Visiteur·se")} · Arrivé·e à ${fmtDate(r.checked_in_at)}</small>
        </div>
        <button class="btn btn-outline btn-sm" type="button" data-checkin-id="${r.id}" data-checkin-val="0">↩️ Annuler</button>
      `;
      checkinListEl.appendChild(div);
    });
    $("#empty-checkin")?.classList.toggle("hidden", arrived.length > 0);
  }

  /* Si le tiroir de détails est ouvert, le synchroniser avec les nouvelles données */
  if (currentDrawerId) openGuestDrawer(currentDrawerId);

  /* Livre d'or */
  const grid = $("#gb-grid");
  grid.innerHTML = "";
  guestbook.slice().reverse().forEach((g, i) => {
    const isApproved = g.approved !== false;
    const isReported = !!g.reported;
    const card = document.createElement("article");
    card.className = "gb-card";
    card.style.animationDelay = `${Math.min(i * 60, 400)}ms`;
    if (isReported) card.style.borderColor = "#D70B33";
    card.innerHTML = `
      <p class="who">
        ${escapeHTML(g.nom)}
        ${isReported ? `<span class="pill absent">🚩 Signalé</span>` : ""}
        ${!isApproved ? `<span class="pill inactif">Masqué</span>` : ""}
        <span class="when">${fmtDate(g.at)}</span>
      </p>
      <p class="txt">${escapeHTML(g.msg)}</p>
      <div style="display:flex;gap:.35rem;align-items:center">
        <button class="btn btn-outline btn-sm" type="button" data-mod-type="guestbook" data-mod-id="${g.id}" data-mod-val="${isApproved ? "0" : "1"}">
          ${isApproved ? "🙈 Masquer" : "✅ Approuver"}
        </button>
        <button class="icon-btn" type="button" title="Supprimer" aria-label="Supprimer le vœu de ${escapeHTML(g.nom)}" data-del-gb="${g.id}">${ICON.trash}</button>
      </div>`;
    grid.appendChild(card);
  });
  $("#empty-gb").classList.toggle("hidden", guestbook.length > 0);

  /* Mur photo */
  const wall = STATE.wall ?? [];
  const wallGrid = $("#wall-grid");
  wallGrid.innerHTML = "";
  wall.slice().reverse().forEach((p) => {
    const isApproved = p.approved !== false;
    const isReported = !!p.reported;
    const card = document.createElement("article");
    card.className = "wall-admin-card";
    if (isReported) card.style.borderColor = "#D70B33";
    card.innerHTML = `
      <img src="${p.photo}" alt="${escapeHTML(p.nom)}" width="84" height="84" loading="lazy" decoding="async" />
      <div class="wall-admin-info">
        <strong>
          ${escapeHTML(p.nom)}
          ${isReported ? `<span class="pill absent">🚩 Signalé</span>` : ""}
          ${!isApproved ? `<span class="pill inactif">Masqué</span>` : ""}
        </strong>
        ${p.msg ? `<span>${escapeHTML(p.msg)}</span>` : ""}
        <small>${fmtDate(p.at)}</small>
      </div>
      <div style="display:flex;gap:.35rem;align-items:center">
        <button class="btn btn-outline btn-sm" type="button" data-mod-type="photo-wall" data-mod-id="${p.id}" data-mod-val="${isApproved ? "0" : "1"}">
          ${isApproved ? "🙈 Masquer" : "✅ Approuver"}
        </button>
        <button class="icon-btn" type="button" title="Supprimer" aria-label="Supprimer la photo de ${escapeHTML(p.nom)}" data-del-wall="${p.id}">${ICON.trash}</button>
      </div>`;
    wallGrid.appendChild(card);
  });
  $("#empty-wall").classList.toggle("hidden", wall.length > 0);

  /* Invitations (Tableau Desktop + Cartes Mobile) */
  const invites = STATE.invites ?? [];
  const invTbody = $("#tbl-invites tbody");
  const invCards = $("#invite-cards");
  invTbody.innerHTML = "";
  if (invCards) invCards.innerHTML = "";

  invites.slice().reverse().forEach((i, idx) => {
    const tel = i.tel ? normalizePhone(i.tel) : "";
    const qs = new URLSearchParams({ pour: i.nom });
    if (i.par) qs.set("de", i.par);
    const personalUrl = `${location.origin}/?${qs.toString()}`;
    const wa = tel ? `https://wa.me/${tel}?text=${encodeURIComponent(`✦ Un Sauveur est né · Il est le Cadeau ✦\nCher·ère ${i.nom}, vous êtes invité·e à la fête de Noël 🎄 Jeudi 24 décembre 2026 · 10h–15h · Salle des fêtes de la mairie d'Aboisso.\n💌 Ouvrez votre enveloppe : ${personalUrl}`)}` : "";
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><span class="t-name">${escapeHTML(i.nom)}</span></td>
      <td><span class="pill ${i.type === "inactif" ? "inactif" : "ami"}">${i.type === "inactif" ? "Membre inactif·ve" : "Ami·e"}</span></td>
      <td>${i.tel ? `<a href="tel:${tel}" style="color:var(--crimson);text-decoration:underline;text-underline-offset:2px">${escapeHTML(i.tel)}</a>` : "—"}</td>
      <td>${i.par ? escapeHTML(i.par) : "—"}</td>
      <td>${fmtDate(i.at)}</td>
      <td class="row-actions">
        <button class="icon-btn" type="button" data-menu="i${i.id}" title="Actions" aria-label="Actions pour ${escapeHTML(i.nom)}">${ICON.dots}</button>
        <div class="menu hidden" id="menu-i${i.id}">
          ${wa ? `<a href="${wa}" target="_blank" rel="noopener">${ICON.wa} Inviter par WhatsApp</a>` : ""}
          <button type="button" class="danger" data-del-inv="${i.id}">${ICON.trash} Retirer</button>
        </div>
      </td>`;
    invTbody.appendChild(tr);

    if (invCards) {
      const card = document.createElement("article");
      card.className = "rsvp-card";
      card.style.animationDelay = `${Math.min(idx * 40, 300)}ms`;
      card.innerHTML = `
        <div class="rsvp-card-top">
          <strong>${escapeHTML(i.nom)}</strong>
          <span class="pill ${i.type === "inactif" ? "inactif" : "ami"}">${i.type === "inactif" ? "Membre inactif·ve" : "Ami·e"}</span>
        </div>
        <div class="rsvp-card-meta">
          <p><small>Contact</small><span>${i.tel ? `<a href="tel:${tel}">${escapeHTML(i.tel)}</a>` : "—"}</span></p>
          <p><small>Par</small><span>${i.par ? escapeHTML(i.par) : "—"}</span></p>
          <p><small>Date</small><span>${fmtDate(i.at)}</span></p>
        </div>
        <div class="rsvp-card-foot">
          ${wa ? `<a class="btn btn-outline btn-sm" href="${wa}" target="_blank" rel="noopener">💬 Inviter sur WhatsApp</a>` : ""}
          <button class="btn btn-outline btn-sm danger" type="button" data-del-inv="${i.id}" style="color:var(--crimson)">🗑️ Retirer</button>
        </div>`;
      invCards.appendChild(card);
    }
  });
  $("#empty-inv").classList.toggle("hidden", invites.length > 0);
}

/* ---------- Pointage Jour J : Formulaire & Scanner Caméra QR Code ---------- */
$("#checkin-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = $("#checkin-num");
  const num = parseInt(input.value.trim(), 10);
  if (!num) return;
  await toggleCheckin({ num, checked_in: true, showBanner: true });
  input.value = "";
  input.focus();
});

let qrStream = null;
let qrScanActive = false;

async function stopQrScanner() {
  qrScanActive = false;
  if (qrStream) {
    qrStream.getTracks().forEach((t) => t.stop());
    qrStream = null;
  }
  $("#qr-scanner")?.classList.add("hidden");
}

async function startQrScanner() {
  const scannerBox = $("#qr-scanner");
  const video = $("#qr-video");
  if (!scannerBox || !video) return;

  try {
    qrStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false,
    });
    video.srcObject = qrStream;
    scannerBox.classList.remove("hidden");
    qrScanActive = true;

    if ("BarcodeDetector" in window) {
      const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
      const scanLoop = async () => {
        if (!qrScanActive) return;
        try {
          const codes = await detector.detect(video);
          if (codes && codes.length > 0) {
            const raw = codes[0].rawValue || "";
            const m = raw.match(/#billet-(\d+)/) || raw.match(/(\d{3,4})/);
            if (m) {
              await stopQrScanner();
              await toggleCheckin({ num: parseInt(m[1], 10), checked_in: true, showBanner: true });
              return;
            }
          }
        } catch {}
        if (qrScanActive) requestAnimationFrame(scanLoop);
      };
      requestAnimationFrame(scanLoop);
    } else {
      toast("📱 Saisissez le N° à 3 chiffres inscrit sous le QR code du billet.");
    }
  } catch {
    await stopQrScanner();
    toast("📷 Caméra indisponible — tapez le N° de billet dans le champ ci-dessus.");
    $("#checkin-num")?.focus();
  }
}

$("#btn-scan-qr")?.addEventListener("click", () => {
  if (qrScanActive) stopQrScanner();
  else startQrScanner();
});
$("#btn-stop-qr")?.addEventListener("click", stopQrScanner);

async function refresh(silent = true) {
  try {
    STATE = await api("/api/admin/summary");
    render();
    if (!silent) toast("🔄 Données actualisées");
  } catch (e) {
    if (!silent) toast(e.message || "Erreur de connexion");
  }
}
$("#btn-refresh").addEventListener("click", () => refresh(false));

/* Actualisation automatique toutes les 30 s */
clearInterval(autoTimer);
autoTimer = setInterval(() => {
  if (!document.hidden && token) refresh(true);
}, 30000);

/* ---------- Filtres ---------- */
$("#f-search").addEventListener("input", render);
$("#f-filter").addEventListener("change", render);

/* ---------- Onglets ---------- */
$("#tabs").addEventListener("click", (e) => {
  const btn = e.target.closest(".tab");
  if (!btn) return;
  currentTab = btn.dataset.tab;
  if (currentTab !== "checkin") stopQrScanner();
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("on", t === btn));
  ["rsvps", "checkin", "guestbook", "wall", "invites", "outils"].forEach((id) => {
    $(`#panel-${id}`)?.classList.toggle("hidden", id !== currentTab);
  });
});

/* ---------- Ouverture du Tiroir Latéral (Drawer) au clic ou au clavier ---------- */
$("#tbl-rsvps tbody").addEventListener("click", (e) => {
  if (e.target.closest("a, [data-menu], .menu, [data-checkin-id]")) return;
  const main = e.target.closest(".tr-main");
  if (!main) return;
  openGuestDrawer(main.dataset.expand);
});

$("#tbl-rsvps tbody").addEventListener("keydown", (e) => {
  if (e.key !== "Enter" && e.key !== " ") return;
  if (e.target.closest("a, button")) return;
  const main = e.target.closest(".tr-main");
  if (!main) return;
  e.preventDefault();
  openGuestDrawer(main.dataset.expand);
});

document.addEventListener("click", async (e) => {
  const checkinBtn = e.target.closest("[data-checkin-id]");
  if (checkinBtn) {
    e.stopPropagation();
    const id = checkinBtn.dataset.checkinId;
    const val = checkinBtn.dataset.checkinVal === "1";
    document.querySelectorAll(".row-actions .menu").forEach((m) => m.classList.add("hidden"));
    await toggleCheckin({ id, checked_in: val, showBanner: false });
    return;
  }

  const openBtn = e.target.closest("[data-open-drawer]");
  if (openBtn) {
    openGuestDrawer(openBtn.dataset.openDrawer);
    return;
  }
  const menuBtn = e.target.closest("[data-menu]");
  if (menuBtn) {
    const menu = document.getElementById(`menu-${menuBtn.dataset.menu}`);
    const wasOpen = !menu.classList.contains("hidden");
    document.querySelectorAll(".row-actions .menu").forEach((m) => m.classList.add("hidden"));
    menu.classList.toggle("hidden", wasOpen);
    return;
  }
  /* Clic ailleurs : refermer tous les menus ouverts */
  if (!e.target.closest(".row-actions .menu")) {
    document.querySelectorAll(".row-actions .menu").forEach((m) => m.classList.add("hidden"));
  }
});

/* ---------- Actions (suppression avec fondu, copie) ---------- */
function fadeOut(el) {
  if (!el) return Promise.resolve();
  el.classList.add("removing");
  return new Promise((r) => setTimeout(r, 260));
}

document.addEventListener("click", async (e) => {
  const modBtn = e.target.closest("[data-mod-type]");
  if (modBtn) {
    const type = modBtn.dataset.modType;
    const id = modBtn.dataset.modId;
    const approved = modBtn.dataset.modVal === "1";
    await api("/api/admin/moderate", {
      method: "POST",
      body: JSON.stringify({ type, id, approved }),
    });
    await refresh();
    toast(approved ? "✅ Contenu approuvé et visible" : "🙈 Contenu masqué du site public");
    return;
  }
  const delR = e.target.closest("[data-del-rsvp]");
  const delG = e.target.closest("[data-del-gb]");
  const delW = e.target.closest("[data-del-wall]");
  const delI = e.target.closest("[data-del-inv]");
  if (delR) {
    if (!confirm("Supprimer cette inscription ?")) return;
    const id = delR.dataset.delRsvp;
    if (currentDrawerId === String(id)) closeGuestDrawer();
    await fadeOut(delR.closest(".tr-main") || delR.closest(".rsvp-card"));
    await api(`/api/admin/rsvp?id=${id}`, { method: "DELETE" });
    await refresh();
    toast("🗑️ Inscription supprimée");
  }
  if (delG) {
    if (!confirm("Supprimer ce vœu ?")) return;
    await fadeOut(delG.closest(".gb-card"));
    await api(`/api/admin/guestbook?id=${delG.dataset.delGb}`, { method: "DELETE" });
    await refresh();
    toast("🗑️ Vœu supprimé");
  }
  if (delW) {
    if (!confirm("Supprimer cette photo du mur ?")) return;
    await fadeOut(delW.closest(".wall-admin-card"));
    await api(`/api/admin/photo-wall?id=${delW.dataset.delWall}`, { method: "DELETE" });
    await refresh();
    toast("🗑️ Photo supprimée");
  }
  if (delI) {
    if (!confirm("Retirer cette personne des invitations ?")) return;
    await fadeOut(delI.closest("tr") || delI.closest(".rsvp-card"));
    await api(`/api/admin/invite?id=${delI.dataset.delInv}`, { method: "DELETE" });
    await refresh();
    toast("🗑️ Invitation retirée");
  }
});

$("#btn-copy-phones").addEventListener("click", async () => {
  const phones = STATE.rsvps
    .filter((r) => r.presence === "present" && r.tel)
    .map((r) => normalizePhone(r.tel));
  if (!phones.length) return toast("Aucun numéro disponible 🙏");
  try {
    await navigator.clipboard.writeText(phones.join(", "));
    toast(`📋 ${phones.length} numéro(s) copié(s) !`);
  } catch {
    toast("Impossible de copier 😕");
  }
});
