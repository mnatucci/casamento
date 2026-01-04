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
  rsvpCount: 0
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
    if (!res.ok) throw new Error('API Error');
    const data = await res.json();
    STATE.gifts = Array.isArray(data) ? data : [];
    renderGifts();
  } catch (err) {
    console.error('API Load Error:', err);
    try {
      const localRes = await fetch('./data/gifts.json');
      const localData = await localRes.json();
      STATE.gifts = localData.gifts || [];
      renderGifts();
    } catch (e) {}
  }
}

function renderGifts(){
  const wrap = $('#giftList');
  if(!wrap) return;
  wrap.innerHTML = '';

  if (STATE.gifts.length === 0) {
    wrap.innerHTML = '<p style="grid-column: 1/-1; text-align: center; opacity: 0.6;">Carregando presentes... 🌻</p>';
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

    const img = card.querySelector('img');
    img.onerror = () => img.src = defaultImg;

    wrap.appendChild(card);
  });
}

// -------- MODAL --------
const giftModal = $('#giftModal'); 
let currentGift = null;

document.addEventListener('click', (e)=>{
  const btn = e.target.closest('button[data-gift-id]');
  if(btn){
    const id = btn.getAttribute('data-gift-id');
    currentGift = STATE.gifts.find(x => String(x.id) === String(id));
    if(!currentGift) return;

    $('#giftTitle').textContent = currentGift.nome;
    $('#pixArea').style.display = 'none';
    $('#pixValue').value = currentGift.preco;
    $('#mpCheckout').href = currentGift.link || '#';
    giftModal?.showModal();
  }
  if(e.target.matches('[data-close]')) giftModal?.close();
});

$('#payPix')?.addEventListener('click', () => {
  $('#pixArea').style.display = 'block';
});

$('#markPaid')?.addEventListener('click', () => {
  toast('Obrigado! Após o Pix, o item será atualizado em breve. 🌻');
  giftModal?.close();
});

// -------- RSVP COUNT --------
async function loadRsvpCount(){
  try {
    const res = await fetch(`${APP_CONFIG.API_URL}?action=presencas`);
    const data = await res.json();

    if (typeof data === 'object' && data.count !== undefined) {
      STATE.rsvpCount = data.count;
    } else if (Array.isArray(data)) {
      STATE.rsvpCount = data.filter(p => p.resposta?.toLowerCase() === 'sim').length;
    } else if (typeof data === 'number') {
      STATE.rsvpCount = data;
    }

    updateRsvpDisplay();
  } catch (err) {
    console.error('Erro ao carregar presenças:', err);
  }
}

function updateRsvpDisplay(){
  const countEl = $('#rsvpCount');
  if(countEl) countEl.textContent = STATE.rsvpCount;
}

// -------- RSVP FORM (CORRIGIDO) --------
$('#rsvpForm')?.addEventListener('submit', (e)=>{
  e.preventDefault();
  const formData = new FormData(e.currentTarget);

  const params = new URLSearchParams({
    action: 'presenca',
    nome: formData.get('nome'),
    whatsapp: formData.get('whatsapp'),
    email: formData.get('email'),
    resposta: formData.get('presenca'),
    mensagem: formData.get('mensagem') || ''
  });

  fetch(`${APP_CONFIG.API_URL}?${params.toString()}`, { mode: 'no-cors' });

  toast('Presença confirmada com sucesso! 💛');
  e.currentTarget.reset();

  if(formData.get('presenca') === 'sim'){
    STATE.rsvpCount++;
    updateRsvpDisplay();
  }

  setTimeout(loadRsvpCount, 2000);
});

// -------- MESSAGES --------
async function loadMessages(){
  try {
    const res = await fetch(`${APP_CONFIG.API_URL}?action=mensagens`);
    const data = await res.json();
    STATE.msgs = Array.isArray(data) ? data : (data.mensagens || []);
    renderMessages();
  } catch (err) {
    console.error('Erro ao carregar mensagens:', err);
  }
}

function renderMessages(){
  const wrap = $('#msgList');
  if(!wrap) return;

  if(STATE.msgs.length === 0){
    wrap.innerHTML = '<p style="text-align:center;opacity:.6;">Seja o primeiro a deixar um recado! 💛</p>';
    return;
  }

  wrap.innerHTML = '';
  [...STATE.msgs].reverse().forEach(msg => {
    const el = document.createElement('div');
    el.className = 'message-item';
    el.innerHTML = `<strong>${escapeHtml(msg.nome||'')}</strong><div>${escapeHtml(msg.mensagem||'')}</div>`;
    wrap.appendChild(el);
  });
}

function escapeHtml(text){
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}

// -------- BOOT --------
async function boot(){
  document.querySelectorAll('section').forEach(s => {
    s.style.opacity = '1';
    s.style.transform = 'none';
    s.style.display = 'block';
  });

  await Promise.all([
    loadGifts(),
    loadRsvpCount(),
    loadMessages()
  ]);
}

document.addEventListener('DOMContentLoaded', boot);
