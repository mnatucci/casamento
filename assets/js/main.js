/* global APP_CONFIG */
const $ = (s, r=document)=>r.querySelector(s);
const $$ = (s, r=document)=>Array.from(r.querySelectorAll(s));

const toast = (msg)=>{ 
  const el = $('#toast'); 
  if(el){ 
    el.textContent = msg; 
    el.classList.add('show'); 
    setTimeout(()=> el.classList.remove('show'), 3000); 
  } 
};

const currencyBRL = (v)=> new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v);

const STATE = {
  gifts: [],
  msgs: [],
  rsvpCount: 0,
  submittingRsvp: false // 🛡️ trava anti-duplicação
};

// -------- CALENDAR --------
(function buildCalendars(){
  const title = 'Casamento — Lucas & Carolina';
  const details = 'Vamos celebrar juntos! Informações no site.';
  const start = new Date('2025-03-21T10:30:00-03:00');
  const end   = new Date('2025-03-21T22:00:00-03:00');
  const toICS = (d)=> d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
  const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Convite Lucas&Carolina//PT-BR\nBEGIN:VEVENT\nUID:${Date.now()}@lucas-carolina\nDTSTAMP:${toICS(new Date())}\nDTSTART:${toICS(start)}\nDTEND:${toICS(end)}\nSUMMARY:${title}\nDESCRIPTION:${details}\nEND:VEVENT\nEND:VCALENDAR`;
  const icsBlob = new Blob([ics],{type:'text/calendar;charset=utf-8'});
  const icsBtn = $('#add-ics');
  if(icsBtn) icsBtn.href = URL.createObjectURL(icsBlob);
})();

// -------- GIFTS --------
async function loadGifts(){
  try {
    const res = await fetch(`${APP_CONFIG.API_URL}?action=list`);
    const data = await res.json();
    STATE.gifts = Array.isArray(data) ? data : [];
    renderGifts();
  } catch (e) {}
}

function renderGifts(){
  const wrap = $('#giftList');
  if(!wrap) return;
  wrap.innerHTML = '';

  if (!STATE.gifts.length) {
    wrap.innerHTML = '<p style="grid-column:1/-1;text-align:center;opacity:.6;">Carregando presentes... 🌻</p>';
    return;
  }

  STATE.gifts.forEach(g => {
    const sold = g.status && g.status.toLowerCase() !== 'disponivel';
    const cleanId = String(g.id).trim().replace(/\s/g,'').replace(/^0+/, '');
    const imgPath = `./assets/img/gifts/${cleanId}.png`;
    const defaultImg = `./assets/img/gifts/default.png`;

    const card = document.createElement('div');
    card.className = `gift card ${sold ? 'sold' : ''}`;

    card.innerHTML = `
      <img src="${imgPath}" alt="${g.nome}">
      <div class="title">${g.nome}</div>
      <div class="price">${currencyBRL(g.preco)}</div>
      <button class="btn ${sold ? 'outline' : 'primary'}" ${sold ? 'disabled' : ''} data-gift-id="${g.id}">
        ${sold ? 'Indisponível' : 'Presentear 🎁'}
      </button>
    `;

    card.querySelector('img').onerror = e => e.target.src = defaultImg;
    wrap.appendChild(card);
  });
}

// -------- RSVP COUNT --------
async function loadRsvpCount(){
  try {
    const res = await fetch(`${APP_CONFIG.API_URL}?action=presencas`);
    const data = await res.json();
    STATE.rsvpCount = Array.isArray(data)
      ? data.filter(p => p.resposta?.toLowerCase() === 'sim').length
      : data.count || data || 0;
    $('#rsvpCount').textContent = STATE.rsvpCount;
  } catch(e){}
}

// -------- RSVP FORM (FINAL) --------
const rsvpForm = document.getElementById('rsvpForm');
if (rsvpForm) {
  rsvpForm.removeAttribute('onsubmit'); // 🧹 remove HTML antigo

  rsvpForm.addEventListener('submit', (e)=>{
    e.preventDefault();
    e.stopPropagation();

    if (STATE.submittingRsvp) return;
    STATE.submittingRsvp = true;

    const fd = new FormData(rsvpForm);
    const params = new URLSearchParams({
      action: 'presenca',
      nome: fd.get('nome'),
      whatsapp: fd.get('whatsapp'),
      email: fd.get('email'),
      resposta: fd.get('presenca'),
      mensagem: fd.get('mensagem') || ''
    });

    fetch(`${APP_CONFIG.API_URL}?${params.toString()}`, { mode:'no-cors' });

    toast('Presença confirmada com sucesso! 💛');
    rsvpForm.reset();

    if(fd.get('presenca') === 'sim'){
      STATE.rsvpCount++;
      $('#rsvpCount').textContent = STATE.rsvpCount;
    }

    setTimeout(()=>{
      loadRsvpCount();
      STATE.submittingRsvp = false;
    }, 2000);
  });
}

// -------- MESSAGES --------
async function loadMessages(){
  try {
    const res = await fetch(`${APP_CONFIG.API_URL}?action=mensagens`);
    const data = await res.json();
    STATE.msgs = Array.isArray(data) ? data : (data.mensagens || []);
    renderMessages();
  } catch(e){}
}

function renderMessages(){
  const wrap = $('#msgList');
  if(!wrap) return;
  if(!STATE.msgs.length){
    wrap.innerHTML = '<p style="text-align:center;opacity:.6;">Seja o primeiro a deixar um recado! 💛</p>';
    return;
  }
  wrap.innerHTML = '';
  [...STATE.msgs].reverse().forEach(m=>{
    const d=document.createElement('div');
    d.className='message-item';
    d.innerHTML=`<strong>${escapeHtml(m.nome||'')}</strong><div>${escapeHtml(m.mensagem||'')}</div>`;
    wrap.appendChild(d);
  });
}

function escapeHtml(t){
  const d=document.createElement('div');
  d.textContent=t;
  return d.innerHTML;
}

// -------- BOOT --------
document.addEventListener('DOMContentLoaded', ()=>{
  loadGifts();
  loadRsvpCount();
  loadMessages();
});
