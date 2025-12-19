
/* global APP_CONFIG, supabase */
const $ = (s, r=document)=>r.querySelector(s);
const $$ = (s, r=document)=>Array.from(r.querySelectorAll(s));
const toast = (msg)=>{ const el = $('#toast'); el.textContent = msg; el.classList.add('show'); setTimeout(()=> el.classList.remove('show'), 2200); };
const currencyBRL = (v)=> new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v);

const STATE = {
  gifts: [],
  sold: new Set(),
  rsvps: [],
  msgs: []
};

// Supabase client (opcional)
let supa = null;
if (window.APP_CONFIG && APP_CONFIG.SUPABASE_URL && APP_CONFIG.SUPABASE_ANON_KEY && window.supabase) {
  supa = supabase.createClient(APP_CONFIG.SUPABASE_URL, APP_CONFIG.SUPABASE_ANON_KEY);
}

// calendar links
(function buildCalendars(){
  const title = 'Casamento — Lucas & Carolina';
  const details = 'Vamos celebrar juntos! Informações no site.';
  const start = new Date('2025-03-21T10:30:00-03:00');
  const end   = new Date('2026-03-07T22:00:00-03:00');
  const toICS = (d)=> d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
  const ics = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Convite Lucas&Carolina//PT-BR\nBEGIN:VEVENT\nUID:${Date.now()}@lucas-carolina\nDTSTAMP:${toICS(new Date())}\nDTSTART:${toICS(start)}\nDTEND:${toICS(end)}\nSUMMARY:${title}\nDESCRIPTION:${details}\nEND:VEVENT\nEND:VCALENDAR`;
  const icsBlob = new Blob([ics],{type:'text/calendar;charset=utf-8'});
  $('#add-ics').href = URL.createObjectURL(icsBlob);
  const gUrl = new URL('https://calendar.google.com/calendar/render');
  gUrl.searchParams.set('action','TEMPLATE'); gUrl.searchParams.set('text',title);
  gUrl.searchParams.set('details',details); gUrl.searchParams.set('dates',`${toICS(start)}/${toICS(end)}`);
  $('#add-google').href = gUrl.toString();
})();

// storage helpers (fallback local)
const local = {
  get: (k, d=[]) => JSON.parse(localStorage.getItem(k) || JSON.stringify(d)),
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v))
};

// -------- GIFTS --------
async function loadGifts(){
  const res = await fetch('./data/gifts.json');
  const j = await res.json();
  STATE.gifts = j.gifts || [];

  if (supa) {
    // carregar presentes marcados como pagos
    const { data, error } = await supa.from('gifts_sold').select('gift_id');
    if (!error && data) {
      STATE.sold = new Set(data.map(r=>r.gift_id));
    } else {
      STATE.sold = new Set();
    }
  } else {
    STATE.sold = new Set(local.get('sold', []));
  }
}

function renderGifts(){
  const wrap = $('#giftList');
  wrap.innerHTML = '';

  const groups = ["Vamos pedir","Vamos comprar"];
  groups.forEach(group => {
    const title = document.createElement('h3');
    title.textContent = group + (group === "Vamos pedir" ? " 💍" : " 💰");
    title.style.margin = "10px 0";
    wrap.appendChild(title);

    STATE.gifts.filter(g=>g.grupo===group).forEach(g => {
      const sold = STATE.sold.has(g.id);
      const row = document.createElement('div');
      row.className = `gift card ${sold ? 'sold' : ''}`;
      row.innerHTML = `
        <img src="${g.img}" alt="${g.nome}">
        <div>
          <div class="title">${g.nome}</div>
          <div class="muted">${group==='Vamos pedir'?'Itens que vamos pedir pro novo lar':'Itens que vamos comprar ao longo do tempo'}</div>
          <div class="price" style="margin-top:6px">${currencyBRL(g.preco)}</div>
          <div style="margin-top:8px"><span class="status">${sold ? 'Esgotado / já presenteado' : 'Disponível'}</span></div>
        </div>
        <div>
          <button class="btn" ${sold ? 'disabled' : ''} data-gift="${g.id}">${sold ? 'Indisponível' : 'Escolher'}</button>
        </div>`;
      wrap.appendChild(row);
    });
  });
}

// gift modal logic
const giftModal = $('#giftModal'); let currentGift = null;
document.addEventListener('click',(e)=>{
  const btn = e.target.closest('button[data-gift]');
  if(btn){
    const id = btn.getAttribute('data-gift');
    currentGift = STATE.gifts.find(x=>x.id===id) || null;
    if(!currentGift) return;
    $('#giftTitle').textContent = currentGift.nome;
    $('#pixArea').style.display = 'none';
    $('#mpArea').style.display = 'none';
    $('#pixKey').value = (window.APP_CONFIG?.PIX_KEY)||'ccoelhomuniz@gmail.com';
    $('#pixValue').value = currentGift.preco;
    $('#mpCheckout').href = currentGift.checkout_link || 'https://pagbank.com.br/';
    giftModal.showModal();
  }
  if(e.target.matches('[data-close]')) giftModal.close();
});

$('#payPix').addEventListener('click', ()=>{
  $('#pixArea').style.display = '';
  $('#mpArea').style.display = 'none';
});
$('#payMP').addEventListener('click', ()=>{
  $('#pixArea').style.display = 'none';
  $('#mpArea').style.display = '';
});

async function marcarPresentePago(){
  if (!currentGift) return;
  if (supa) {
    await supa.from('gifts_sold').upsert({ gift_id: currentGift.id });
    const { data } = await supa.from('gifts_sold').select('gift_id');
    STATE.sold = new Set(data.map(r=>r.gift_id));
  } else {
    const soldArr = local.get('sold', []);
    if(!soldArr.includes(currentGift.id)) soldArr.push(currentGift.id);
    local.set('sold', soldArr);
    STATE.sold = new Set(soldArr);
  }
  renderGifts();
  giftModal.close();
  toast('Obrigado pelo carinho! Presente registrado. 🌻');
}

$('#markPaid').addEventListener('click', ()=>{
  marcarPresentePago();
});

// -------- RSVP --------
async function loadRSVPs(){
  if (supa) {
    const { data, error } = await supa.from('rsvps').select('*').order('created_at', { ascending: true });
    if (!error && data) {
      STATE.rsvps = data;
      return;
    }
  }
  STATE.rsvps = local.get('rsvps', []);
}

function renderRSVP(){
  const list = STATE.rsvps || [];
  $('#rsvpCount').textContent = String(list.filter(r=>r.presenca==='sim').length);
  const ul = $('#rsvpNames');
  if(ul){
    ul.innerHTML = '';
    list.slice(-30).reverse().forEach(r=>{
      const li = document.createElement('li');
      li.textContent = `${r.nome} ${r.presenca==='sim'?'✅':''}`;
      ul.appendChild(li);
    });
  }
}

$('#rsvpForm').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.currentTarget).entries());
  data.timestamp = new Date().toISOString();

  // Atualiza a UI de forma otimista
  STATE.rsvps = (STATE.rsvps || []).concat(data);
  renderRSVP();

  try {
    if (supa) {
      const { error } = await supa.from('rsvps').insert({
        nome: data.nome,
        whatsapp: data.whatsapp,
        email: data.email,
        presenca: data.presenca,
        mensagem: data.mensagem || null
      });
      if (error) {
        console.error('[RSVP] erro ao salvar no Supabase:', error);
        toast('Recebemos sua confirmação, mas houve uma falha ao salvar no servidor. Tente novamente mais tarde. 💛');
      } else {
        // recarrega da base para garantir contagem correta
        await loadRSVPs();
        renderRSVP();
        toast('Presença confirmada. Obrigado! 💛');
      }
    } else {
      const list = local.get('rsvps', []);
      list.push(data);
      local.set('rsvps', list);
      STATE.rsvps = list;
      renderRSVP();
      toast('Presença confirmada. Obrigado! 💛');
    }
  } catch (err) {
    console.error('[RSVP] erro inesperado:', err);
    toast('Sua confirmação foi enviada, mas tivemos um problema técnico. Se puder, tente novamente mais tarde. 💛');
  } finally {
    e.currentTarget.reset();
  }
});

// -------- MENSAGENS --------
async function loadMsgs(){
  if (supa) {
    const { data, error } = await supa.from('messages').select('*').order('created_at',{ascending:true});
    if (!error && data) {
      STATE.msgs = data;
      return;
    }
  }
  STATE.msgs = JSON.parse(localStorage.getItem('msgs')||'[]');
}

function renderMsgs(){
  const list = STATE.msgs || [];
  const wrap = document.getElementById('msgList');
  if(!wrap) return;
  wrap.innerHTML='';
  list.slice(-8).reverse().forEach(m=>{
    const nome = m.nome || m.author || 'Convidado';
    const texto = m.texto || m.mensagem || '';
    const card = document.createElement('div');
    card.className='card';
    card.innerHTML = `<strong>${nome}</strong><p class="muted" style="margin:6px 0 0">${texto}</p>`;
    wrap.appendChild(card);
  });
}

window.enviarMsg = async function(){
  const n = document.getElementById('msgNome').value.trim();
  const t = document.getElementById('msgTexto').value.trim();
  if(!n || !t) return;

  if (supa) {
    await supa.from('messages').insert({ nome:n, texto:t });
    await loadMsgs();
  } else {
    const list = JSON.parse(localStorage.getItem('msgs')||'[]');
    list.push({nome:n, texto:t, t:new Date().toISOString()});
    localStorage.setItem('msgs', JSON.stringify(list));
    STATE.msgs = list;
  }

  document.getElementById('msgNome').value='';
  document.getElementById('msgTexto').value='';
  renderMsgs();
  toast('Mensagem enviada com carinho!');
};

// reveal on scroll
const io = new IntersectionObserver((entries)=>{
  entries.forEach(en=>{ if(en.isIntersecting){ en.target.classList.add('visible'); io.unobserve(en.target); } });
},{threshold:.12});
$$('section').forEach(sec=> io.observe(sec));
const ioCards = new IntersectionObserver((entries)=>{
  entries.forEach(en=>{ if(en.isIntersecting){ en.target.classList.add('show'); ioCards.unobserve(en.target);} });
},{threshold:.15});
$$('.card').forEach(c=>{ c.classList.add('reveal'); ioCards.observe(c); });

async function boot(){
  await loadGifts();
  await loadRSVPs();
  await loadMsgs();
  renderGifts();
  renderRSVP();
  renderMsgs();
}
boot();


/* ===== LISTA DE PRESENTES (GOOGLE SHEETS) ===== */
async function carregarPresentes(){
  const res = await fetch(APP_CONFIG.GIFTS_API + "?action=list");
  const dados = await res.json();

  const lista = document.getElementById("giftList");
  lista.innerHTML = "";

  dados.forEach(p => {
    const indisponivel = p.status.toLowerCase() !== "disponivel";

    const card = document.createElement("div");
    card.className = "gift card" + (indisponivel ? " sold" : "");

    card.innerHTML = `
      <strong>${p.nome}</strong>
      <div class="price">R$ ${p.preco}</div>
      <button ${indisponivel ? "disabled" : ""}
        onclick="checkoutPresente(${p.id})">
        ${indisponivel ? "Indisponível" : "Presentear"}
      </button>
    `;

    lista.appendChild(card);
  });
}

async function checkoutPresente(id){
  const res = await fetch(APP_CONFIG.GIFTS_API + "?action=checkout&id=" + id);
  const data = await res.json();

  if(data.error){
    alert(data.error);
    carregarPresentes();
    return;
  }

  alert(
    "Presente reservado!\n\n" +
    "Nome: " + data.nome + "\n" +
    "Valor: R$ " + data.valor + "\n\n" +
    "Pix do casal:\n" + data.pix
  );

  carregarPresentes();
}

document.addEventListener("DOMContentLoaded", carregarPresentes);
