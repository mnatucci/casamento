
async function carregarPresentes(){
 const r=await fetch(APP_CONFIG.GIFTS_API+'?action=list');
 const d=await r.json();
 const l=document.getElementById('giftList');
 if(!l)return;
 l.innerHTML='';
 d.forEach(p=>{
  const dis=p.status.toLowerCase()!=='disponivel';
  const c=document.createElement('div');
  c.className='gift card';
  c.innerHTML=`<strong>${p.nome}</strong><div>R$ ${p.preco}</div>
  <button ${dis?'disabled':''}
  onclick="window.open(APP_CONFIG.GIFTS_API+'?action=checkout&id=${p.id}','_blank')">
  ${dis?'Indisponível':'Presentear via PagBank'}</button>`;
  l.appendChild(c);
 });
}
document.addEventListener('DOMContentLoaded',carregarPresentes);
