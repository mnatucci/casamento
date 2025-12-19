
const sb = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

document.getElementById("rsvpForm").addEventListener("submit", async e => {
 e.preventDefault();
 const {error} = await sb.from("presencas").insert([{
  nome:nome.value, whatsapp:whatsapp.value, email:email.value, presenca:presenca.value
 }]);
 msg.textContent = error ? "Erro ao enviar" : "Presença confirmada ❤️";
});

async function loadGifts(){
 const r = await fetch(CONFIG.GIFTS_API + "?action=list");
 const d = await r.json();
 const list = document.getElementById("giftList");
 list.innerHTML="";
 d.forEach(p=>{
  const dis = p.status.toLowerCase()!=="disponivel";
  const div=document.createElement("div");
  div.className="gift";
  div.innerHTML=`<strong>${p.nome}</strong><p>R$ ${p.preco}</p>
  <button ${dis?"disabled":""}
  onclick="window.open(CONFIG.GIFTS_API+'?action=checkout&id=${p.id}','_blank')">
  ${dis?"Indisponível":"Presentear (Pix/PagBank)"}</button>`;
  list.appendChild(div);
 });
}
loadGifts();
