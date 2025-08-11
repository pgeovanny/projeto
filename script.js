/* ===== Config ===== */
const WEB_APP_URL = window.WEB_APP_URL || '';

/* ===== Helpers ===== */
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const show = el => el && el.classList.remove('is-hidden');
const hide = el => el && el.classList.add('is-hidden');

/* ===== Refs ===== */
const menuBtn = $('.menu-btn');
const menuPop = $('#menu-pop');
const welcome = $('#welcome');
const linksSection = $('#links');
const sections = {
  'leg-tjsp': $('#leg-tjsp'),
  'manual': $('#manual')
};
const order = ['leg-tjsp', 'manual'];

/* ===== Menu (ancorado ao header) ===== */
function openMenu(){
  const header = menuBtn.closest('.header');
  header.style.position = 'relative';
  menuPop.style.position = 'absolute';
  menuPop.style.right = '20px';
  menuPop.style.top = '110%';
  menuPop.style.zIndex = 99999;
  show(menuPop);
  menuBtn.setAttribute('aria-expanded','true');
}
function closeMenu(){
  hide(menuPop);
  menuBtn.setAttribute('aria-expanded','false');
}
menuBtn.addEventListener('click', e => {
  e.stopPropagation();
  if (menuPop.classList.contains('is-hidden')) openMenu(); else closeMenu();
});
document.addEventListener('click', e => {
  if (!menuPop.contains(e.target) && !menuBtn.contains(e.target)) closeMenu();
});
menuPop.addEventListener('click', e => e.stopPropagation());

/* ===== Router ===== */
function renderFromHash(){
  const id = (location.hash || '').replace('#','');

  if (!id || !sections[id]) {
    show(welcome);
    hide(linksSection);
    Object.values(sections).forEach(hide);
    closeMenu();
    return;
  }

  hide(welcome);
  show(linksSection);
  Object.values(sections).forEach(hide);
  show(sections[id]);

  // abre o acordeão automaticamente
  const head = sections[id].querySelector('[data-accordion]');
  const body = sections[id].querySelector('.linkcard-body');
  if (head && body) openAccordion(head, body);

  closeMenu();
  setupNavToolbar(id);
  sections[id].scrollIntoView({ behavior:'smooth', block:'start' });
}
window.addEventListener('hashchange', renderFromHash);

/* menu -> altera hash */
$$('#menu-pop .menu-item').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    location.hash = btn.getAttribute('data-open');
  });
});

/* ===== Toolbar nav ===== */
function setupNavToolbar(activeId){
  const idx = order.indexOf(activeId);
  const sec = sections[activeId];
  const back = sec.querySelector('[data-nav="back"]');
  const prev = sec.querySelector('[data-nav="prev"]');
  const next = sec.querySelector('[data-nav="next"]');

  if (back) back.onclick = () => location.hash = '';
  if (prev){
    if (idx > 0){ prev.disabled = false; prev.onclick = () => location.hash = order[idx-1]; }
    else { prev.disabled = true; prev.onclick = null; }
  }
  if (next){
    if (idx < order.length-1){ next.disabled = false; next.onclick = () => location.hash = order[idx+1]; }
    else { next.disabled = true; next.onclick = null; }
  }
}

/* ===== Acordeão ===== */
$$('[data-accordion]').forEach(btn=>{
  const card = btn.closest('.linkcard');
  const body = card.querySelector('.linkcard-body');
  btn.addEventListener('click', ()=>toggleAccordion(btn, body));
});
function toggleAccordion(btn, body){
  const willOpen = body.classList.contains('is-hidden');
  $$('.linkcard .linkcard-body').forEach(b=>hide(b));
  $$('.linkcard .chev').forEach(c=>c.style.transform='rotate(0deg)');
  if (willOpen) openAccordion(btn, body);
}
function openAccordion(btn, body){
  show(body);
  const chev = btn.querySelector('.chev');
  if (chev) chev.style.transform = 'rotate(180deg)';
}

/* ===== Sessão & Visita ===== */
function sessionId(){
  const k='pg_session_id';
  let v = localStorage.getItem(k);
  if(!v){ v = Math.random().toString(36).slice(2)+Date.now(); localStorage.setItem(k,v); }
  return v;
}
async function sendVisitOnce(){
  if (!WEB_APP_URL) return;
  const flag = 'pg_visit_sent';
  if (sessionStorage.getItem(flag)) return; // 1 por sessão do navegador
  sessionStorage.setItem(flag,'1');
  try{
    await fetch(WEB_APP_URL, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ type:'visit', session_id: sessionId(), user_agent: navigator.userAgent, referrer: document.referrer||'' })
    });
  }catch(_){}
}

/* ===== Renderização de materiais ===== */
function renderItems(sectionId, items){
  const article = sections[sectionId];
  if(!article) return;
  const body = article.querySelector('.linkcard-body');
  if(!body) return;
  body.innerHTML = '';

  items.forEach(it=>{
    const html = `
      <div class="item" data-item-id="${it.id}">
        <div class="item-name">${it.nome}</div>
        <div class="item-actions">
          <span class="likes" data-like-count>👍 0</span>
          <span class="dislikes" data-dislike-count>👎 0</span>
          <a class="sample-btn" data-amostra href="${it.amostra||'#'}" target="_blank" rel="noreferrer">Amostra</a>
          <a class="buy-btn" href="${it.compra||'#'}" target="_blank" rel="noreferrer">Comprar</a>
        </div>
      </div>`;
    body.insertAdjacentHTML('beforeend', html);
  });
}

async function loadMaterials(){
  let data = null;
  try{
    const res = await fetch(`${WEB_APP_URL}?type=materials`, { cache:'no-store' });
    data = await res.json(); // {ok:true, sections:{...}}
  }catch(_){}

  // Fallback se a API estiver indisponível
  if (!data || !data.ok || !data.sections) {
    data = {
      ok:true,
      sections:{
        'leg-tjsp': [
          { id:'res-850-2021', nome:'Resolução TJSP nº 850/2021',
            amostra:'https://drive.google.com/drive/u/3/folders/1r5YY6pF9e2iaw4EjexVEPNlyD19mLtEu', compra:'#' },
          { id:'res-963-2025', nome:'Resolução TJSP nº 963/2025 – Governança & eproc', amostra:'#', compra:'#' },
          { id:'lc-1111-2010', nome:'Lei Complementar nº 1.111/2010', amostra:'#', compra:'#' },
          { id:'ri-tjsp', nome:'Regimento Interno do Tribunal de Justiça',
            amostra:'https://drive.google.com/drive/u/3/folders/1nvgTdBw9NxKNNUQ5lMhFYBxHCxqQt5Wo', compra:'#' },
          { id:'normas-cgj', nome:'Normas da Corregedoria Geral da Justiça', amostra:'#', compra:'#' },
        ],
        'manual': [
          { id:'manual-completo', nome:'Manual do Aprovado – Versão Completa', amostra:'#', compra:'#' }
        ]
      }
    };
  }

  // Renderiza cada seção
  Object.entries(data.sections).forEach(([sec, items])=>{
    renderItems(sec, items || []);
  });

  // Liga eventos da amostra + voto e carrega contadores
  wireVotingFlow();
  await loadStatsForAll();

  // Se já houver hash, abre a seção; senão, fica no welcome
  renderFromHash();
}

async function loadStatsForAll(){
  const ids = $$('.item[data-item-id]').map(el=>el.getAttribute('data-item-id'));
  if (!ids.length || !WEB_APP_URL) return;
  try{
    const res = await fetch(`${WEB_APP_URL}?type=stats&ids=${encodeURIComponent(ids.join(','))}`, { cache:'no-store' });
    const payload = await res.json(); // { ok:true, data:{ id:{likes,dislikes} } }
    const map = (payload && payload.data) || {};
    $$('.item[data-item-id]').forEach(el=>{
      const id = el.getAttribute('data-item-id');
      const s = map[id] || {likes:0, dislikes:0};
      const likeEl = el.querySelector('[data-like-count]');
      const dislikeEl = el.querySelector('[data-dislike-count]');
      if (likeEl) likeEl.textContent = `👍 ${s.likes||0}`;
      if (dislikeEl) dislikeEl.textContent = `👎 ${s.dislikes||0}`;
    });
  }catch(_){}
}

/* ===== Votação pós-amostra ===== */
function wireVotingFlow(){
  const modal = $('#vote-modal');
  if (!modal) return;
  const form = $('#vote-form');
  const textarea = $('#vote-text');
  const btnCancel = $('#vote-cancel');

  let pendingId = null;
  let timer = null;

  const openModal = ()=> show(modal);
  const closeModal = ()=>{ hide(modal); hide(form); textarea.value=''; pendingId=null; };

  if (btnCancel) btnCancel.addEventListener('click', closeModal);
  modal.addEventListener('click', (e)=>{ if(e.target === modal) closeModal(); });

  // Clique em Amostra => abre link, depois pergunta
  $$('.item [data-amostra]').forEach(a=>{
    a.addEventListener('click', ()=>{
      const item = a.closest('.item');
      pendingId = item && item.getAttribute('data-item-id');

      // fallback de tempo (se abrir na mesma aba)
      clearTimeout(timer);
      timer = setTimeout(()=>{ if (pendingId) openModal(); }, 8000);

      // se abrir em nova aba e retornar
      try{ localStorage.setItem('pg_vote_pending', pendingId||''); }catch(_){}
    });
  });

  document.addEventListener('visibilitychange', ()=>{
    if (document.visibilityState === 'visible'){
      clearTimeout(timer);
      try{
        const id = localStorage.getItem('pg_vote_pending');
        if (id){ pendingId = id; localStorage.removeItem('pg_vote_pending'); openModal(); }
      }catch(_){}
    }
  });

  // Botões like/dislike -> mostra textarea e envia
  $$('#vote-modal [data-vote]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const vote = btn.getAttribute('data-vote'); // like | dislike
      show(form);
      textarea.placeholder = vote === 'like' ? 'O que você mais gostou?' : 'O que não curtiu no material?';

      form.onsubmit = async (e)=>{
        e.preventDefault();
        if (!WEB_APP_URL || !pendingId){ closeModal(); return; }
        try{
          await fetch(WEB_APP_URL, {
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body: JSON.stringify({
              type:'vote',
              id: pendingId,
              vote,
              feedback: textarea.value || '',
              session_id: sessionId(),
              user_agent: navigator.userAgent,
              referrer: document.referrer || ''
            })
          });
        }catch(_){}
        closeModal();
        loadStatsForAll();
      };
    });
  });
}

/* ===== Boot ===== */
window.addEventListener('load', async ()=>{
  await loadMaterials();   // monta itens (API -> fallback)
  await sendVisitOnce();   // registra visita (1 por sessão)
});
