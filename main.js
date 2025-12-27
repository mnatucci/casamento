const PIX_KEY = "3296d2a7-0376-490b-a3f1-af0ee552861b";

function doGet(e) {
  const action = e.parameter.action;

  if (action === "list") {
    return listarPresentes();
  }

  if (action === "checkout") {
    return gerarPagamento(e);
  }

  return json({ error: "Ação inválida" });
}

function listarPresentes() {
  const sheet = SpreadsheetApp.getActive().getSheetByName("presentes");
  const rows = sheet.getDataRange().getValues().slice(1);

  const data = rows.map(r => ({
    id: r[0],
    nome: r[1],
    preco: r[2],
    status: r[3]
  }));

  return json(data);
}

function gerarPagamento(e) {
  const id = e.parameter.id;
  const sheet = SpreadsheetApp.getActive().getSheetByName("presentes");
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      if (data[i][3] === "INDISPONIVEL") {
        return json({ error: "Presente indisponível" });
      }

      sheet.getRange(i + 1, 4).setValue("INDISPONIVEL");
      sheet.getRange(i + 1, 5).setValue(new Date());

      return json({
        nome: data[i][1],
        valor: data[i][2],
        pix: PIX_KEY
      });
    }
  }

  return json({ error: "Presente não encontrado" });
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
