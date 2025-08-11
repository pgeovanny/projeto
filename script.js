// ===== Helpers visibilidade =====
const show = el => el.classList.remove('is-hidden');
const hide = el => el.classList.add('is-hidden');

// ===== Refs principais =====
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

// ===== Menu =====
menuBtn.addEventListener('click', () => {
  if (menuPop.classList.contains('is-hidden')) {
    show(menuPop); menuBtn.setAttribute('aria-expanded','true');
  } else {
    hide(menuPop); menuBtn.setAttribute('aria-expanded','false');
  }
});
document.addEventListener('click', (e) => {
  if (!menuPop.contains(e.target) && !menuBtn.contains(e.target)) { hide(menuPop); menuBtn.setAttribute('aria-expanded','false'); }
});
menuPop.querySelectorAll('.menu-item').forEach(btn => {
  btn.addEventListener('click', () => { location.hash = btn.getAttribute('data-open'); });
});

// ===== Router (hash) =====
function renderFromHash() {
  const id = (location.hash || '').replace('#','');
  if (!id || !sections[id]) {
    show(welcome); hide(linksSection); Object.values(sections).forEach(hide); hide(menuPop); menuBtn.setAttribute('aria-expanded','false'); return;
  }
  hide(welcome); show(linksSection); Object.values(sections).forEach(hide); show(sections[id]);
  const head = sections[id].querySelector('[data-accordion]');
  const body = sections[id].querySelector('.linkcard-body');
  openAccordion(head, body);
  hide(menuPop); menuBtn.setAttribute('aria-expanded','false');
  setupNavToolbar(id);
  sections[id].scrollIntoView({ behavior:'smooth', block:'start' });
}
window.addEventListener('hashchange', renderFromHash);
window.addEventListener('load', () => { renderFromHash(); sendVisit(); loadAllStats(); });

// ===== Toolbar navegação =====
function setupNavToolbar(activeId){
  const idx = order.indexOf(activeId), sec = sections[activeId];
  const backBtn = sec.querySelector('[data-nav="back"]');
  const prevBtn = sec.querySelector('[data-nav="prev"]');
  const nextBtn = sec.querySelector('[data-nav="next"]');
  if (backBtn) backBtn.onclick = () => { location.hash = ''; };
  if (prevBtn){ if (idx>0){ prevBtn.removeAttribute('disabled'); prevBtn.onclick = () => location.hash = order[idx-1]; } else { prevBtn.setAttribute('disabled',''); prevBtn.onclick = null; } }
  if (nextBtn){ if (idx<order.length-1){ nextBtn.removeAttribute('disabled'); nextBtn.onclick = () => location.hash = order[idx+1]; } else { nextBtn.setAttribute('disabled',''); nextBtn.onclick = null; } }
}

// ===== Acordeão =====
document.querySelectorAll('[data-accordion]').forEach(btn => {
  const card = btn.closest('.linkcard'); const body = card.querySelector('.linkcard-body');
  btn.addEventListener('click', () => toggleAccordion(btn, body));
});
function toggleAccordion(btn, body){
  const willOpen = body.classList.contains('is-hidden');
  document.querySelectorAll('.linkcard .linkcard-body').forEach(b => hide(b));
  document.querySelectorAll('.linkcard .chev').forEach(c => c.style.transform = 'rotate(0deg)');
  if (willOpen) openAccordion(btn, body);
}
function openAccordion(btn, body){ show(body); const chev = btn.querySelector('.chev'); if (chev) chev.style.transform = 'rotate(180deg)'; }

// ===== Google Apps Script endpoints =====
const WEB_APP_URL = window.WEB_APP_URL; // defina no index.html

async function sendVisit(){
  try{
    await fetch(`${WEB_APP_URL}?type=visit`, { method:'POST', mode:'cors' });
  }catch(e){ /* silencioso */ }
}

async function loadAllStats(){
  const items = document.querySelectorAll('.item[data-item-id]');
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
  try{
    const res = await fetch(`${WEB_APP_URL}?type=vote`, {
      method:'POST', mode:'cors',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ id, vote, feedback })
    });
    return await res.json();
  }catch(e){ return null; }
}

// ===== Modal de votação =====
const modal = document.getElementById('vote-modal');
const form = document.getElementById('vote-form');
const textarea = document.getElementById('vote-text');
const btnCancel = document.getElementById('vote-cancel');
let pending = { id:null, href:null, vote:null };

function openModal(){ show(modal); }
function closeModal(){ hide(modal); hide(form); textarea.value=''; pending = {id:null, href:null, vote:null}; }

modal.addEventListener('click', (e)=>{ if(e.target === modal) closeModal(); });
btnCancel.addEventListener('click', closeModal);
modal.querySelectorAll('[data-vote]').forEach(b=>{
  b.addEventListener('click', ()=>{
    pending.vote = b.getAttribute('data-vote'); // like | dislike
    show(form);
    textarea.placeholder = pending.vote === 'like' ? 'O que você mais gostou?' : 'O que não curtiu no material?';
  });
});
form.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const fb = textarea.value.trim();
  await sendVote({ id: pending.id, vote: pending.vote, feedback: fb });
  closeModal();
  // Atualiza contadores
  loadAllStats();
  // Abre a amostra em nova aba
  if (pending.href) window.open(pending.href, '_blank', 'noopener');
});

// Intercepta cliques na Amostra
document.querySelectorAll('[data-amostra]').forEach(a=>{
  a.addEventListener('click', (e)=>{
    e.preventDefault();
    const item = a.closest('.item');
    pending.id = item.getAttribute('data-item-id');
    pending.href = a.getAttribute('href') || '#';
    openModal();
  });
});
