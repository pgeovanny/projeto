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

// ===== Menu: abre como FIXED e reposiciona sempre por cima =====
function openMenu(){
  // torna visível para medir (mas invisível na tela)
  menuPop.classList.remove('is-hidden');
  menuPop.style.visibility = 'hidden';
  menuPop.style.position = 'fixed';
  menuPop.style.zIndex = 9999;

  const r = menuBtn.getBoundingClientRect();
  const width = menuPop.offsetWidth || 260;
  const vw = window.innerWidth;

  // alinha à direita do botão, limitando às bordas da viewport
  let left = Math.min(Math.max(8, r.right - width), vw - width - 8);
  let top = r.bottom + 8;

  menuPop.style.left = left + 'px';
  menuPop.style.top = top + 'px';
  menuPop.style.visibility = 'visible';
  menuBtn.setAttribute('aria-expanded','true');
}
function closeMenu(){
  menuPop.classList.add('is-hidden');
  menuBtn.setAttribute('aria-expanded','false');
}
menuBtn.addEventListener('click', () => {
  if (menuPop.classList.contains('is-hidden')) openMenu(); else closeMenu();
});
window.addEventListener('resize', () => { if (!menuPop.classList.contains('is-hidden')) openMenu(); });
document.addEventListener('scroll', () => { if (!menuPop.classList.contains('is-hidden')) openMenu(); }, { passive:true });
document.addEventListener('click', (e) => {
  if (!menuPop.contains(e.target) && !menuBtn.contains(e.target)) closeMenu();
});

// ===== Router (hash) para abrir seção correta =====
function renderFromHash() {
  const id = (location.hash || '').replace('#','');

  if (!id || !sections[id]) {
    // tela inicial
    show(welcome);
    hide(linksSection);
    Object.values(sections).forEach(hide);
    closeMenu();
    return;
  }

  // mostra seção escolhida
  hide(welcome);
  show(linksSection);
  Object.values(sections).forEach(hide);
  show(sections[id]);

  // abre o acordeão dessa seção
  const head = sections[id].querySelector('[data-accordion]');
  const body = sections[id].querySelector('.linkcard-body');
  if (head && body) openAccordion(head, body);

  closeMenu();

  // toolbar prev/next
  setupNavToolbar(id);

  // garante que a seção fique no centro do container
  sections[id].scrollIntoView({ behavior:'smooth', block:'start' });
}
window.addEventListener('hashchange', renderFromHash);
window.addEventListener('load', renderFromHash);

// Clique em item do menu => muda hash (aciona router)
menuPop.querySelectorAll('.menu-item').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.getAttribute('data-open');
    location.hash = target;
  });
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
