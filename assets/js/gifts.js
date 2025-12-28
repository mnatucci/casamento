
// LISTA DE PRESENTES - Google Sheets
async function carregarPresentes() {
  const el = document.getElementById("giftList");
  if (!el) return;
  el.innerHTML = "Carregando presentes...";
  try {
    const res = await fetch("https://script.google.com/macros/s/AKfycbwNvsLEBFFNQHEWjJWhNVAzLa7vZprl1PmbYbUPw_pQbYI8-DFNnB07gqzz7B9N-7aZ/exec?action=list");
    const data = await res.json();
    el.innerHTML = "";
    data.forEach(p => {
      if (String(p.status).toUpperCase() !== "DISPONIVEL") return;
      const card = document.createElement("div");
      card.className = "gift card";
      card.innerHTML = `
        <strong>${p.nome}</strong>
        <div class="price">R$ ${p.preco}</div>
        <a href="${p.link}" target="_blank">
          <button>Presentear 🎁</button>
        </a>`;
      el.appendChild(card);
    });
  } catch (e) {
    el.innerHTML = "Erro ao carregar presentes";
    console.error(e);
  }
}
document.addEventListener("DOMContentLoaded", carregarPresentes);
