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

// ===== Estado inicial =====
hide(menuPop);
hide(linksSection);
Object.values(sections).forEach(hide);

// ===== Menu ancorado ao header (sempre na frente) =====
function openMenu(){
  const header = menuBtn.closest('.header'); // pai comum
  header.style.position = 'relative';        // garante contexto
  menuPop.style.position = 'absolute';
  menuPop.style.right = '0';
  menuPop.style.top = '110%';
  menuPop.style.zIndex = 10002;              // acima do conteúdo
  show(menuPop);
  menuBtn.setAttribute('aria-expanded','true');
}
function closeMenu(){
  hide(menuPop);
  menuBtn.setAttribute('aria-expanded','false');
}
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
window.addEventListener('load', () => { renderFromHash(); sendVisit(); loadAllStats(); });

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

// ===== Integração Google Apps Script (opcional) =====
const WEB_APP_URL = window.WEB_APP_URL || null;

async function sendVisit(){
  if (!WEB_APP_URL) return;
  try{ await fetch(`${WEB_APP_URL}?type=visit`, { method:'POST', mode:'cors' }); }catch(e){}
}

async function loadAllStats(){
  if (!WEB_APP_URL) return;
  const items = document.querySelectorAll('.item[data-item-id]');
  if (!items.length) return;
  const ids = Array.from(items).map(i => i.getAttribute('data-item-id'));
  try{
    const res = await fetch(`${WEB_APP_URL}?type=stats&ids=${encodeURIComponent(ids.join(','))}`, { method:'GET', mode:'cors' });
    const data = await res.json(); // { id: {likes, dislikes} }
    items.forEach(i => {
      const id = i.getAttribute('data-item-id');
      const s = data[id] || {likes:0, dislikes:0};
      const likeEl = i.querySelector('[data-like-count]');
      const dislikeEl = i.querySelector('[data-dislike-count]');
      if (likeEl) likeEl.textContent = `👍 ${s.likes||0}`;
      if (dislikeEl) dislikeEl.textContent = `👎 ${s.dislikes||0}`;
    });
  }catch(e){}
}

async function sendVote({ id, vote, feedback }){
  if (!WEB_APP_URL) return null;
  try{
    const res = await fetch(`${WEB_APP_URL}?type=vote`, {
      method:'POST', mode:'cors',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ id, vote, feedback })
    });
    return await res.json();
  }catch(e){ return null; }
}

// ===== Modal de votação: APÓS ver a amostra =====
const modal = document.getElementById('vote-modal');
let voteForm, voteTextarea, voteCancel;
let pendingVoteId = null;
let voteTimer = null;

if (modal){
  voteForm = document.getElementById('vote-form');
  voteTextarea = document.getElementById('vote-text');
  voteCancel = document.getElementById('vote-cancel');

  const openModal = ()=>{
    show(modal);
    // escolha like/dislike
    modal.querySelectorAll('[data-vote]').forEach(b=>{
      b.onclick = ()=>{
        const v = b.getAttribute('data-vote'); // like | dislike
        show(voteForm);
        voteTextarea.placeholder = v === 'like' ? 'O que você mais gostou?' : 'O que não curtiu no material?';
        voteForm.onsubmit = async (e)=>{
          e.preventDefault();
          const fb = (voteTextarea.value || '').trim();
          await sendVote({ id: pendingVoteId, vote: v, feedback: fb });
          closeModal();
          loadAllStats();
        };
      };
    });
  };
  const closeModal = ()=>{
    hide(modal); hide(voteForm); voteTextarea.value='';
    pendingVoteId = null;
  };
  if (voteCancel) voteCancel.addEventListener('click', closeModal);

  // intercepta clique em Amostra APENAS para guardar o id e deixar abrir o link
  document.querySelectorAll('[data-amostra]').forEach(a=>{
    a.addEventListener('click', ()=>{
      const item = a.closest('.item');
      pendingVoteId = item ? item.getAttribute('data-item-id') : null;
      // fallback: se a pessoa não trocar de aba, abre modal depois de X segundos
      clearTimeout(voteTimer);
      voteTimer = setTimeout(()=>{
        if (pendingVoteId) openModal();
      }, 8000); // 8s
      // sinaliza no storage para abrir quando retornar ao site (se abriu em nova aba)
      try{
        localStorage.setItem('pg_pending_vote', pendingVoteId || '');
        localStorage.setItem('pg_pending_time', String(Date.now()));
      }catch(e){}
    });
  });

  // quando o usuário VOLTA para a aba -> abre o modal
  document.addEventListener('visibilitychange', ()=>{
    if (document.visibilityState === 'visible'){
      clearTimeout(voteTimer);
      try{
        const id = localStorage.getItem('pg_pending_vote');
        if (id){
          pendingVoteId = id;
          localStorage.removeItem('pg_pending_vote');
          localStorage.removeItem('pg_pending_time');
          openModal();
        }
      }catch(e){}
    }
  });

  // fechar clicando fora
  modal.addEventListener('click', (e)=>{ if (e.target === modal) { pendingVoteId=null; hide(modal); } });
}
