// ===== CONFIG =====
const API = window.WEB_APP_URL; // defina em index.html
if(!API) console.error('Defina window.WEB_APP_URL no index.html');

// ===== Helpers =====
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const toast = (m) => { const t=$("#toast"); t.textContent=m; t.classList.remove('hidden'); setTimeout(()=>t.classList.add('hidden'), 1500); };
const uid = () => Math.random().toString(36).slice(2)+Date.now().toString(36);
const sess = (() => {
  let id = localStorage.getItem('pgsid');
  if(!id){ id = uid(); localStorage.setItem('pgsid', id); }
  return id;
})();

// ===== Estado =====
let MATERIALS = {}; // { 'leg-tjsp': [...], 'manual': [...] }
let CURRENT_SECTION = null;
let CURRENT_ITEM = null;
let PENDING_VOTE = null; // {id, type}

// ===== Init =====
document.addEventListener('DOMContentLoaded', async () => {
  trackVisit();
  bindMenu();
  await loadMaterials(); // carrega rápido; 60s de cache no servidor
});

// ===== API Calls =====
async function loadMaterials(force=false){
  try{
    const url = `${API}?type=materials${force?'&nocache=1':''}&_=${Date.now()}`;
    const res = await fetch(url, {method:'GET'});
    if(!res.ok) throw new Error('Falha ao carregar materiais');
    const json = await res.json();
    if(!json?.ok) throw new Error(json?.error||'Erro ao ler JSON');
    MATERIALS = json.sections || {};
    // nada aparece até o usuário escolher o menu (UX esperada)
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

// ===== UI =====
function bindMenu(){
  $$('.menu-btn').forEach(btn=>{
    btn.addEventListener('click', ()=> {
      const sec = btn.dataset.section;
      openSection(sec);
    });
  });
}

// abre a seção e lista cards
async function openSection(section){
  CURRENT_SECTION = section;
  const title = section === 'leg-tjsp' ? 'Legislação Interna TJ-SP 2025' : 'Manual do Aprovado';
  $('#section-title').textContent = title;
  $('#list-wrap').classList.remove('hidden');
  renderCards(section);
}

// monta cards e injeta contadores
async function renderCards(section){
  const container = $('#cards');
  container.innerHTML = '';
  const items = (MATERIALS[section]||[]).slice();
  if(!items.length){
    // força nocache caso tenha acabado de adicionar na planilha
    await loadMaterials(true);
  }
  const list = MATERIALS[section] || [];
  if(!list.length){
    container.innerHTML = `<div class="muted">Nenhum material disponível nesta seção.</div>`;
    return;
  }

  // cria cards e coleta IDs
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

  // busca stats e preenche
  const map = await fetchStats(ids);
  Object.entries(map).forEach(([id, val])=>{
    const lk = document.getElementById(`lk-${id}`);
    const dk = document.getElementById(`dk-${id}`);
    if(lk) lk.textContent = `👍 ${val.likes||0}`;
    if(dk) dk.textContent = `👎 ${val.dislikes||0}`;
  });

  // bind botões de amostra
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

function openVoteModal(id){
  PENDING_VOTE = {id, type:null};
  $('#vote-modal').classList.remove('hidden');
  $('#vote-ok').classList.add('hidden');
  $('#feedback-area').classList.add('hidden');
  $('#vote-send').disabled = true;
  $('#feedback').value = '';
  $('#btn-like').classList.remove('active');
  $('#btn-dislike').classList.remove('active');
}

function closeVoteModal(){
  $('#vote-modal').classList.add('hidden');
}

$('#vote-close').addEventListener('click', closeVoteModal);

$('#btn-like').addEventListener('click', ()=>{
  PENDING_VOTE.type = 'like';
  $('#btn-like').classList.add('active');
  $('#btn-dislike').classList.remove('active');
  $('#feedback-area').classList.remove('hidden');
  $('#fb-label').textContent = 'O que você mais gostou? (opcional)';
  $('#feedback').placeholder = 'Comente um destaque do material…';
  $('#vote-send').disabled = false;
});

$('#btn-dislike').addEventListener('click', ()=>{
  PENDING_VOTE.type = 'dislike';
  $('#btn-dislike').classList.add('active');
  $('#btn-like').classList.remove('active');
  $('#feedback-area').classList.remove('hidden');
  $('#fb-label').textContent = 'O que não curtiu? (opcional)';
  $('#feedback').placeholder = 'Conte o motivo: clareza, formato, abrangência…';
  $('#vote-send').disabled = false;
});

$('#vote-send').addEventListener('click', async ()=>{
  if(!PENDING_VOTE?.id || !PENDING_VOTE?.type) return;
  $('#vote-spinner').classList.remove('hidden');
  $('#vote-send').disabled = true;
  try{
    await sendVote({id:PENDING_VOTE.id, vote:PENDING_VOTE.type, feedback:$('#feedback').value.trim()});
    $('#vote-spinner').classList.add('hidden');
    $('#vote-ok').classList.remove('hidden');
    toast('Voto validado!');
    // atualiza counters do card
    const map = await fetchStats([PENDING_VOTE.id]);
    const v = map[PENDING_VOTE.id]||{};
    const lk = document.getElementById(`lk-${PENDING_VOTE.id}`);
    const dk = document.getElementById(`dk-${PENDING_VOTE.id}`);
    if(lk) lk.textContent = `👍 ${v.likes||0}`;
    if(dk) dk.textContent = `👎 ${v.dislikes||0}`;
    setTimeout(closeVoteModal, 900);
  }catch(err){
    console.error(err);
    $('#vote-spinner').classList.add('hidden');
    $('#vote-send').disabled = false;
    toast('Falha ao enviar voto');
  }
});

// util
function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[m]); }
