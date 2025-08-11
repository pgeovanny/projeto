// ===== CONFIG =====
const API = window.WEB_APP_URL;
if (!API) console.error('Defina window.WEB_APP_URL no index.html');

// ===== Helpers =====
const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const toast = (m) => {
  let t = $("#toast");
  if (!t) { t = document.createElement('div'); t.id='toast'; t.className='toast hidden'; document.body.appendChild(t); }
  t.textContent = m; t.classList.remove('hidden','is-hidden'); setTimeout(()=> t.classList.add('hidden'), 1400);
};
const uid = () => Math.random().toString(36).slice(2)+Date.now().toString(36);
const sess = (()=>{ let id=localStorage.getItem('pgsid'); if(!id){ id=uid(); localStorage.setItem('pgsid',id);} return id; })();
const showEl = (el, show=true)=>{ if(!el) return; el.classList.toggle('hidden',!show); el.classList.toggle('is-hidden',!show); };
const escapeHtml = s => String(s||'').replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

// ===== Estado =====
let ITEMS = [];
let PENDING_VOTE = null; // {id,type}

// ===== Init =====
document.addEventListener('DOMContentLoaded', async ()=>{
  showEl($('#welcome'), false);
  showEl($('#links'), true);
  trackVisit();
  await loadAll();
  wireModal();
});

async function loadAll(){
  const container = $('#links');
  container.innerHTML = `
    <article class="linkcard card">
      <div class="linkcard-head" style="cursor:default">
        <div class="txt">
          <h2>Materiais</h2>
          <p>Tudo em um lugar – fácil de ler e rápido.</p>
        </div>
      </div>
      <div class="linkcard-body" id="one-list"></div>
    </article>
  `;

  try{
    const res = await fetch(`${API}?type=materials&_=${Date.now()}`, {cache:'no-store'});
    const json = await res.json();
    if(!json?.ok) throw new Error(json?.error||'Falha');
    ITEMS = json.items || [];
    renderList(ITEMS);
  }catch(err){
    console.error(err);
    container.insertAdjacentHTML('beforeend', `<div class="muted" style="padding:10px 12px">Erro ao carregar materiais</div>`);
  }
}

function renderList(items){
  const body = $('#one-list');
  body.innerHTML = '';
  if(!items.length){
    body.innerHTML = `<div class="muted" style="padding:10px 12px">Nenhum material cadastrado.</div>`;
    return;
  }

  const frag = document.createDocumentFragment();
  items.forEach(it=>{
    const row = document.createElement('div');
    row.className = 'row-material';
    row.innerHTML = `
      <div class="row-main">
        <div class="row-title">${escapeHtml(it.nome)}</div>
        ${it.descricao ? `<div class="row-desc">${escapeHtml(it.descricao)}</div>` : ''}
      </div>
      <div class="row-actions">
        <span class="badge good" id="lk-${it.id}">👍 ${it.likes||0}</span>
        <span class="badge bad"  id="dk-${it.id}">👎 ${it.dislikes||0}</span>
        <span class="badge"      id="fb-${it.id}">💬 ${it.feedbacks||0}</span>
        <button class="btn ghost" data-action="amostra" data-id="${it.id}" data-url="${it.amostra||'#'}">Amostra</button>
        <a class="btn grad" href="${it.compra||'#'}" target="_blank" rel="noopener">Comprar</a>
      </div>
    `;
    frag.appendChild(row);
  });
  body.appendChild(frag);

  body.addEventListener('click', onRowClick);
}

function onRowClick(e){
  const btn = e.target.closest('[data-action="amostra"]');
  if(!btn) return;
  const id = btn.dataset.id;
  const url = btn.dataset.url;
  if(url && url!=='#') window.open(url, '_blank', 'noopener');
  openVoteModal(id);
}

/* ===== Voto ===== */
function wireModal(){
  const modal = $('#vote-modal');
  if (!modal) return;
  $('#vote-cancel')?.addEventListener('click', closeVoteModal);
  $$('#vote-modal [data-vote]').forEach(b=>{
    b.addEventListener('click', ()=>{
      PENDING_VOTE = PENDING_VOTE || {};
      PENDING_VOTE.type = b.dataset.vote === 'like' ? 'like' : 'dislike';
      showEl($('#vote-form'), true);
    });
  });
  $('#vote-form')?.addEventListener('submit', onSubmitVoteForm);
}
function openVoteModal(id){
  PENDING_VOTE = {id, type:null};
  showEl($('#vote-form'), false);
  const txt=$('#vote-text'); if(txt) txt.value='';
  showEl($('#vote-modal'), true);
}
function closeVoteModal(){ showEl($('#vote-modal'), false); }

async function onSubmitVoteForm(ev){
  ev.preventDefault();
  if(!PENDING_VOTE?.id || !PENDING_VOTE?.type) return;
  const text = ($('#vote-text')?.value||'').trim();
  const submitBtn = ev.currentTarget.querySelector('button[type="submit"]');
  const old = submitBtn?.textContent;
  if(submitBtn){ submitBtn.disabled=true; submitBtn.textContent='Enviando…'; }

  try{
    const res = await fetch(API, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({type:'vote', id:PENDING_VOTE.id, vote:PENDING_VOTE.type, feedback:text, session_id:sess, user_agent:navigator.userAgent, referrer:document.referrer||''})
    });
    const json = await res.json();
    if(!json?.ok) throw new Error(json?.error||'Falha no voto');

    const s = json.stats || {};
    $('#lk-'+PENDING_VOTE.id)?.(el=>el.textContent=`👍 ${s.likes||0}`);
    const lk = document.getElementById('lk-'+PENDING_VOTE.id);
    const dk = document.getElementById('dk-'+PENDING_VOTE.id);
    const fb = document.getElementById('fb-'+PENDING_VOTE.id);
    if(lk) lk.textContent = `👍 ${s.likes||0}`;
    if(dk) dk.textContent = `👎 ${s.dislikes||0}`;
    if(fb && typeof s.feedbacks==='number') fb.textContent = `💬 ${s.feedbacks}`;

    toast('Voto validado!');
    setTimeout(closeVoteModal, 900);
  }catch(err){
    console.error(err); toast('Falha ao enviar voto');
  }finally{
    if(submitBtn){ submitBtn.disabled=false; submitBtn.textContent=old||'Enviar'; }
  }
}

/* ===== Visita ===== */
async function trackVisit(){
  try{
    await fetch(API, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({type:'visit', session_id:sess, user_agent:navigator.userAgent, referrer:document.referrer||''})
    });
  }catch(_){}
}
