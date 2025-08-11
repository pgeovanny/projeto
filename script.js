// ===== CONFIG =====
const API = window.WEB_APP_URL; // defina em index.html
if (!API) console.error('Defina window.WEB_APP_URL no index.html');

// ===== Helpers =====
const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const toast = (m) => {
  let t = $("#toast");
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    t.className = 'toast hidden';
    document.body.appendChild(t);
  }
  t.textContent = m;
  t.classList.remove('hidden','is-hidden');
  setTimeout(()=> t.classList.add('hidden'), 1500);
};
const uid = () => Math.random().toString(36).slice(2)+Date.now().toString(36);
const sess = (() => {
  let id = localStorage.getItem('pgsid');
  if (!id){ id = uid(); localStorage.setItem('pgsid', id); }
  return id;
})();

const showEl = (el, show=true) => {
  if (!el) return;
  el.classList.toggle('hidden', !show);
  el.classList.toggle('is-hidden', !show);
};
const hasEl = sel => !!document.querySelector(sel);

// ===== Estado =====
let MATERIALS = {}; // { 'leg-tjsp': [...], 'manual': [...] }
let CURRENT_SECTION = null;
let CURRENT_ITEM = null;
let PENDING_VOTE = null; // {id, type}

// Detecção de layout
const HAS_GRID  = hasEl('#cards'); // layout antigo (grid)
const HAS_SECTS = hasEl('#links'); // layout novo (accordion por seção)

// ===== Init =====
document.addEventListener('DOMContentLoaded', async () => {
  trackVisit();
  await loadMaterials(); // carrega rápido; 60s de cache no servidor
  wireAccordionAndToolbar();
  wireModernModal();   // ativa handlers do modal "novo" (data-vote + form)
  wireLegacyModal();   // ativa handlers do modal "antigo" (btn-like/btn-dislike)
});

// ===== API =====
async function loadMaterials(force=false){
  try{
    const url = `${API}?type=materials${force?'&nocache=1':''}&_=${Date.now()}`;
    const res = await fetch(url, {method:'GET'});
    if(!res.ok) throw new Error('Falha ao carregar materiais');
    const json = await res.json();
    if(!json?.ok) throw new Error(json?.error||'Erro ao ler JSON');
    MATERIALS = json.sections || {};
  }catch(err){
    console.error(err); toast('Erro ao carregar materiais');
  }
}

async function fetchStats(ids){
  if(!ids?.length) return {};
  const url = `${API}?type=stats&ids=${encodeURIComponent(ids.join(','))}&_=${Date.now()}`;
  const res = await fetch(url);
  if(!res.ok) return {};
  const json = await res.json();
  return json?.data || {};
}

async function trackVisit(){
  try{
    await fetch(API, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({type:'visit', session_id:sess, user_agent:navigator.userAgent, referrer:document.referrer||''})
    });
  }catch(_){}
}

async function sendVote({id, vote, feedback}){
  const body = {type:'vote', id, vote, feedback:feedback||'', session_id:sess, user_agent:navigator.userAgent, referrer:document.referrer||''};
  const res = await fetch(API, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)});
  if(!res.ok) throw new Error('Falha no voto');
  const json = await res.json(); if(!json?.ok) throw new Error(json?.error||'Falha no voto');
  return true;
}

// ===== Navegação principal (usado pelo dropdown) =====
async function openSection(section){
  CURRENT_SECTION = section;

  if (HAS_GRID){
    const title = section === 'leg-tjsp' ? 'Legislação Interna TJ-SP 2025' : 'Manual do Aprovado';
    const wrap = $('#list-wrap');
    $('#section-title')?.textContent = title;
    showEl(wrap, true);
    $('#welcome') && showEl($('#welcome'), false);
    await renderCardsGrid(section);
    window.scrollTo({top: wrap.offsetTop - 20, behavior:'smooth'});
    return;
  }

  if (HAS_SECTS){
    const links   = $('#links');
    const welcome = $('#welcome');
    showEl(links, true);
    showEl(welcome, false);

    // alterna seção visível
    $$('#links .linkcard').forEach(el => el.classList.add('is-hidden'));
    const art = document.getElementById(section);
    if (art) art.classList.remove('is-hidden');

    await renderSectionAccordion(section);
    window.scrollTo({top: (art||links).offsetTop - 20, behavior:'smooth'});
  }
}

// ===== Layout A: GRID =====
async function renderCardsGrid(section){
  const container = $('#cards');
  if (!container) return;
  container.innerHTML = '';

  const items = (MATERIALS[section]||[]).slice();
  if(!items.length){
    await loadMaterials(true); // força nocache caso tenha acabado de adicionar
  }
  const list = MATERIALS[section] || [];
  if(!list.length){
    container.innerHTML = `<div class="muted">Nenhum material disponível nesta seção.</div>`;
    return;
  }

  const ids = [];
  list.forEach(item=>{
    ids.push(item.id);
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <h4>${escapeHtml(item.nome)}</h4>
      ${item.descricao ? `<div class="desc">${escapeHtml(item.descricao)}</div>` : ''}
      <div class="badges">
        <span class="badge good" id="lk-${item.id}">👍 0</span>
        <span class="badge bad"  id="dk-${item.id}">👎 0</span>
      </div>
      <div class="actions">
        <button class="btn" data-action="amostra" data-id="${item.id}" data-url="${item.amostra||'#'}">Ver amostra</button>
        <a class="btn grad" href="${item.compra||'#'}" target="_blank" rel="noopener">Comprar</a>
      </div>
    `;
    container.appendChild(card);
  });

  // Stats
  const map = await fetchStats(ids);
  Object.entries(map).forEach(([id, val])=>{
    const lk = document.getElementById(`lk-${id}`);
    const dk = document.getElementById(`dk-${id}`);
    if(lk) lk.textContent = `👍 ${val.likes||0}`;
    if(dk) dk.textContent = `👎 ${val.dislikes||0}`;
  });

  // Amostra
  container.querySelectorAll('button[data-action="amostra"]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id = btn.dataset.id;
      const url = btn.dataset.url;
      CURRENT_ITEM = id;
      if(url && url !== '#') window.open(url, '_blank', 'noopener');
      openVoteModal(id);
    });
  });
}

// ===== Layout B: ACCORDION POR SEÇÃO =====
function wireAccordionAndToolbar(){
  // abre/fecha corpo do accordion
  $$('[data-accordion]').forEach(head=>{
    head.addEventListener('click', ()=>{
      const body = head.parentElement.querySelector('.linkcard-body');
      if (body) body.classList.toggle('is-hidden');
    });
  });

  // toolbar back/prev/next
  $$('.toolbar [data-nav]').forEach(b=>{
    b.addEventListener('click', ()=>{
      const action = b.dataset.nav;
      if (action==='back'){
        showEl($('#links'), false);
        showEl($('#welcome'), true);
      } else {
        const next = action==='next' ? 'manual' : 'leg-tjsp';
        openSection(next);
      }
    });
  });
}

async function renderSectionAccordion(section){
  const art  = document.getElementById(section);
  const body = art?.querySelector('.linkcard-body');
  if (!body) return;
  body.innerHTML = '';

  const list = MATERIALS[section] || [];
  if(!list.length){
    await loadMaterials(true);
  }
  const items = MATERIALS[section] || [];
  if(!items.length){
    body.innerHTML = `<div class="muted" style="padding:10px 12px">Nenhum material disponível nesta seção.</div>`;
    return;
  }

  // monta linhas
  const ids = [];
  items.forEach(item=>{
    ids.push(item.id);
    const row = document.createElement('div');
    row.className = 'row-material';
    row.innerHTML = `
      <div class="row-main">
        <div class="row-title">${escapeHtml(item.nome)}</div>
        ${item.descricao ? `<div class="row-desc">${escapeHtml(item.descricao)}</div>` : ''}
      </div>
      <div class="row-actions">
        <span class="badge good" id="lk-${item.id}">👍 0</span>
        <span class="badge bad"  id="dk-${item.id}">👎 0</span>
        <button class="btn ghost" data-action="amostra" data-id="${item.id}" data-url="${item.amostra||'#'}">Amostra</button>
        <a class="btn grad" href="${item.compra||'#'}" target="_blank" rel="noopener">Comprar</a>
      </div>
    `;
    body.appendChild(row);
  });

  // stats
  const map = await fetchStats(ids);
  Object.entries(map).forEach(([id, val])=>{
    const lk = document.getElementById(`lk-${id}`);
    const dk = document.getElementById(`dk-${id}`);
    if(lk) lk.textContent = `👍 ${val.likes||0}`;
    if(dk) dk.textContent = `👎 ${val.dislikes||0}`;
  });

  // amostra
  body.querySelectorAll('button[data-action="amostra"]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id = btn.dataset.id;
      const url = btn.dataset.url;
      CURRENT_ITEM = id;
      if(url && url !== '#') window.open(url, '_blank', 'noopener');
      openVoteModal(id);
    });
  });
}

// ===== Modal (compatível com os dois modelos) =====
function openVoteModal(id){
  PENDING_VOTE = {id, type:null};
  const modal = $('#vote-modal');
  if (!modal) return;

  // reset para os dois modelos
  showEl(modal, true);
  // moderno
  showEl($('#vote-form'), false);
  const voteText = $('#vote-text'); if (voteText) voteText.value = '';
  // legado
  const ok = $('#vote-ok'); ok && showEl(ok, false);
  const area = $('#feedback-area'); area && showEl(area, false);
  const send = $('#vote-send'); if (send) send.disabled = true;
  $('#btn-like')?.classList.remove('active');
  $('#btn-dislike')?.classList.remove('active');
}

function closeVoteModal(){
  const modal = $('#vote-modal');
  if (modal) showEl(modal, false);
}

// ——— Modelo moderno (data-vote + form) ———
function wireModernModal(){
  const modal = $('#vote-modal');
  if (!modal) return;

  // Escolha do voto
  $$('#vote-modal [data-vote]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      PENDING_VOTE = PENDING_VOTE || {};
      PENDING_VOTE.type = btn.dataset.vote === 'like' ? 'like' : 'dislike';
      const form = $('#vote-form');
      showEl(form, true);
    });
  });

  // Cancelar
  $('#vote-cancel')?.addEventListener('click', ()=> closeVoteModal());

  // Enviar (form moderno)
  const form = $('#vote-form');
  if (form) {
    form.addEventListener('submit', async (ev)=>{
      ev.preventDefault();
      if(!PENDING_VOTE?.id || !PENDING_VOTE?.type) return;
      const text = ($('#vote-text')?.value || '').trim();

      // feedback visual simples (sem spinner moderno)
      const submitBtn = form.querySelector('button[type="submit"]');
      const oldTxt = submitBtn?.textContent;
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Enviando…'; }

      try{
        await sendVote({id:PENDING_VOTE.id, vote:PENDING_VOTE.type, feedback:text});
        toast('Voto validado!');
        // atualiza contadores
        await refreshOneCounter(PENDING_VOTE.id);
        setTimeout(closeVoteModal, 900);
      }catch(err){
        console.error(err);
        toast('Falha ao enviar voto');
      }finally{
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = oldTxt || 'Enviar'; }
      }
    });
  }
}

// ——— Modelo legado (#btn-like/#btn-dislike + feedback-area + #vote-send) ———
function wireLegacyModal(){
  $('#vote-close')?.addEventListener('click', closeVoteModal);

  $('#btn-like')?.addEventListener('click', ()=>{
    PENDING_VOTE = PENDING_VOTE || {};
    PENDING_VOTE.type = 'like';
    $('#btn-like')?.classList.add('active');
    $('#btn-dislike')?.classList.remove('active');
    showEl($('#feedback-area'), true);
    const fb = $('#feedback'); if (fb) fb.placeholder = 'Comente um destaque do material…';
    $('#vote-send') && ($('#vote-send').disabled = false);
  });

  $('#btn-dislike')?.addEventListener('click', ()=>{
    PENDING_VOTE = PENDING_VOTE || {};
    PENDING_VOTE.type = 'dislike';
    $('#btn-dislike')?.classList.add('active');
    $('#btn-like')?.classList.remove('active');
    showEl($('#feedback-area'), true);
    const fb = $('#feedback'); if (fb) fb.placeholder = 'Conte o motivo: clareza, formato, abrangência…';
    $('#vote-send') && ($('#vote-send').disabled = false);
  });

  $('#vote-send')?.addEventListener('click', async ()=>{
    if(!PENDING_VOTE?.id || !PENDING_VOTE?.type) return;
    const sp = $('#vote-spinner'); sp && showEl(sp, true);
    $('#vote-send').disabled = true;
    try{
      await sendVote({id:PENDING_VOTE.id, vote:PENDING_VOTE.type, feedback:($('#feedback')?.value||'').trim()});
      sp && showEl(sp, false);
      $('#vote-ok') && showEl($('#vote-ok'), true);
      toast('Voto validado!');
      await refreshOneCounter(PENDING_VOTE.id);
      setTimeout(closeVoteModal, 900);
    }catch(err){
      console.error(err);
      sp && showEl(sp, false);
      $('#vote-send').disabled = false;
      toast('Falha ao enviar voto');
    }
  });
}

// Atualiza os contadores de 1 item
async function refreshOneCounter(id){
  const map = await fetchStats([id]);
  const v = map[id]||{};
  const lk = document.getElementById(`lk-${id}`);
  const dk = document.getElementById(`dk-${id}`);
  if(lk) lk.textContent = `👍 ${v.likes||0}`;
  if(dk) dk.textContent = `👎 ${v.dislikes||0}`;
}

// ===== util =====
function escapeHtml(s){
  return String(s||'').replace(/[&<>"']/g, m=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[m]);
}
