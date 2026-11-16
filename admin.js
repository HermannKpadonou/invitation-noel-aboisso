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
  rows.forEach((r) => {
    const tr = document.createElement("tr");
    const tel = r.tel ? normalizePhone(r.tel) : "";
    const wa = tel ? `https://wa.me/${tel}` : "";
    const invites = [
      r.ami_nom ? `🤝 ${r.ami_nom}${r.ami_tel ? " (" + normalizePhone(r.ami_tel) + ")" : ""}` : "",
      r.inactif_nom ? `⛪ ${r.inactif_nom}${r.inactif_tel ? " (" + normalizePhone(r.inactif_tel) + ")" : ""}` : "",
    ].filter(Boolean);
    tr.innerHTML = `
      <td class="t-num">N°${r.num}</td>
      <td class="t-name">${escapeHTML(r.nom)}</td>
      <td><span class="badge statut">${r.statut === "ami" ? "🤝 Ami·e" : "⛪ Membre"}</span></td>
      <td><span class="badge ${r.presence === "present" ? "ok" : "ko"}">${r.presence === "present" ? "🎄 Présent·e" : "💔 Absent·e"}</span></td>
      <td>${r.people}</td>
      <td>${r.tel ? escapeHTML(r.tel) : "—"}</td>
      <td>${(r.branche || r.localite) ? escapeHTML([r.branche, r.localite].filter(Boolean).join(" · ")) : "—"}</td>
      <td>${invites.length ? escapeHTML(invites.join("  •  ")) : "—"}</td>
      <td>${r.note ? escapeHTML(r.note) : "—"}</td>
      <td>${fmtDate(r.at)}</td>
      <td><div class="row-actions">
        ${wa ? `<a class="icon-btn" title="Message WhatsApp" target="_blank" rel="noopener" href="${wa}">💬</a>` : ""}
        <button class="icon-btn" title="Supprimer" data-del-rsvp="${r.id}">🗑️</button>
      </div></td>`;
    tbody.appendChild(tr);
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
      <button class="icon-btn" title="Supprimer" data-del-gb="${g.id}">🗑️</button>`;
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
      <button class="icon-btn" title="Supprimer" data-del-wall="${p.id}">🗑️</button>`;
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
      <td><span class="badge statut">${i.type === "inactif" ? "⛪ Membre inactif·ve" : "🤝 Ami·e"}</span></td>
      <td>${i.tel ? escapeHTML(i.tel) : "—"}</td>
      <td>${i.par ? escapeHTML(i.par) : "—"}</td>
      <td>${fmtDate(i.at)}</td>
      <td><div class="row-actions">
        ${wa ? `<a class="icon-btn" title="Inviter par WhatsApp" target="_blank" rel="noopener" href="${wa}">💬</a>` : ""}
        <button class="icon-btn" title="Supprimer" data-del-inv="${i.id}">🗑️</button>
      </div></td>`;
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

/* ---------- Actions (suppression, copie) ---------- */
document.addEventListener("click", async (e) => {
  const delR = e.target.closest("[data-del-rsvp]");
  const delG = e.target.closest("[data-del-gb]");
  const delW = e.target.closest("[data-del-wall]");
  const delI = e.target.closest("[data-del-inv]");
  if (delR) {
    if (!confirm("Supprimer cette inscription ?")) return;
    await api(`/api/admin/rsvp?id=${delR.dataset.delRsvp}`, { method: "DELETE" });
    await refresh();
    toast("🗑️ Inscription supprimée");
  }
  if (delG) {
    if (!confirm("Supprimer ce vœu ?")) return;
    await api(`/api/admin/guestbook?id=${delG.dataset.delGb}`, { method: "DELETE" });
    await refresh();
    toast("🗑️ Vœu supprimé");
  }
  if (delW) {
    if (!confirm("Supprimer cette photo du mur ?")) return;
    await api(`/api/admin/photo-wall?id=${delW.dataset.delWall}`, { method: "DELETE" });
    await refresh();
    toast("🗑️ Photo supprimée");
  }
  if (delI) {
    if (!confirm("Retirer cette personne des invitations ?")) return;
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
