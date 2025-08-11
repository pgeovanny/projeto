// ===== CONFIG =====
const API = window.WEB_APP_URL;
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
  setTimeout(()=> t.classList.add('hidden'), 1400);
};
const uid = () => Math.random().toString(36).slice(2)+Date.now().toString(36);
const sess = (() => {
  let id = localStorage.getItem('pgsid');
  if (!id){ id = uid(); localStorage.setItem('pgsid', id); }
  return id;
})();
const showEl = (el, show=true) => { if(!el) return; el.classList.toggle('hidden', !show); el.classList.toggle('is-hidden', !show); };
const escapeHtml = s => String(s||'').replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

// ===== Estado =====
let MATERIALS = {};     // { 'leg-tjsp': [{...}], 'manual': [...] }
let CURRENT_SECTION = null;
let CURRENT_ITEM = null;
let PENDING_VOTE = null; // {id, type}

// ===== Init =====
document.addEventListener('DOMContentLoaded', async () => {
  trackVisit();
  await loadMaterials();    // 1 chamada, já vem com likes/dislikes
  wireUI();                 // accordion + toolbar + modal
  // deixa a função pública pro dropdown do seu index.html
  window.openSection = openSection;
});

// ===== API =====
async function loadMaterials(force=false){
  try{
    const url = `${API}?type=materials${force?'&nocache=1':''}&_=${Date.now()}`;
    const res = await fetch(url, {method:'GET', credentials:'omit', cache:'no-store'});
    if(!res.ok) throw new Error('Falha ao carregar materiais');
    const json = await res.json();
    if(!json?.ok) throw new Error(json?.error||'Erro ao ler JSON');
    MATERIALS = json.sections || {};
  }catch(err){
    console.error(err);
    toast('Erro ao carregar materiais');
  }
}
async function trackVisit(){
  try{
    await fetch(API, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({type:'visit', session_id:sess, user_agent:navigator.userAgent, referrer:document.referrer||''})
    });
  }catch(_){}
}
async function sendVote({id, vote, feedback}){
  const body = {type:'vote', id, vote, feedback:feedback||'', session_id:sess, user_agent:navigator.userAgent, referrer:document.referrer||''};
  const res = await fetch(API, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)});
  if(!res.ok) throw new Error('Falha no voto');
  const json = await res.json(); if(!json?.ok) throw new Error(json?.error||'Falha no voto');
  return json; // {ok:true, stats:{likes,dislikes}}
}

// ===== UI Wiring =====
function wireUI(){
  // accordion
  $$('[data-accordion]').forEach(head=>{
    head.addEventListener('click', ()=>{
      const body = head.parentElement.querySelector('.linkcard-body');
      if (body) body.classList.toggle('is-hidden');
    });
  });

  // toolbar back/next/prev
  $$('.toolbar [data-nav]').forEach(b=>{
    b.addEventListener('click', ()=>{
      const action=b.dataset.nav;
      if(action==='back'){ showEl($('#links'), false); showEl($('#welcome'), true); return; }
      if(action==='next'){ openSection('manual'); return; }
      if(action==='prev'){ openSection('leg-tjsp'); return; }
    });
  });

  // modal (modelo "moderno" do seu index)
  const modal = $('#vote-modal');
  if (modal){
    $('#vote-cancel')?.addEventListener('click', closeVoteModal);
    $$('#vote-modal [data-vote]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        PENDING_VOTE = PENDING_VOTE || {};
        PENDING_VOTE.type = btn.dataset.vote === 'like' ? 'like' : 'dislike';
        showEl($('#vote-form'), true);
      });
    });
    $('#vote-form')?.addEventListener('submit', onSubmitVoteForm);
  }
}

async function openSection(section){
  CURRENT_SECTION = section;
  // mostra área de links / esconde welcome
  showEl($('#links'), true);
  showEl($('#welcome'), false);

  // esconde todas as seções e mostra a escolhida
  $$('#links .linkcard').forEach(el => el.classList.add('is-hidden'));
  const art = document.getElementById(section);
  if (art) art.classList.remove('is-hidden');

  await renderSection(section);
  window.scrollTo({top: (art||$('#links')).offsetTop - 20, behavior:'smooth'});
}

async function renderSection(section){
  const art  = document.getElementById(section);
  const body = art?.querySelector('.linkcard-body');
  if (!body) return;
  body.innerHTML = '';

  const items = (MATERIALS[section]||[]).slice();
  if(!items.length){
    await loadMaterials(true); // força sem cache caso acabou de editar planilha
  }
  const list = MATERIALS[section] || [];
  if(!list.length){
    body.innerHTML = `<div class="muted" style="padding:10px 12px">Nenhum material disponível nesta seção.</div>`;
    return;
  }

  // monta linhas (sem segunda requisição de stats)
  const frag = document.createDocumentFragment();
  list.forEach(item=>{
    const row = document.createElement('div');
    row.className = 'row-material';
    row.innerHTML = `
      <div class="row-main">
        <div class="row-title">${escapeHtml(item.nome)}</div>
        ${item.descricao ? `<div class="row-desc">${escapeHtml(item.descricao)}</div>` : ''}
      </div>
      <div class="row-actions">
        <span class="badge good" id="lk-${item.id}">👍 ${item.likes||0}</span>
        <span class="badge bad"  id="dk-${item.id}">👎 ${item.dislikes||0}</span>
        <button class="btn ghost" data-action="amostra" data-id="${item.id}" data-url="${item.amostra||'#'}">Amostra</button>
        <a class="btn grad" href="${item.compra||'#'}" target="_blank" rel="noopener">Comprar</a>
      </div>
    `;
    frag.appendChild(row);
  });
  body.appendChild(frag);

  // delegação de clique para Amostra
  body.addEventListener('click', onRowClick, {once:true});
  // Observação: {once:true} aplica só na primeira; reanexa para múltiplos cliques:
  body.addEventListener('click', onRowClick);
}

function onRowClick(e){
  const btn = e.target.closest('[data-action="amostra"]');
  if(!btn) return;
  const id  = btn.dataset.id;
  const url = btn.dataset.url;
  CURRENT_ITEM = id;
  if(url && url !== '#') window.open(url, '_blank', 'noopener');
  openVoteModal(id);
}

// ===== Modal =====
function openVoteModal(id){
  PENDING_VOTE = {id, type:null};
  const modal = $('#vote-modal');
  if (!modal) return;
  showEl($('#vote-form'), false);
  const txt=$('#vote-text'); if(txt) txt.value='';
  showEl(modal, true);
}
function closeVoteModal(){ showEl($('#vote-modal'), false); }

async function onSubmitVoteForm(ev){
  ev.preventDefault();
  if(!PENDING_VOTE?.id || !PENDING_VOTE?.type) return;
  const form = ev.currentTarget;
  const text = ($('#vote-text')?.value||'').trim();

  const submitBtn = form.querySelector('button[type="submit"]');
  const old = submitBtn?.textContent;
  if(submitBtn){ submitBtn.disabled=true; submitBtn.textContent='Enviando…'; }

  try{
    const res = await sendVote({id:PENDING_VOTE.id, vote:PENDING_VOTE.type, feedback:text});
    // Atualiza contadores do item (sem recarregar tudo)
    const s = res?.stats||{};
    const lk = document.getElementById(`lk-${PENDING_VOTE.id}`);
    const dk = document.getElementById(`dk-${PENDING_VOTE.id}`);
    if(lk) lk.textContent = `👍 ${s.likes||0}`;
    if(dk) dk.textContent = `👎 ${s.dislikes||0}`;
    toast('Voto validado!');
    setTimeout(closeVoteModal, 900);
  }catch(err){
    console.error(err);
    toast('Falha ao enviar voto');
  }finally{
    if(submitBtn){ submitBtn.disabled=false; submitBtn.textContent=old||'Enviar'; }
  }
}
