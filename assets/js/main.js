
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
    const card = document.createElement('div');
    card.className = `gift card ${sold ? 'sold' : ''}`;
    
    const imgPath = g.img || './assets/img/gifts/default.png';
const defaultImg = `./assets/img/gifts/default.png`;

    card.innerHTML = `
      <div class="gift-image">
  <img src="${imgPath}" alt="${g.nome}" onerror="this.src='${defaultImg}'">
</div>
      <div class="title">${g.nome}</div>
      <div class="price">${currencyBRL(g.preco)}</div>
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

// -------- RSVP COUNT --------
async function loadRsvpCount(){
  try {
    const res = await fetch(`${APP_CONFIG.API_URL}?action=presencas`);
    if (!res.ok) throw new Error('API Error');
    const data = await res.json();
    
    // A API pode retornar um objeto com count ou um array de presenças
    if (typeof data === 'object' && data.count !== undefined) {
      STATE.rsvpCount = data.count;
    } else if (Array.isArray(data)) {
      // Conta apenas as presenças confirmadas (resposta = "sim")
      STATE.rsvpCount = data.filter(p => p.resposta && p.resposta.toLowerCase() === 'sim').length;
    } else if (typeof data === 'number') {
      STATE.rsvpCount = data;
    }
    
    updateRsvpDisplay();
  } catch (err) {
    console.error('Erro ao carregar presenças:', err);
    // Tenta formato alternativo de API
    try {
      const res = await fetch(`${APP_CONFIG.API_URL}?action=contarPresencas`);
      if (res.ok) {
        const data = await res.json();
        STATE.rsvpCount = data.count || data.total || 0;
        updateRsvpDisplay();
      }
    } catch (e) {
      console.error('Erro ao carregar contagem alternativa:', e);
    }
  }
}

function updateRsvpDisplay(){
  const countEl = $('#rsvpCount');
  if(countEl){
    countEl.textContent = STATE.rsvpCount;
  }
}

// -------- RSVP FORM --------
$('#rsvpForm')?.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const formData = new FormData(e.currentTarget);
  const btn = e.currentTarget.querySelector('button');
  const originalText = btn.textContent;
  
  btn.disabled = true;
  btn.textContent = 'Enviando...';

  try {
    const params = new URLSearchParams({
      action: 'presenca',
      nome: formData.get('nome'),
      whatsapp: formData.get('whatsapp'),
      email: formData.get('email'),
      resposta: formData.get('presenca'),
      mensagem: formData.get('mensagem') || ''
    });
    
    const url = `${APP_CONFIG.API_URL}?${params.toString()}`;
    await fetch(url, { mode: 'no-cors' });
    toast('Presença confirmada com sucesso! 💛');
    e.currentTarget.reset();
    
    // Atualiza o contador se a resposta foi "sim"
    if(formData.get('presenca') === 'sim'){
      STATE.rsvpCount++;
      updateRsvpDisplay();
    }
    
    // Recarrega o contador da API após um pequeno delay
    setTimeout(loadRsvpCount, 2000);
  } catch (err) {
    toast('Erro ao enviar. Tente novamente. 💛');
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
});

// -------- MESSAGES --------
async function loadMessages(){
  try {
    const res = await fetch(`${APP_CONFIG.API_URL}?action=mensagens`);
    if (!res.ok) throw new Error('API Error');
    const data = await res.json();
    STATE.msgs = Array.isArray(data) ? data : (data.mensagens || []);
    renderMessages();
  } catch (err) {
    console.error('Erro ao carregar mensagens:', err);
    // Tenta formato alternativo
    try {
      const res = await fetch(`${APP_CONFIG.API_URL}?action=recados`);
      if (res.ok) {
        const data = await res.json();
        STATE.msgs = Array.isArray(data) ? data : (data.recados || []);
        renderMessages();
      }
    } catch (e) {
      console.error('Erro ao carregar recados:', e);
    }
  }
}

function renderMessages(){
  const wrap = $('#msgList');
  if(!wrap) return;
  
  if(STATE.msgs.length === 0){
    wrap.innerHTML = '<p style="text-align: center; opacity: 0.6; padding: 20px;">Seja o primeiro a deixar um recado! 💛</p>';
    return;
  }
  
  wrap.innerHTML = '';
  
  // Ordena mensagens da mais recente para a mais antiga (se houver data)
  const sortedMsgs = [...STATE.msgs].reverse();
  
  sortedMsgs.forEach(msg => {
    const msgEl = document.createElement('div');
    msgEl.className = 'message-item';
    msgEl.style.cssText = 'background: var(--bg-card, #f9f9f9); padding: 15px; border-radius: 12px; margin-bottom: 12px; border-left: 3px solid var(--primary, #D4A574);';
    
    const nome = msg.nome || msg.name || 'Anônimo';
    const texto = msg.mensagem || msg.texto || msg.message || msg.recado || '';
    const data = msg.data || msg.date || msg.timestamp || '';
    
    msgEl.innerHTML = `
      <div style="font-weight: 600; color: var(--primary, #D4A574); margin-bottom: 5px;">${escapeHtml(nome)}</div>
      <div style="color: var(--text, #333); line-height: 1.5;">${escapeHtml(texto)}</div>
      ${data ? `<div style="font-size: 0.75rem; color: var(--text-muted, #888); margin-top: 8px;">${formatDate(data)}</div>` : ''}
    `;
    wrap.appendChild(msgEl);
  });
}

// Função para escapar HTML e prevenir XSS
function escapeHtml(text){
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Função para formatar data
function formatDate(dateStr){
  try {
    const date = new Date(dateStr);
    if(isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch(e){
    return dateStr;
  }
}

window.enviarMsg = async function(){
  const n = $('#msgNome').value.trim();
  const t = $('#msgTexto').value.trim();
  if(!n || !t) {
    toast('Por favor, preencha seu nome e mensagem.');
    return;
  }

  const btn = $('#recados button');
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Enviando...';

  try {
    const params = new URLSearchParams({
      action: 'mensagem',
      nome: n,
      mensagem: t
    });
    
    const url = `${APP_CONFIG.API_URL}?${params.toString()}`;
    await fetch(url, { mode: 'no-cors' });
    toast('Mensagem enviada com carinho! ✨');
    
    // Adiciona a mensagem localmente para feedback imediato
    STATE.msgs.push({ nome: n, mensagem: t, data: new Date().toISOString() });
    renderMessages();
    
    $('#msgNome').value = '';
    $('#msgTexto').value = '';
    
    // Recarrega as mensagens da API após um pequeno delay
    setTimeout(loadMessages, 2000);
  } catch (err) {
    toast('Erro ao enviar mensagem.');
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
};

// -------- BOOT --------
async function boot(){
  // Garantir que todas as seções estejam visíveis
  document.querySelectorAll('section').forEach(s => {
    s.style.opacity = '1';
    s.style.transform = 'none';
    s.style.display = 'block';
  });
  
  // Carrega todos os dados em paralelo
  await Promise.all([
    loadGifts(),
    loadRsvpCount(),
    loadMessages()
  ]);
}

document.addEventListener('DOMContentLoaded', boot);
