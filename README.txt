
Convite de Casamento — Lucas & Carolina (07/03/2026)
===================================================

• index.html — site principal
• assets/css/styles.css — estilos
• assets/js/main.js — lógica (RSVP, presentes, mensagens, integração opcional com banco)
• assets/js/config.example.js — configuração (Pix + Supabase)
• data/gifts.json — lista de presentes (valores, imagens, links PagBank)
• assets/img/ — imagens geradas via IA para cada presente (inclui agradecimento.png)

Como usar no GitHub Pages
-------------------------
1. Crie um repositório no GitHub.
2. Envie TODOS os arquivos desta pasta (mantendo a estrutura de diretórios).
3. Em Settings → Pages, escolha "Deploy from branch" e a branch principal.
4. Acesse a URL do GitHub Pages.

Banco de dados gratuito (Supabase)
----------------------------------
Para que as confirmações de presença, mensagens e presentes marcados como pagos
fiquem salvos em um banco de dados central (e não só no navegador de cada pessoa),
use o Supabase (plano gratuito). Ele funciona muito bem com sites estáticos como GitHub Pages.

Passo a passo resumo:
1. Acesse supabase.com e crie uma conta gratuita.
2. Crie um novo projeto (Postgres).
3. No painel do projeto, vá em "Table Editor" e crie as tabelas:

Tabela: rsvps
  id           bigint, primary key, auto increment
  nome         text
  email        text
  telefone     text
  presenca     text
  acompanhantes integer
  mensagem     text
  created_at   timestamptz, default now()

Tabela: messages
  id           bigint, primary key, auto increment
  nome         text
  texto        text
  created_at   timestamptz, default now()

Tabela: gifts_sold
  id           bigint, primary key, auto increment
  gift_id      text
  created_at   timestamptz, default now()

4. Em "Settings > API", copie:
   • Project URL  → SUPABASE_URL
   • anon public  → SUPABASE_ANON_KEY

5. Copie o arquivo assets/js/config.example.js para assets/js/config.js
   e preencha:

   window.APP_CONFIG = {
     SUPABASE_URL: "https://SEU-PROJETO.supabase.co",
     SUPABASE_ANON_KEY: "sua-chave-anon-aqui",
     PIX_KEY: "ccoelhomuniz@gmail.com"
   };

6. Suba tudo para o GitHub novamente.

Pronto:
- RSVP: cada confirmação é salva na tabela rsvps e aparece para todo mundo.
- Mensagens: cada recado vai para a tabela messages.
- Presentes pagos: cada item marcado como pago registra o gift_id em gifts_sold,
  e a lista de presentes mostra o estado atualizado (disponível/esgotado) para todos.

Se você não configurar o Supabase, o site continua funcionando normalmente,
mas com dados salvos apenas no navegador de quem está acessando (localStorage).

PagBank de forma segura
----------------------------
• Para cada item da lista, crie um LINK DE PAGAMENTO no painel do PagBank.
• Ative PARCELAMENTO nesse link, definindo o valor e as condições.
• Copie a URL do link e cole no arquivo data/gifts.json no campo "checkout_link" do item correspondente.

Assim, o checkout (nome do produto, valor e métodos de pagamento) acontece dentro do ambiente seguro do PagBank, sem expor chaves sensíveis no front-end estático.

RSVP e Lista de Presentes
-------------------------
• RSVP:
  - Com Supabase ativo: tudo fica salvo no banco e visível para todos os convidados.
  - Sem Supabase: os dados ficam apenas no navegador de quem confirma.

• Presentes:
  - Lista usa data/gifts.json para nomes, valores e imagens.
  - O botão "Checkout PagBank" abre o link configurado em checkout_link.
  - Marcando como pago:
      - Com Supabase: grava o gift_id em gifts_sold para todos verem o item esgotado.
      - Sem Supabase: marca apenas no navegador atual.

• Mensagens:
  - Com Supabase: as mensagens ficam salvas na tabela messages.
  - Sem Supabase: armazenadas localmente (localStorage).
