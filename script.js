// Helpers visibilidade (classe is-hidden)
const show = el => el.classList.remove('is-hidden');
const hide = el => el.classList.add('is-hidden');

// Refs
const menuBtn = document.querySelector('.menu-btn');
const menuPop = document.getElementById('menu-pop');
const linksSection = document.getElementById('links');
const welcome = document.getElementById('welcome');

const sections = {
  'leg-tjsp': document.getElementById('leg-tjsp'),
  'manual': document.getElementById('manual'),
};
const order = ['leg-tjsp', 'manual'];

// Estado inicial
hide(menuPop);
hide(linksSection);
Object.values(sections).forEach(hide);

// Menu toggle
menuBtn.addEventListener('click', () => {
  if (menuPop.classList.contains('is-hidden')) {
    show(menuPop);
    menuBtn.setAttribute('aria-expanded','true');
  } else {
    hide(menuPop);
    menuBtn.setAttribute('aria-expanded','false');
  }
});
document.addEventListener('click', (e) => {
  if (!menuPop.contains(e.target) && !menuBtn.contains(e.target)) {
    hide(menuPop);
    menuBtn.setAttribute('aria-expanded','false');
  }
});

// Ações ao clicar uma opção do menu → roteia por hash
menuPop.querySelectorAll('.menu-item').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.getAttribute('data-open');
    location.hash = target; // dispara o handler de rota
  });
});

// Router (hash)
function renderFromHash() {
  const id = (location.hash || '').replace('#','');

  if (!id || !sections[id]) {
    // Modo menu inicial
    show(welcome);
    hide(linksSection);
    Object.values(sections).forEach(hide);
    hide(menuPop);
    menuBtn.setAttribute('aria-expanded','false');
    return;
  }

  // Modo seção
  hide(welcome);
  show(linksSection);
  Object.values(sections).forEach(hide);
  show(sections[id]);

  // abre o acordeão da seção ativa
  const head = sections[id].querySelector('[data-accordion]');
  const body = sections[id].querySelector('.linkcard-body');
  openAccordion(head, body);

  // fecha o menu e garante que não ficará atrás
  hide(menuPop);
  menuBtn.setAttribute('aria-expanded','false');

  // setar botões next/prev dinamicamente
  setupNavToolbar(id);

  // scroll suave
  sections[id].scrollIntoView({ behavior:'smooth', block:'start' });
}
window.addEventListener('hashchange', renderFromHash);
window.addEventListener('load', renderFromHash);

// Toolbar navegação
function setupNavToolbar(activeId){
  const idx = order.indexOf(activeId);
  const sec = sections[activeId];
  const backBtn = sec.querySelector('[data-nav="back"]');
  const prevBtn = sec.querySelector('[data-nav="prev"]');
  const nextBtn = sec.querySelector('[data-nav="next"]');

  if (backBtn) backBtn.onclick = () => { location.hash = ''; };

  if (prevBtn) {
    if (idx > 0) {
      prevBtn.removeAttribute('disabled');
      prevBtn.onclick = () => { location.hash = order[idx - 1]; };
    } else {
      prevBtn.setAttribute('disabled','');
      prevBtn.onclick = null;
    }
  }
  if (nextBtn) {
    if (idx < order.length - 1) {
      nextBtn.removeAttribute('disabled');
      nextBtn.onclick = () => { location.hash = order[idx + 1]; };
    } else {
      nextBtn.setAttribute('disabled','');
      nextBtn.onclick = null;
    }
  }
}

// Acordeão
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

// --------- LINKS DE AMOSTRA/COMPRA ---------
const amostras = [
  // Legislação Interna:
  "https://drive.google.com/drive/u/3/folders/1r5YY6pF9e2iaw4EjexVEPNlyD19mLtEu", // Res. 850/2021 ✅
  "#", // Res. 963/2025
  "#", // LC 1.111/2010
  "https://drive.google.com/drive/u/3/folders/1nvgTdBw9NxKNNUQ5lMhFYBxHCxqQt5Wo", // Regimento Interno ✅
  "#", // Normas CGJ
  // Manual:
  "#", // Manual completo
  "#", // Kit estratégias
];
const compras = ["#","#","#","#","#","#","#"];
document.querySelectorAll('[data-amostra]').forEach((a, i) => a.href = amostras[i] || '#');
document.querySelectorAll('[data-compra]').forEach((a, i) => a.href = compras[i] || '#');
