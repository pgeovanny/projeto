// menu suspenso
const menuBtn = document.querySelector('.menu-btn');
const menuPop = document.getElementById('menu-pop');
menuBtn.addEventListener('click', () => {
  const open = menuPop.hasAttribute('hidden') ? false : true;
  if (open) {
    menuPop.setAttribute('hidden', '');
    menuBtn.setAttribute('aria-expanded', 'false');
  } else {
    menuPop.removeAttribute('hidden');
    menuBtn.setAttribute('aria-expanded', 'true');
  }
});
document.addEventListener('click', (e) => {
  if (!menuPop.contains(e.target) && !menuBtn.contains(e.target)) {
    menuPop.setAttribute('hidden', '');
    menuBtn.setAttribute('aria-expanded', 'false');
  }
});

// acordeão dos cards
document.querySelectorAll('[data-accordion]').forEach(btn => {
  const card = btn.closest('.linkcard');
  const body = card.querySelector('.linkcard-body');
  btn.addEventListener('click', () => {
    const isHidden = body.hasAttribute('hidden');
    document.querySelectorAll('.linkcard .linkcard-body').forEach(b => b.setAttribute('hidden',''));
    document.querySelectorAll('.linkcard .chev').forEach(c => c.style.transform = 'rotate(0deg)');
    if (isHidden) {
      body.removeAttribute('hidden');
      btn.querySelector('.chev').style.transform = 'rotate(180deg)';
    }
  });
});

// UTIL: preencha rapidamente os links via JS se quiser centralizar aqui
// Mapeie por ordem de aparição:
const amostras = [
  '#', // 850/2021
  '#', // 963/2025
  '#', // LC 1.111/2010
  '#', // Regimento Interno
  '#', // Normas CGJ
  '#', // Manual completo
  '#', // Kit Estratégias
];

const compras = [
  '#', '#', '#', '#', '#',
  '#', '#'
];

document.querySelectorAll('[data-amostra]').forEach((a, i) => a.href = amostras[i] || '#');
document.querySelectorAll('[data-compra]').forEach((a, i) => a.href = compras[i] || '#');
