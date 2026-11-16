/* =========================================================
   Back office — logique du tableau de bord
   ========================================================= */
const $ = (sel) => document.querySelector(sel);

/* Numéro local ivoirien → format international pour les liens WhatsApp */
function normalizePhone(t) {
  let p = String(t || "").replace(/\D/g, "");
  if (p.startsWith("225")) return p;           // déjà au format international
  if (p.startsWith("0")) return "225" + p;     // numéro local 0X XX XX XX XX
  if (p.length === 8) return "225" + p;        // ancien format ivoirien à 8 chiffres
  return p;
}

function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove("show"), 3200);
}

/* ---------- Petites icônes (style Lucide) ---------- */
const ICON = {
  chevron: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>`,
  dots: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>`,
  wa: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.6 8.6 0 0 1-3.8-.9L3 21l2-4.9a8.4 8.4 0 1 1 16-4.6Z"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>`,
  users: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  phone: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.4 2.1L8.1 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.6 1.9Z"/></svg>`,
  pin: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 6.1C15.8 4.8 14 4 12 4a5 5 0 0 0-5 5c0 5 5 11 5 11s5-6 5-11"/><circle cx="12" cy="9" r="2"/></svg>`,
  clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>`,
  note: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>`,
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
  $("#dash").classList.add("hidden");
  $("#login-screen").classList.remove("hidden");
}

$("#login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const pass = $("#l-pass").value;
  try {
    const data = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pass }),
    }).then((r) => r.json());
    if (!data.ok) throw new Error();
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

/* ---------- État + rendu ---------- */
let STATE = { rsvps: [], guestbook: [], wall: [], invites: [], stats: {} };
let currentTab = "rsvps";
let autoTimer = null;
/* Lignes dépliées : on mémorise les ids ouverts pour ne pas les refermer à chaque refresh */
let expanded = new Set();

function fmtDate(iso) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function render() {
  const { rsvps, guestbook, stats } = STATE;

  /* Statistiques */
  $("#st-total").textContent = stats.total ?? 0;
  $("#st-presents").textContent = stats.presents ?? 0;
  $("#st-absents").textContent = stats.absents ?? 0;
  $("#st-people").textContent = stats.people ?? 0;
  $("#st-messages").textContent = stats.messages ?? 0;
  $("#st-invites").textContent = stats.invites ?? 0;
  /* Barre de progression « Présents » : présent·es sur l'ensemble des réponses */
  const total = stats.total ?? 0, pres = stats.presents ?? 0;
  const pct = total > 0 ? Math.round((pres / total) * 100) : 0;
  $("#st-present-bar").style.width = pct + "%";
  $("#st-present-label").textContent = total ? `${pres} sur ${total} réponses · ${pct} %` : "En attente de réponses";
  $("#c-rsvps").textContent = rsvps.length;
  $("#c-gb").textContent = guestbook.length;
  $("#c-wall").textContent = (STATE.wall ?? []).length;
  $("#c-inv").textContent = (STATE.invites ?? []).length;

  /* Table des inscriptions (avec filtres) */
  const q = $("#f-search").value.trim().toLowerCase();
  const filter = $("#f-filter").value;
  const matchesFilter = (r) => {
    if (filter === "all") return true;
    if (filter === "present" || filter === "absent") return r.presence === filter;
    if (filter === "membre") return (r.statut || "membre") === "membre";
    if (filter === "ami") return r.statut === "ami";
    return true;
  };
  const matchesSearch = (r) => {
    if (!q) return true;
    return [r.nom, r.branche, r.localite, r.ami_nom, r.inactif_nom, r.tel]
      .some((v) => (v || "").toLowerCase().includes(q));
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
    const guests = [
      r.ami_nom ? { icon: "🤝", nom: r.ami_nom, tel: r.ami_tel } : null,
      r.inactif_nom ? { icon: "⛪", nom: r.inactif_nom, tel: r.inactif_tel } : null,
    ].filter(Boolean);
    const lieu = [r.branche, r.localite].filter(Boolean).join(" · ");

    /* ---------- Ligne principale (colonnes clés uniquement) ---------- */
    const tr = document.createElement("tr");
    tr.className = "tr-main" + (expanded.has(r.id) ? " open" : "");
    tr.dataset.expand = r.id;
    const guestsBadge = guests.length
      ? `<span class="guests-badge" tabindex="0">${ICON.users}${guests.length} invité${guests.length > 1 ? "s" : ""}
           <span class="tip"><b>Personne(s) invitée(s)</b>${guests.map(g =>
             `${g.icon} ${escapeHTML(g.nom)}${g.tel ? ` · <span>${normalizePhone(g.tel)}</span>` : ""}`).join("<br>")}</span>
         </span>`
      : `<span style="color:#C4AEB4">—</span>`;
    tr.innerHTML = `
      <td class="t-num">N°${r.num}</td>
      <td class="t-name">${escapeHTML(r.nom)}</td>
      <td><span class="pill ${r.statut === "ami" ? "ami" : "membre"}">${r.statut === "ami" ? "Ami·e" : "Membre"}</span></td>
      <td><span class="pill ${r.presence === "present" ? "present" : "absent"}">${r.presence === "present" ? "Présent·e" : "Absent·e"}</span></td>
      <td>${r.people}</td>
      <td>${r.tel ? `<a href="tel:${tel}" style="color:var(--crimson);text-decoration:underline;text-underline-offset:2px">${escapeHTML(r.tel)}</a>` : "—"}</td>
      <td>${guestsBadge}</td>
      <td><span class="t-chevron" aria-hidden="true">${ICON.chevron}</span></td>
      <td class="row-actions">
        <button class="icon-btn" type="button" data-menu="m${r.id}" title="Actions" aria-label="Actions pour ${escapeHTML(r.nom)}">${ICON.dots}</button>
        <div class="menu hidden" id="menu-m${r.id}">
          ${wa ? `<a href="${wa}" target="_blank" rel="noopener">${ICON.wa} WhatsApp</a>` : ""}
          <button type="button" class="danger" data-del-rsvp="${r.id}">${ICON.trash} Supprimer</button>
        </div>
      </td>`;
    tbody.appendChild(tr);

    /* ---------- Ligne de détails (Branche, Note, Date) ---------- */
    const trD = document.createElement("tr");
    trD.className = "tr-details" + (expanded.has(r.id) ? "" : " hidden");
    trD.dataset.details = r.id;
    trD.innerHTML = `<td colspan="9"><div class="detail-grid">
        <div class="d-item"><small>Branche / Localité</small><p>${lieu ? escapeHTML(lieu) : "—"}</p></div>
        <div class="d-item"><small>Note</small><p>${r.note ? escapeHTML(r.note) : "—"}</p></div>
        <div class="d-item"><small>Date de réponse</small><p>${fmtDate(r.at)}</p></div>
      </div></td>`;
    tbody.appendChild(trD);

    /* ---------- Carte (mobile / tablette étroite) ---------- */
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
      </div>
      <div class="rsvp-card-meta">
        <p><small>Tél</small><span>${r.tel ? `<a href="tel:${tel}">${escapeHTML(r.tel)}</a>` : "—"}</span></p>
        <p><small>Lieu</small><span>${lieu ? escapeHTML(lieu) : "—"}</span></p>
        ${guests.length ? `<p><small>Invités</small><span>${guests.map(g => `${g.icon} ${escapeHTML(g.nom)}${g.tel ? ` (${normalizePhone(g.tel)})` : ""}`).join(" · ")}</span></p>` : ""}
        ${r.note ? `<p><small>Note</small><span>${escapeHTML(r.note)}</span></p>` : ""}
        <p><small>Date</small><span>${fmtDate(r.at)}</span></p>
      </div>
      <div class="rsvp-card-foot">
        ${wa ? `<a class="btn btn-outline btn-sm" href="${wa}" target="_blank" rel="noopener">💬 WhatsApp</a>` : ""}
        <button class="btn btn-outline btn-sm danger" type="button" data-del-rsvp="${r.id}" style="color:var(--crimson)">🗑️ Supprimer</button>
      </div>`;
    cardsBox.appendChild(card);
  });
  $("#empty-rsvps").classList.toggle("hidden", rows.length > 0);

  /* Livre d'or */
  const grid = $("#gb-grid");
  grid.innerHTML = "";
  guestbook.slice().reverse().forEach((g, i) => {
    const card = document.createElement("article");
    card.className = "gb-card";
    card.style.animationDelay = `${Math.min(i * 60, 400)}ms`;
    card.innerHTML = `
      <p class="who">${escapeHTML(g.nom)}<span class="when">${fmtDate(g.at)}</span></p>
      <p class="txt">${escapeHTML(g.msg)}</p>
      <button class="icon-btn" title="Supprimer" data-del-gb="${g.id}">${ICON.trash}</button>`;
    grid.appendChild(card);
  });
  $("#empty-gb").classList.toggle("hidden", guestbook.length > 0);

  /* Mur photo */
  const wall = STATE.wall ?? [];
  const wallGrid = $("#wall-grid");
  wallGrid.innerHTML = "";
  wall.slice().reverse().forEach((p) => {
    const card = document.createElement("article");
    card.className = "wall-admin-card";
    card.innerHTML = `
      <img src="${p.photo}" alt="" loading="lazy" />
      <div class="wall-admin-info">
        <strong>${escapeHTML(p.nom)}</strong>
        ${p.msg ? `<span>${escapeHTML(p.msg)}</span>` : ""}
        <small>${fmtDate(p.at)}</small>
      </div>
      <button class="icon-btn" title="Supprimer" data-del-wall="${p.id}">${ICON.trash}</button>`;
    wallGrid.appendChild(card);
  });
  $("#empty-wall").classList.toggle("hidden", wall.length > 0);

  /* Invitations */
  const invites = STATE.invites ?? [];
  const invTbody = $("#tbl-invites tbody");
  invTbody.innerHTML = "";
  invites.slice().reverse().forEach((i) => {
    const tr = document.createElement("tr");
    const tel = i.tel ? normalizePhone(i.tel) : "";
    const wa = tel ? `https://wa.me/${tel}?text=${encodeURIComponent(`✦ Éclairer le Monde ✦\nCher·ère ${i.nom}, vous êtes invité·e à la fête de Noël 🎄 Samedi 19 décembre 2026 · 10h–15h · Salle des fêtes de la mairie d'Aboisso. Entrée gratuite !`)}` : "";
    tr.innerHTML = `
      <td class="t-name">${escapeHTML(i.nom)}</td>
      <td><span class="pill ${i.type === "inactif" ? "inactif" : "ami"}">${i.type === "inactif" ? "Membre inactif·ve" : "Ami·e"}</span></td>
      <td>${i.tel ? `<a href="tel:${tel}" style="color:var(--crimson);text-decoration:underline;text-underline-offset:2px">${escapeHTML(i.tel)}</a>` : "—"}</td>
      <td>${i.par ? escapeHTML(i.par) : "—"}</td>
      <td>${fmtDate(i.at)}</td>
      <td class="row-actions">
        <button class="icon-btn" type="button" data-menu="i${i.id}" title="Actions">${ICON.dots}</button>
        <div class="menu hidden" id="menu-i${i.id}">
          ${wa ? `<a href="${wa}" target="_blank" rel="noopener">${ICON.wa} Inviter par WhatsApp</a>` : ""}
          <button type="button" class="danger" data-del-inv="${i.id}">${ICON.trash} Retirer</button>
        </div>
      </td>`;
    invTbody.appendChild(tr);
  });
  $("#empty-inv").classList.toggle("hidden", invites.length > 0);
}

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

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
autoTimer = setInterval(() => refresh(), 30000);

/* ---------- Filtres ---------- */
$("#f-search").addEventListener("input", render);
$("#f-filter").addEventListener("change", render);

/* ---------- Onglets ---------- */
$("#tabs").addEventListener("click", (e) => {
  const btn = e.target.closest(".tab");
  if (!btn) return;
  currentTab = btn.dataset.tab;
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("on", t === btn));
  ["rsvps", "guestbook", "wall", "invites", "outils"].forEach((id) => {
    $(`#panel-${id}`).classList.toggle("hidden", id !== currentTab);
  });
});

/* ---------- Lignes dépliables (détails) ---------- */
$("#tbl-rsvps tbody").addEventListener("click", (e) => {
  /* On n'ouvre pas les détails quand on touche un lien, un bouton ou le menu */
  if (e.target.closest("a, button, .row-actions, .guests-badge")) return;
  const main = e.target.closest(".tr-main");
  if (!main) return;
  const id = main.dataset.expand;
  const det = document.querySelector(`[data-details="${id}"]`);
  if (!det) return;
  const open = main.classList.toggle("open");
  det.classList.toggle("hidden", !open);
  if (open) expanded.add(id); else expanded.delete(id);
});

/* ---------- Menus d'actions (trois points) ---------- */
document.addEventListener("click", (e) => {
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
  const delR = e.target.closest("[data-del-rsvp]");
  const delG = e.target.closest("[data-del-gb]");
  const delW = e.target.closest("[data-del-wall]");
  const delI = e.target.closest("[data-del-inv]");
  if (delR) {
    if (!confirm("Supprimer cette inscription ?")) return;
    await fadeOut(delR.closest(".tr-main") || delR.closest(".rsvp-card"));
    await api(`/api/admin/rsvp?id=${delR.dataset.delRsvp}`, { method: "DELETE" });
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
    await fadeOut(delI.closest("tr"));
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
