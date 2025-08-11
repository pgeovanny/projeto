// ===== Helpers =====
const show = el => el.classList.remove('is-hidden');
const hide = el => el.classList.add('is-hidden');

// ===== Refs =====
const menuBtn = document.querySelector('.menu-btn');
const menuPop = document.getElementById('menu-pop');
const linksSection = document.getElementById('links');
const welcome = document.getElementById('welcome');

const sections = {
  'leg-tjsp': document.getElementById('leg-tjsp'),
  'manual': document.getElementById('manual'),
};
const order = ['leg-tjsp', 'manual'];

// ===== API base =====
const WEB_APP_URL = window.WEB_APP_URL || '';

// ===== Estado inicial =====
hide(menuPop);
hide(linksSection);
Object.values(sections).forEach(hide);

// ===== Menu (ancorado ao header; sempre na frente) =====
function openMenu(){
  const header = menuBtn.closest('.header');
  header.style.position = 'relative';
  menuPop.style.position = 'absolute';
  menuPop.style.right = '0';
  menuPop.style.top = '110%';
  menuPop.style.zIndex = 10002;
  show(menuPop);
  menuBtn.setAttribute('aria-expanded','true');
}
function closeMenu(){ hide(menuPop); menuBtn.setAttribute('aria-expanded','false'); }
menuBtn.addEventListener('click', () => {
  if (menuPop.classList.contains('is-hidden')) openMenu(); else closeMenu();
});
document.addEventListener('click', (e) => {
  if (!menuPop.contains(e.target) && !menuBtn.contains(e.target)) closeMenu();
});

// ===== Router (hash) =====
function renderFromHash() {
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

  // abre acordeão da seção visível
  const head = sections[id].querySelector('[data-accordion]');
  const body = sections[id].querySelector('.linkcard-body');
  if (head && body) openAccordion(head, body);

  closeMenu();
  setupNavToolbar(id);
  sections[id].scrollIntoView({ behavior:'smooth', block:'start' });
}
window.addEventListener('hashchange', renderFromHash);

// Menu items -> abre seção via hash
menuPop.querySelectorAll('.menu-item').forEach(btn => {
  btn.addEventListener('click', () => { location.hash = btn.getAttribute('data-open'); });
});

// ===== Toolbar navegação =====
function setupNavToolbar(activeId){
  const idx = order.indexOf(activeId);
  const sec = sections[activeId];
  const backBtn = sec.querySelector('[data-nav="back"]');
  const prevBtn = sec.querySelector('[data-nav="prev"]');
  const nextBtn = sec.querySelector('[data-nav="next"]');

  if (backBtn) backBtn.onclick = () => { location.hash = ''; };
  if (prevBtn){
    if (idx > 0){ prevBtn.removeAttribute('disabled'); prevBtn.onclick = () => { location.hash = order[idx - 1]; }; }
    else { prevBtn.setAttribute('disabled',''); prevBtn.onclick = null; }
  }
  if (nextBtn){
    if (idx < order.length - 1){ nextBtn.removeAttribute('disabled'); nextBtn.onclick = () => { location.hash = order[idx + 1]; }; }
    else { nextBtn.setAttribute('disabled',''); nextBtn.onclick = null; }
  }
}

// ===== Acordeão =====
document.querySelectorAll('[data-accordion]').forEach(btn => {
  const card = btn.closest('.linkcard');
  const body = card.querySelector('.linkcard-body');
  btn.addEventListener('click', () => toggleAccordion(btn, body));
});
function toggleAccordion(btn, body){
  const willOpen = body.classList.contains('is-hidden');
  document.querySelectorAll('.linkcard .linkcard-body').forEach(b => hide(b));
  document.querySelectorAll('.linkcard .chev').forEach(c => c.style.transform = 'rotate(0deg)');
  if (willOpen) openAccordion(btn, body);
}
function openAccordion(btn, body){
  show(body);
  const chev = btn.querySelector('.chev');
  if (chev) chev.style.transform = 'rotate(180deg)';
}

// ===== Sessão & Visitas =====
function getSessionId(){
  const k='pg_session_id';
  let v = localStorage.getItem(k);
  if(!v){ v = Math.random().toString(36).slice(2) + Date.now(); localStorage.setItem(k, v); }
  return v;
}
async function sendVisit(){
  if (!WEB_APP_URL) return;
  try{
    await fetch(WEB_APP_URL, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ type:'visit', session_id:getSessionId(), referrer:document.referrer||'', user_agent:navigator.userAgent })
    });
  }catch(e){}
}

// ===== Carregar materiais da planilha =====
async function loadMaterials(){
  if (!WEB_APP_URL) return;

  try{
    const res = await fetch(`${WEB_APP_URL}?type=materials`);
    const json = await res.json(); // { ok, sections:{leg-tjsp:[...], manual:[...]} }
    if(!json.ok || !json.sections) return;

    // monta cada seção
    Object.entries(json.sections).forEach(([secId, items])=>{
      const article = document.getElementById(secId);
      if(!article) return;
      const body = article.querySelector('.linkcard-body');
      if(!body) return;
      body.innerHTML = '';
      items.forEach(it=>{
        body.insertAdjacentHTML('beforeend', `
          <div class="item" data-item-id="${it.id}">
            <div class="item-title">${it.nome}</div>
            <div class="item-actions">
              <span class="likes" data-like-count>👍 0</span>
              <span class="dislikes" data-dislike-count>👎 0</span>
              <a class="btn ghost" data-amostra href="${it.amostra||'#'}" target="_blank" rel="noreferrer">Amostra</a>
              <a class="btn grad"  data-compra  href="${it.compra||'#'}"  target="_blank" rel="noreferrer">Comprar</a>
            </div>
          </div>
        `);
      });
    });

    // liga handlers e carrega contadores
    wireSampleAndVoting();
    await loadStatsForAll();

  }catch(e){
    // silencioso para não quebrar a UI
  }
}

async function loadStatsForAll(){
  if (!WEB_APP_URL) return;
  const ids = Array.from(document.querySelectorAll('.item[data-item-id]')).map(i=>i.getAttribute('data-item-id'));
  if(!ids.length) return;
  try{
    const res = await fetch(`${WEB_APP_URL}?type=stats&ids=${encodeURIComponent(ids.join(','))}`);
    const payload = await res.json(); // { ok:true, data:{id:{likes,dislikes}} }
    const data = payload && payload.data || {};
    document.querySelectorAll('.item[data-item-id]').forEach(el=>{
      const id = el.getAttribute('data-item-id');
      const s = data[id] || {likes:0, dislikes:0};
      const likeEl = el.querySelector('[data-like-count]');
      const dislikeEl = el.querySelector('[data-dislike-count]');
      if (likeEl) likeEl.textContent = `👍 ${s.likes||0}`;
      if (dislikeEl) dislikeEl.textContent = `👎 ${s.dislikes||0}`;
    });
  }catch(e){}
}

// ===== Votação APÓS ver a amostra =====
function wireSampleAndVoting(){
  const modal = document.getElementById('vote-modal');
  if(!modal) return;

  const form = document.getElementById('vote-form');
  const textarea = document.getElementById('vote-text');
  const btnCancel = document.getElementById('vote-cancel');
  let pendingId = null, timer = null;

  const openModal = ()=> show(modal);
  const closeModal = ()=>{ hide(modal); hide(form); textarea.value=''; pendingId=null; };
  if (btnCancel) btnCancel.addEventListener('click', closeModal);

  modal.querySelectorAll('[data-vote]').forEach(b=>{
    b.onclick = ()=>{
      const vote = b.getAttribute('data-vote'); // like|dislike
      show(form);
      textarea.placeholder = vote === 'like' ? 'O que você mais gostou?' : 'O que não curtiu no material?';
      form.onsubmit = async (e)=>{
        e.preventDefault();
        if (!WEB_APP_URL || !pendingId) { closeModal(); return; }
        try{
          await fetch(WEB_APP_URL, {
            method:'POST', headers:{'Content-Type':'application/json'},
            body: JSON.stringify({
              type:'vote', id: pendingId, vote,
              feedback: textarea.value||'',
              session_id: getSessionId(),
              referrer: document.referrer||'',
              user_agent: navigator.userAgent
            })
          });
        }catch(e){}
        closeModal();
        loadStatsForAll();
      };
    };
  });

  // Amostra -> abre link, e só depois pede o voto
  document.querySelectorAll('[data-amostra]').forEach(a=>{
    a.addEventListener('click', ()=>{
      const item = a.closest('.item'); pendingId = item && item.getAttribute('data-item-id');
      // fallback de tempo (se abriu na mesma aba)
      clearTimeout(timer);
      timer = setTimeout(()=> { if (pendingId) openModal(); }, 8000);
      // quando voltar para a aba
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

  modal.addEventListener('click', (e)=>{ if(e.target===modal) closeModal(); });
}

// ===== Boot =====
window.addEventListener('load', async () => {
  await loadMaterials();
  await sendVisit();
  renderFromHash(); // aplica o hash atual se houver
});
