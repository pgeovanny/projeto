/* ===== Config ===== */
const WEB_APP_URL = window.WEB_APP_URL || "";

/* ===== Helpers ===== */
const $  = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const show = (el) => el && el.classList.remove("is-hidden");
const hide = (el) => el && el.classList.add("is-hidden");

/* ===== Perf: cache local ===== */
const CACHE_KEY = "pg_materials_cache_v1";
const CACHE_TTL = 5 * 60 * 1000; // 5 min
const readCache = () => {
  try { const x = JSON.parse(localStorage.getItem(CACHE_KEY)||"null");
        if (!x || Date.now() - x.ts > CACHE_TTL) return null;
        return x.data; } catch { return null; }
};
const writeCache = (data) => { try { localStorage.setItem(CACHE_KEY, JSON.stringify({ts:Date.now(), data})); } catch {} };

/* ===== API helpers (sem preflight) ===== */
async function apiGet(q=""){ const u = q? `${WEB_APP_URL}?${q}`: WEB_APP_URL; const r = await fetch(u,{cache:"no-store"}); return r.json(); }
async function apiPost(body){ const r = await fetch(WEB_APP_URL,{method:"POST", body: JSON.stringify(body)}); try{return await r.json();}catch{return {ok:true}} }

/* ===== UI refs ===== */
const menuBtn=$(".menu-btn"), menuPop=$("#menu-pop");
const welcome=$("#welcome"), links=$("#links");
const sections={ "leg-tjsp": $("#leg-tjsp"), "manual": $("#manual") };
const order = ["leg-tjsp","manual"];

/* ===== Menu ===== */
function openMenu(){ const hdr=menuBtn.closest(".header"); hdr.style.position="relative";
  Object.assign(menuPop.style,{position:"absolute",right:"0",top:"110%",zIndex:10002}); show(menuPop);
  menuBtn.setAttribute("aria-expanded","true"); }
function closeMenu(){ hide(menuPop); menuBtn.setAttribute("aria-expanded","false"); }
menuBtn.addEventListener("click",(e)=>{e.stopPropagation(); menuPop.classList.contains("is-hidden")?openMenu():closeMenu();});
document.addEventListener("click",(e)=>{ if(!menuPop.contains(e.target)&&!menuBtn.contains(e.target)) closeMenu(); });

/* ===== Router ===== */
function renderFromHash(){
  const id=(location.hash||"").replace("#","");
  if(!id||!sections[id]){ show(welcome); hide(links); Object.values(sections).forEach(hide); closeMenu(); return; }
  hide(welcome); show(links); Object.values(sections).forEach(hide); show(sections[id]); closeMenu();
  const head=sections[id].querySelector("[data-accordion]"); const body=sections[id].querySelector(".linkcard-body");
  if(head&&body) openAccordion(head,body);
  setupNav(id);
}
window.addEventListener("hashchange", renderFromHash);
$$("#menu-pop .menu-item").forEach(b=> b.addEventListener("click",()=> location.hash = b.dataset.open));

/* ===== Toolbar ===== */
function setupNav(active){ const idx=order.indexOf(active), sec=sections[active];
  const back=sec.querySelector('[data-nav="back"]'), prev=sec.querySelector('[data-nav="prev"]'), next=sec.querySelector('[data-nav="next"]');
  if(back) back.onclick=()=> location.hash="";
  if(prev){ if(idx>0){prev.disabled=false;prev.onclick=()=>location.hash=order[idx-1];} else {prev.disabled=true;prev.onclick=null;} }
  if(next){ if(idx<order.length-1){next.disabled=false;next.onclick=()=>location.hash=order[idx+1];} else {next.disabled=true;next.onclick=null;} }
}

/* ===== Accordion ===== */
$$("[data-accordion]").forEach(btn=>{
  const body=btn.closest(".linkcard").querySelector(".linkcard-body");
  btn.addEventListener("click", ()=> toggleAcc(btn,body));
});
function toggleAcc(btn,body){ const willOpen = body.classList.contains("is-hidden");
  $$(".linkcard .linkcard-body").forEach(b=> hide(b));
  $$(".linkcard .chev").forEach(c=> c.style.transform="rotate(0deg)");
  if (willOpen) openAccordion(btn, body);
}
function openAccordion(btn, body){ show(body); const c=btn.querySelector(".chev"); if(c) c.style.transform="rotate(180deg)"; }

/* ===== Sessão & visita ===== */
function sessionId(){ const k="pg_session_id"; let v=localStorage.getItem(k);
  if(!v){ v=Math.random().toString(36).slice(2)+Date.now(); localStorage.setItem(k,v); } return v; }
async function sendVisit(){ try{ await apiPost({type:"visit", session_id:sessionId(), user_agent:navigator.userAgent, referrer:document.referrer||""}); }catch{} }

/* ===== Skeleton Loader ===== */
function showSkeleton(sectionEl, rows=4){
  const body = sectionEl.querySelector(".linkcard-body");
  body.innerHTML = `<div class="pro-table">
    <div class="pro-table__head">
      <span class="col--name">Material</span>
      <span class="col--stats">Avaliações</span>
      <span class="col--actions">Ações</span>
    </div>
    <div class="pro-table__body">
      ${Array.from({length:rows}).map(()=>`
        <div class="pro-table__row skeleton">
          <div class="col--name"><span class="sk"></span></div>
          <div class="col--stats"><span class="sk sk-badge"></span></div>
          <div class="col--actions"><span class="sk sk-btn"></span><span class="sk sk-btn"></span></div>
        </div>`).join("")}
    </div>
  </div>`;
}

/* ===== Renderizador em tabela profissional ===== */
function renderTable(sectionId, items){
  const body = sections[sectionId].querySelector(".linkcard-body");
  body.innerHTML = `<div class="pro-table">
    <div class="pro-table__head">
      <span class="col--name">Material</span>
      <span class="col--stats">👍 / 👎</span>
      <span class="col--actions">Ações</span>
    </div>
    <div class="pro-table__body"></div>
  </div>`;
  const tbody = body.querySelector(".pro-table__body");
  const frag = document.createDocumentFragment();

  items.forEach(it=>{
    const row = document.createElement("div");
    row.className = "pro-table__row";
    row.setAttribute("data-item-id", it.id);
    row.innerHTML = `
      <div class="col--name">
        <div class="title">${it.nome}</div>
        ${it.descricao ? `<div class="desc">${it.descricao}</div>` : ""}
      </div>
      <div class="col--stats">
        <span class="badge" data-like-count>0</span>
        <span class="badge neg" data-dislike-count>0</span>
      </div>
      <div class="col--actions">
        <a class="btn ghost" data-amostra href="${it.amostra||'#'}" target="_blank" rel="noreferrer">Amostra</a>
        <a class="btn grad"  href="${it.compra||'#'}"  target="_blank" rel="noreferrer">Comprar</a>
      </div>`;
    frag.appendChild(row);
  });

  tbody.appendChild(frag);
}

/* ===== Carregamento rápido: cache -> skeleton -> rede ===== */
async function loadMaterials(){
  // 1) instantâneo: cache local (se existir)
  const cached = readCache();
  if (cached && cached.sections) {
    Object.keys(sections).forEach(sec => renderTable(sec, cached.sections[sec] || []));
    wireVoting(); refreshStats(); renderFromHash();
  } else {
    // skeleton enquanto busca
    Object.values(sections).forEach(secEl => showSkeleton(secEl));
  }

  // 2) rede: busca com timeout curto (fail-fast)
  let net = null;
  try{
    const controller = new AbortController();
    const t = setTimeout(()=> controller.abort(), 6000); // 6s
    const res = await fetch(`${WEB_APP_URL}?type=materials`, { cache:"no-store", signal: controller.signal });
    clearTimeout(t);
    net = await res.json();
  }catch(e){ console.warn("[PG] materials network slow/fail", e); }

  if (net && net.ok && net.sections){
    writeCache(net);
    Object.keys(sections).forEach(sec => renderTable(sec, net.sections[sec] || []));
    wireVoting(); refreshStats(); renderFromHash();
  }
}

/* ===== Stats ===== */
async function refreshStats(){
  const ids = $$(".pro-table__row[data-item-id]").map(el=>el.getAttribute("data-item-id"));
  if(!ids.length) return;
  try{
    const {data} = await apiGet(`type=stats&ids=${encodeURIComponent(ids.join(","))}`);
    $$(".pro-table__row[data-item-id]").forEach(el=>{
      const id = el.getAttribute("data-item-id");
      const s = (data && data[id]) || {likes:0, dislikes:0};
      const likeEl = el.querySelector("[data-like-count]");
      const disEl  = el.querySelector("[data-dislike-count]");
      if (likeEl) likeEl.textContent = s.likes || 0;
      if (disEl)  disEl.textContent  = s.dislikes || 0;
    });
  }catch(e){ console.warn("[PG] stats fail", e); }
}

/* ===== Votação pós-amostra ===== */
function wireVoting(){
  const modal = $("#vote-modal"), form = $("#vote-form"), txt = $("#vote-text"), cancel = $("#vote-cancel");
  if(!modal) return;
  let pending=null, timer=null;
  const open=()=>show(modal), close=()=>{ hide(modal); hide(form); txt.value=""; pending=null; };
  if(cancel) cancel.onclick=close;
  modal.addEventListener("click",e=>{ if(e.target===modal) close(); });

  $$('.pro-table__row [data-amostra]').forEach(a=>{
    a.addEventListener("click", ()=>{
      pending = a.closest(".pro-table__row")?.getAttribute("data-item-id") || null;
      clearTimeout(timer); timer = setTimeout(()=> { if(pending) open(); }, 8000);
      try{ localStorage.setItem("pg_vote_pending", pending||""); }catch{}
    });
  });

  document.addEventListener("visibilitychange", ()=>{
    if(document.visibilityState==="visible"){
      clearTimeout(timer);
      try{
        const id = localStorage.getItem("pg_vote_pending");
        if(id){ pending=id; localStorage.removeItem("pg_vote_pending"); open(); }
      }catch{}
    }
  });

  $$("#vote-modal [data-vote]").forEach(btn=>{
    btn.onclick = ()=>{
      const vote = btn.getAttribute("data-vote");
      show(form); txt.placeholder = vote==="like" ? "O que você mais gostou?" : "O que não curtiu no material?";
      form.onsubmit = async (e)=>{
        e.preventDefault(); if(!pending) return close();
        try{
          await apiPost({ type:"vote", id:pending, vote, feedback: txt.value||"", session_id: sessionId(), user_agent: navigator.userAgent, referrer: document.referrer||"" });
        }catch(e){ console.warn("[PG] vote fail", e); }
        close(); refreshStats();
      };
    };
  });
}

/* ===== Boot ===== */
window.addEventListener("load", async ()=>{
  await loadMaterials();
  await sendVisit();
});
