/* ===== Config ===== */
const WEB_APP_URL = window.WEB_APP_URL || "";

/* ===== Helpers ===== */
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const show = (el) => el && el.classList.remove("is-hidden");
const hide = (el) => el && el.classList.add("is-hidden");

/* ===== API helpers (sem preflight) ===== */
async function apiGet(params = "") {
  const url = params ? `${WEB_APP_URL}?${params}` : WEB_APP_URL;
  const res = await fetch(url, { cache: "no-store" });
  return res.json();
}
async function apiPost(payload) {
  // sem headers -> Content-Type vira text/plain (não tem preflight)
  const res = await fetch(WEB_APP_URL, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  // Apps Script devolve JSON; se a resposta for opaque, só seguimos
  try { return await res.json(); } catch { return { ok: true }; }
}

/* ===== Refs ===== */
const menuBtn = $(".menu-btn");
const menuPop = $("#menu-pop");
const welcome = $("#welcome");
const links = $("#links");
const sections = { "leg-tjsp": $("#leg-tjsp"), manual: $("#manual") };
const order = ["leg-tjsp", "manual"];

/* ===== Menu ===== */
function openMenu() {
  const header = menuBtn.closest(".header");
  header.style.position = "relative";
  Object.assign(menuPop.style, {
    position: "absolute",
    right: "0",
    top: "110%",
    zIndex: 10002,
  });
  show(menuPop);
  menuBtn.setAttribute("aria-expanded", "true");
}
function closeMenu() {
  hide(menuPop);
  menuBtn.setAttribute("aria-expanded", "false");
}
menuBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  menuPop.classList.contains("is-hidden") ? openMenu() : closeMenu();
});
document.addEventListener("click", (e) => {
  if (!menuPop.contains(e.target) && !menuBtn.contains(e.target)) closeMenu();
});
menuPop.addEventListener("click", (e) => e.stopPropagation());

/* ===== Router ===== */
function renderFromHash() {
  const id = (location.hash || "").replace("#", "");
  if (!id || !sections[id]) {
    show(welcome);
    hide(links);
    Object.values(sections).forEach(hide);
    closeMenu();
    return;
  }
  hide(welcome);
  show(links);
  Object.values(sections).forEach(hide);
  show(sections[id]);
  closeMenu();

  const head = sections[id].querySelector("[data-accordion]");
  const body = sections[id].querySelector(".linkcard-body");
  if (head && body) openAccordion(head, body);

  setupNav(id);
  sections[id].scrollIntoView({ behavior: "smooth", block: "start" });
}
window.addEventListener("hashchange", renderFromHash);
$$("#menu-pop .menu-item").forEach((b) =>
  b.addEventListener("click", () => (location.hash = b.dataset.open))
);

/* ===== Toolbar ===== */
function setupNav(activeId) {
  const idx = order.indexOf(activeId);
  const sec = sections[activeId];
  const back = sec.querySelector('[data-nav="back"]');
  const prev = sec.querySelector('[data-nav="prev"]');
  const next = sec.querySelector('[data-nav="next"]');

  if (back) back.onclick = () => (location.hash = "");
  if (prev) {
    if (idx > 0) {
      prev.disabled = false;
      prev.onclick = () => (location.hash = order[idx - 1]);
    } else {
      prev.disabled = true;
      prev.onclick = null;
    }
  }
  if (next) {
    if (idx < order.length - 1) {
      next.disabled = false;
      next.onclick = () => (location.hash = order[idx + 1]);
    } else {
      next.disabled = true;
      next.onclick = null;
    }
  }
}

/* ===== Acordeão ===== */
$$("[data-accordion]").forEach((btn) => {
  const body = btn.closest(".linkcard").querySelector(".linkcard-body");
  btn.addEventListener("click", () => toggleAcc(btn, body));
});
function toggleAcc(btn, body) {
  const willOpen = body.classList.contains("is-hidden");
  $$(".linkcard .linkcard-body").forEach((b) => hide(b));
  $$(".linkcard .chev").forEach((c) => (c.style.transform = "rotate(0deg)"));
  if (willOpen) openAccordion(btn, body);
}
function openAccordion(btn, body) {
  show(body);
  const c = btn.querySelector(".chev");
  if (c) c.style.transform = "rotate(180deg)";
}

/* ===== Sessão & Visitas ===== */
function sessionId() {
  const k = "pg_session_id";
  let v = localStorage.getItem(k);
  if (!v) {
    v = Math.random().toString(36).slice(2) + Date.now();
    localStorage.setItem(k, v);
  }
  return v;
}
async function sendVisit() {
  if (!WEB_APP_URL) return;
  try {
    await apiPost({
      type: "visit",
      session_id: sessionId(),
      user_agent: navigator.userAgent,
      referrer: document.referrer || "",
    });
  } catch (e) {
    console.error("[PG] visit error:", e);
  }
}

/* ===== Materiais (da planilha) ===== */
async function loadMaterials() {
  let data = null;
  try {
    data = await apiGet("type=materials");
  } catch (e) {
    console.error("[PG] materials error:", e);
  }

  if (!data || !data.ok || !data.sections) {
    console.warn("[PG] API materials indisponível (ver Code.gs / implantação)");
    data = { ok: true, sections: {} };
  }

  renderSection("leg-tjsp", data.sections["leg-tjsp"] || []);
  renderSection("manual", data.sections["manual"] || []);

  wireVoting();
  await refreshStats();
  renderFromHash();
}

function renderSection(secId, items) {
  const body = sections[secId].querySelector(".linkcard-body");
  body.innerHTML = "";

  items.forEach((it) => {
    body.insertAdjacentHTML(
      "beforeend",
      `
      <div class="item" data-item-id="${it.id}">
        <div class="item-title">${it.nome}</div>
        <div class="item-actions">
          <span class="likes" data-like-count>👍 0</span>
          <span class="dislikes" data-dislike-count>👎 0</span>
          <a class="btn ghost" data-amostra href="${it.amostra || "#"}" target="_blank" rel="noreferrer">Amostra</a>
          <a class="btn grad"  href="${it.compra || "#"}"  target="_blank" rel="noreferrer">Comprar</a>
        </div>
      </div>`
    );
  });
}

/* ===== Likes visíveis ===== */
async function refreshStats() {
  const ids = $$(".item[data-item-id]").map((el) => el.getAttribute("data-item-id"));
  if (!ids.length || !WEB_APP_URL) return;

  try {
    const payload = await apiGet(`type=stats&ids=${encodeURIComponent(ids.join(","))}`);
    const map = (payload && payload.data) || {};
    $$(".item[data-item-id]").forEach((el) => {
      const id = el.getAttribute("data-item-id");
      const s = map[id] || { likes: 0, dislikes: 0 };
      const likeEl = el.querySelector("[data-like-count]");
      const disEl = el.querySelector("[data-dislike-count]");
      if (likeEl) likeEl.textContent = `👍 ${s.likes || 0}`;
      if (disEl) disEl.textContent = `👎 ${s.dislikes || 0}`;
    });
  } catch (e) {
    console.error("[PG] stats error:", e);
  }
}

/* ===== Votação após ver a amostra ===== */
function wireVoting() {
  const modal = $("#vote-modal");
  const form = $("#vote-form");
  const txt = $("#vote-text");
  const cancel = $("#vote-cancel");
  if (!modal) return;

  let pending = null;
  let timer = null;

  const open = () => show(modal);
  const close = () => {
    hide(modal);
    hide(form);
    txt.value = "";
    pending = null;
  };
  if (cancel) cancel.onclick = close;
  modal.addEventListener("click", (e) => {
    if (e.target === modal) close();
  });

  // clica na amostra -> abre link e quando voltar pede voto
  $$('.item [data-amostra]').forEach((a) => {
    a.addEventListener("click", () => {
      pending = a.closest(".item")?.getAttribute("data-item-id") || null;
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (pending) open();
      }, 8000);
      try {
        localStorage.setItem("pg_vote_pending", pending || "");
      } catch {}
    });
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      clearTimeout(timer);
      try {
        const id = localStorage.getItem("pg_vote_pending");
        if (id) {
          pending = id;
          localStorage.removeItem("pg_vote_pending");
          open();
        }
      } catch {}
    }
  });

  // like/dislike -> mostra textarea & envia
  $$("#vote-modal [data-vote]").forEach((btn) => {
    btn.onclick = () => {
      const vote = btn.getAttribute("data-vote"); // like | dislike
      show(form);
      txt.placeholder = vote === "like" ? "O que você mais gostou?" : "O que não curtiu no material?";
      form.onsubmit = async (e) => {
        e.preventDefault();
        if (!pending || !WEB_APP_URL) return close();
        try {
          await apiPost({
            type: "vote",
            id: pending,
            vote,
            feedback: txt.value || "",
            session_id: sessionId(),
            user_agent: navigator.userAgent,
            referrer: document.referrer || "",
          });
        } catch (err) {
          console.error("[PG] vote error:", err);
        }
        close();
        await refreshStats();
      };
    };
  });
}

/* ===== Boot ===== */
window.addEventListener("load", async () => {
  await loadMaterials(); // planilha -> UI
  await sendVisit();     // registra visita (POST sem preflight)
});
