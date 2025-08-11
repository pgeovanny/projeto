// helpers visibilidade (classe is-hidden)
const show = el => el.classList.remove('is-hidden');
const hide = el => el.classList.add('is-hidden');

// refs
const menuBtn = document.querySelector('.menu-btn');
const menuPop = document.getElementById('menu-pop');
const linksSection = document.getElementById('links');
const hint = document.getElementById('hint');

const sections = {
  'leg-tjsp': document.getElementById('leg-tjsp'),
  'manual': document.getElementById('manual'),
};

// Garante estado inicial: tudo oculto
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

// Clique nas opções do menu
menuPop.querySelectorAll('.menu-item').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.getAttribute('data-open');

    // mostra o container principal e esconde a mensagem inicial
    show(linksSection);
    hide(hint);

    // esconde todas as seções e abre apenas a escolhida
    Object.values(sections).forEach(hide);
    show(sections[target]);

    // abre o acordeão da seção escolhida
    const head = sections[target].querySelector('[data-accordion]');
    const body = sections[target].querySelector('.linkcard-body');
    openAccordion(head, body);

    // fecha o menu e faz scroll até a seção
    hide(menuPop);
    menuBtn.setAttribute('aria-expanded','false');
    sections[target].scrollIntoView({ behavior:'smooth', block:'start' });
  });
});

// Acordeão
document.querySelectorAll('[data-accordion]').forEach(btn => {
  const card = btn.closest('.linkcard');
  const body = card.querySelector('.linkcard-body');
  btn.addEventListener('click', () => toggleAccordion(btn, body));
});
function toggleAccordion(btn, body){
  const willOpen = body.classList.contains('is-hidden');
  // fecha todos
  document.querySelectorAll('.linkcard .linkcard-body').forEach(b => hide(b));
  document.querySelectorAll('.linkcard .chev').forEach(c => c.style.transform = 'rotate(0deg)');
  // abre se necessário
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
