
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
  msgs: []
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
    // Fallback
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
    const card = document.createElement('div');
    card.className = `gift card ${sold ? 'sold' : ''}`;
    
    const defaultImg = `./assets/img/gifts/default.png`;

    card.innerHTML = `
      <img src="${defaultImg}" alt="${g.nome}">
      <div class="title">${g.nome}</div>
      <div class="price">${currencyBRL(g.preco)}</div>
      <span class="status">${sold ? 'Já presenteado' : 'Disponível'}</span>
      <button class="btn ${sold ? 'outline' : 'primary'}" ${sold ? 'disabled' : ''} data-gift-id="${g.id}">
        ${sold ? 'Indisponível' : 'Presentear 🎁'}
      </button>`;
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
    if(giftModal) giftModal.showModal();
  }
  if(e.target.matches('[data-close]')) if(giftModal) giftModal.close();
});

$('#payPix')?.addEventListener('click', () => {
  $('#pixArea').style.display = 'block';
});

$('#markPaid')?.addEventListener('click', () => {
  toast('Obrigado! Após o Pix, o item será atualizado em breve. 🌻');
  if(giftModal) giftModal.close();
});

// -------- RSVP --------
$('#rsvpForm')?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const formData = new FormData(e.currentTarget);
  const btn = e.currentTarget.querySelector('button');
  const originalText = btn.textContent;
  
  btn.disabled = true;
  btn.textContent = 'Enviando...';

  try {
    const url = `${APP_CONFIG.API_URL}?action=presenca&nome=${encodeURIComponent(formData.get('nome'))}&resposta=${encodeURIComponent(formData.get('presenca'))}`;
    await fetch(url, { mode: 'no-cors' });
    toast('Presença confirmada com sucesso! 💛');
    e.currentTarget.reset();
  } catch (err) {
    toast('Erro ao enviar. Tente novamente. 💛');
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
});

// -------- MESSAGES --------
window.enviarMsg = async function(){
  const n = $('#msgNome').value.trim();
  const t = $('#msgTexto').value.trim();
  if(!n || !t) return;

  const btn = $('#recados button');
  btn.disabled = true;

  try {
    const url = `${APP_CONFIG.API_URL}?action=mensagem&nome=${encodeURIComponent(n)}&mensagem=${encodeURIComponent(t)}`;
    await fetch(url, { mode: 'no-cors' });
    toast('Mensagem enviada com carinho! ✨');
    $('#msgNome').value = '';
    $('#msgTexto').value = '';
  } catch (err) {
    toast('Erro ao enviar mensagem.');
  } finally {
    btn.disabled = false;
  }
};

// -------- INTERSECTION OBSERVER --------
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, observerOptions);

function initAnimations() {
  if (window.innerWidth > 900) {
    $$('section').forEach(section => observer.observe(section));
  } else {
    $$('section').forEach(section => section.classList.add('visible'));
  }
}

// -------- BOOT --------
async function boot(){
  initAnimations();
  await loadGifts();
}

document.addEventListener('DOMContentLoaded', boot);
