# Agenda — Luís

App de agenda diária com checks, aderência semanal/mensal, controle de água e balanço financeiro.
PWA estático: sem backend, sem banco, sem build. É só subir a pasta.

## Arquivos

```
index.html               o app inteiro
manifest.webmanifest     identidade do PWA (nome, ícone, cor)
sw.js                    service worker: cache offline
icons/                   ícones 192, 512 e maskable
```

## Como subir

Qualquer host estático com HTTPS serve. **HTTPS não é opcional**: sem ele o Android não instala como app nem libera notificação.

**Vercel (mais rápido)**
1. Entre em vercel.com e faça login.
2. "Add New… → Project → Deploy" e arraste a pasta inteira.
3. Sem framework, sem build command, output directory = a raiz.
4. Sai uma URL `https://algo.vercel.app`. Pronto.

Alternativas equivalentes: Netlify (arrasta a pasta em app.netlify.com/drop), Cloudflare Pages, GitHub Pages.

## Instalar no Android

1. Abra a URL no **Chrome**.
2. Menu ⋮ → **Adicionar à tela inicial** → Instalar.
3. O ícone aparece na gaveta de apps e abre em tela cheia, sem barra de navegador.
4. Funciona offline depois da primeira abertura.

## Notificações — leia esta parte

São três camadas, e só a primeira funciona com o celular no bolso.

### 1. Calendário (.ics) — a que realmente funciona
Ajustes → "Calendário" → escolha o horário do treino → **Baixar agenda (.ics)**.
No Android: toque no arquivo baixado e escolha importar no Google Agenda. Ou, pelo computador, em
calendar.google.com → Configurações → Importar e exportar → Importar.

Cria eventos recorrentes com alarme para:
- 5 refeições por dia, com o cardápio do dia escrito na descrição
- treino nos dias certos (A a E, segunda a sexta)
- água às 8h, 11h, 14h, 17h e 20h
- levantar e andar de hora em hora, 9h–18h, segunda a sexta (pode ser desligado em Ajustes)
- estudo (seg–sex, 21h) e leitura (diária, 22h20)

Depois disso o Android notifica sozinho, para sempre, sem depender do app estar aberto.
Se mudar o horário do treino depois, apague os eventos antigos e gere de novo.

### 2. Alertas no app
Ajustes → "Ativar notificações". Dispara enquanto o app estiver aberto — no computador durante
o dia de trabalho funciona bem. **Não** funciona com o app fechado.

### 3. Notificação com o app fechado, vinda do próprio app
Exigiria Web Push: servidor, chaves VAPID, banco de assinaturas e um cron. É viável na Vercel
(serverless function + Vercel Cron + KV), mas deixa de ser um site estático e passa a ter
manutenção. A camada 1 entrega o mesmo resultado sem nada disso.

## Onde os dados ficam

No armazenamento do próprio navegador do celular. Não sobem para lugar nenhum.

Consequências:
- limpar dados do Chrome apaga tudo
- desinstalar o app pode apagar tudo
- não sincroniza entre celular e computador

**Faça backup uma vez por mês:** Ajustes → Backup → Exportar tudo → copie o texto e guarde
(e-mail para si mesmo já resolve). Para restaurar, cole o mesmo texto e clique em Importar.

## A barra de conversa embaixo

Escrever "adicione dentista terça 15h" só funciona **dentro do Claude**, onde a chamada à API é
autenticada automaticamente. No seu domínio ela não vai funcionar — não há chave de API, e colocar
uma no código de um site público exporia a chave para qualquer pessoa.

No app hospedado, use:
- **Adicionar à mão** (aba Dia) para compromissos avulsos
- **Backup e importação** (Ajustes) para colar blocos JSON gerados no chat, no formato:

```json
{"add":[{"date":"2026-08-11","cat":"outro","title":"Dentista","time":"15:00","detail":""}],
 "tx":[{"date":"2026-08-11","type":"out","amount":180.00,"desc":"Dentista"}]}
```

## Manutenção

O cardápio, os treinos e os horários estão no topo do `<script>` em `index.html`, nas constantes
`CARDAPIO`, `TREINO` e `AGUA_H`. Mudou o plano, edite ali e suba de novo. Dias já criados mantêm o
conteúdo antigo — use "Regerar rotina do dia" para atualizar um dia específico.
