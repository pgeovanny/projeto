// MENU: abre/fecha dropdown
const menuBtn = document.querySelector('.menu-btn');
const menuPop = document.getElementById('menu-pop');
const linksSection = document.getElementById('links');
const hint = document.getElementById('hint');

menuBtn.addEventListener('click', () => {
  const open = !menuPop.hasAttribute('hidden');
  if (open) closeMenu(); else openMenu();
});
document.addEventListener('click', (e) => {
  if (!menuPop.contains(e.target) && !menuBtn.contains(e.target)) closeMenu();
});
function openMenu(){ menuPop.removeAttribute('hidden'); menuBtn.setAttribute('aria-expanded','true'); }
function closeMenu(){ menuPop.setAttribute('hidden',''); menuBtn.setAttribute('aria-expanded','false'); }

// Exibição controlada: inicia tudo oculto; só mostra após seleção
const sections = {
  'leg-tjsp': document.getElementById('leg-tjsp'),
  'manual': document.getElementById('manual'),
};

// Clique nos itens do menu → mostra apenas a seção escolhida
menuPop.querySelectorAll('.menu-item').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.getAttribute('data-open');
    // mostra container e esconde aviso
    linksSection.removeAttribute('hidden');
    hint.setAttribute('hidden','');

    // esconde todas e mostra só a escolhida
    Object.values(sections).forEach(el => el.setAttribute('hidden',''));
    sections[target].removeAttribute('hidden');

    // abre o acordeão da escolhida
    const head = sections[target].querySelector('[data-accordion]');
    const body = sections[target].querySelector('.linkcard-body');
    openAccordion(head, body);

    closeMenu();
    // scroll suave até a seção
    sections[target].scrollIntoView({ behavior:'smooth', block:'start' });
  });
});

// Acordeão: abre/fecha conteúdo do card
document.querySelectorAll('[data-accordion]').forEach(btn => {
  const card = btn.closest('.linkcard');
  const body = card.querySelector('.linkcard-body');
  btn.addEventListener('click', () => {
    toggleAccordion(btn, body);
  });
});
function toggleAccordion(btn, body){
  const isHidden = body.hasAttribute('hidden');
  // fecha todos
  document.querySelectorAll('.linkcard .linkcard-body').forEach(b => b.setAttribute('hidden',''));
  document.querySelectorAll('.linkcard .chev').forEach(c => c.style.transform = 'rotate(0deg)');
  // abre se estava oculto
  if (isHidden) openAccordion(btn, body);
}
function openAccordion(btn, body){
  body.removeAttribute('hidden');
  const chev = btn.querySelector('.chev');
  if (chev) chev.style.transform = 'rotate(180deg)';
}

// --------- LINKS DE AMOSTRA/COMPRA ---------
// Ordem conforme os itens da página
const amostras = [
  // Legislação Interna (5 itens):
  "https://drive.google.com/drive/u/3/folders/1r5YY6pF9e2iaw4EjexVEPNlyD19mLtEu", // Res. 850/2021 ✅
  "#", // Res. 963/2025
  "#", // LC 1.111/2010
  "https://drive.google.com/drive/u/3/folders/1nvgTdBw9NxKNNUQ5lMhFYBxHCxqQt5Wo", // Regimento Interno ✅
  "#", // Normas CGJ
  // Manual (2 itens):
  "#", // Manual completo
  "#", // Kit estratégias
];
const compras = [
  "#", "#", "#", "#", "#",
  "#", "#"
];

document.querySelectorAll('[data-amostra]').forEach((a, i) => a.href = amostras[i] || '#');
document.querySelectorAll('[data-compra]').forEach((a, i) => a.href = compras[i] || '#');
