const menuBtn = document.querySelector('.menu-btn');
const menuPop = document.querySelector('.menu-pop');

function openMenu(){
  const r = menuBtn.getBoundingClientRect();
  menuPop.style.position = 'fixed';
  menuPop.style.top = (r.bottom + 8) + 'px';
  const width = menuPop.offsetWidth || 260;
  menuPop.style.left = (Math.max(8, r.right - width)) + 'px';
  menuPop.style.zIndex = 9999;
  menuPop.classList.remove('is-hidden');
  menuBtn.setAttribute('aria-expanded','true');
}

function closeMenu(){
  menuPop.classList.add('is-hidden');
  menuBtn.setAttribute('aria-expanded','false');
}

menuBtn.addEventListener('click', () => {
  if (menuPop.classList.contains('is-hidden')) openMenu();
  else closeMenu();
});

window.addEventListener('resize', () => {
  if (!menuPop.classList.contains('is-hidden')) openMenu();
});
document.addEventListener('scroll', () => {
  if (!menuPop.classList.contains('is-hidden')) openMenu();
}, { passive:true });
