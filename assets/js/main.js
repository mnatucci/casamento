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

    // 🔧 NORMALIZA O ID VINDO DA PLANILHA
    const cleanId = String(g.id)
      .trim()
      .replace(/\s/g, '')
      .replace(/^0+/, '');

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

    // fallback seguro
    const img = card.querySelector('img');
    img.onerror = () => {
      img.src = defaultImg;
    };

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
    currentGift = STATE.gifts.find(x => String(x.id).trim() === String(id).trim());
    if(!currentGift) return;

    $('#giftTitle').textContent = currentGift.nome;
    $('#pixArea').style.display = 'none';
    $('#pixValue').value = currentGift.preco;
    $('#mpCheckout').href = currentGift.link || '#';
    if(giftModal) giftModal.showModal();
  }
  if(e.target.matches('[data-close]')) if(giftModal) giftModal.close();
});

// -------- BOOT --------
async function boot(){
  document.querySelectorAll('section').forEach(s => {
    s.style.opacity = '1';
    s.style.transform = 'none';
    s.style.display = 'block';
  });

  await loadGifts();
}

document.addEventListener('DOMContentLoaded', boot);
