# Agenda

Agenda de duas pessoas: metas diárias e semanais, calendário com eventos compartilhados,
treino com carga e pace, estudo com timer e tags, dinheiro individual e conjunto, e um
placar de competição entre as duas contas.

PWA estático: sem framework, sem bundler, sem build step, sem dependência. É só subir a pasta.

## Arquivos

```
index.html            marcação e estilo
js/dados.js           modelo, armazenamento local e sincronia com o Supabase
js/ui.js              telas, formulários e o placar
sw.js                 service worker: cache offline
manifest.webmanifest  identidade do PWA
supabase.sql          estrutura do banco, para colar no SQL Editor
icons/                ícones 192, 512 e maskable
```

## As abas

| Aba | Sub | O que faz |
|---|---|---|
| **Rotina** | Metas | Metas diárias e semanais. Marcar, ou contar (água em ml, pausas). Dá para ver o dia do outro em modo leitura. |
| | Agenda | Calendário do mês. Eventos podem ser privados ou compartilhados. Dois pontinhos por dia mostram quem fechou todas as metas. |
| **Dinheiro** | Individual | Ganhou, gastou, guardou e o que sobrou, mês a mês. |
| | Compartilhado | Os dois somados, mais a quebra de quem gastou e guardou quanto. |
| **Saúde** | Treino | Treinos montados por pessoa. Força grava série a série (reps × carga); cardio grava tempo e distância e calcula pace e velocidade média. |
| | Dieta | Refeições do dia, com cardápio editável. |
| **Estudo** | — | Cronômetro de sessão, aulas assistidas, baterias de questões com acertos e erros, tags de assunto e de tipo de prova, e aproveitamento por assunto. |
| **Duelo** | Semana / Mês / Geral | Placar de um contra o outro, com a quebra de onde cada ponto veio. |
| **Ajustes** | — | Conexão com o Supabase, horários, notificações, .ics e backup. |

## Ligar o compartilhamento (Supabase)

Sem isto o app funciona inteiro, só que sozinho: cada aparelho fica com os próprios dados
e nada é compartilhado. Para os dois se enxergarem:

1. Crie uma conta em [supabase.com](https://supabase.com) e um projeto novo (plano gratuito serve).
2. **SQL Editor** → cole o conteúdo de `supabase.sql` → **Run**.
3. **Authentication → Users → Add user**, duas vezes, marcando *Auto Confirm User*:
   - `luis@agenda.app`
   - `mayla@agenda.app`

   A senha definida aqui é a que passa a valer no app. Como agora ela é conferida no
   servidor, use algo melhor que `123456`.
4. **Project Settings → API**, copie *Project URL* e a chave *anon / publishable*.
5. No app: **Ajustes → Sincronização**, cole os dois valores, **Salvar e conectar**,
   depois **Sair** e entrar de novo. O ponto ao lado de "Conectado" fica verde.
6. Repita o passo 5 no outro celular.

A chave *anon* fica visível no navegador — é assim mesmo, ela é feita para isso. Quem
protege os dados é o Row Level Security do `supabase.sql`: sem login não se lê nada, e
cada conta só escreve no que é dela. **Nunca** cole aqui a chave `service_role`.

## Como a sincronia se comporta

- Tudo é gravado **primeiro no aparelho**. A tela nunca espera a internet.
- A cada mudança, um envio é agendado; ao minimizar o app, o envio sai na hora.
- Sem internet, sem servidor ou sem configuração, o app continua funcionando inteiro.
  Quando a conexão volta, ele empurra o que ficou pendente.
- Conflito entre os dois aparelhos resolve pelo mais recente, registro a registro.
- Apagar não apaga de verdade: marca `apagado`, para a exclusão também viajar.

## Login

Com Supabase configurado, a senha é conferida no servidor — é autenticação de verdade.
Sem ele, o login é local: separa os perfis no aparelho, mas **não é segurança**, porque
quem abre o código-fonte contorna.

## Instalar no Android

Chrome → abra a URL → menu ⋮ → **Adicionar à tela inicial**. Funciona offline depois da
primeira abertura. Se atualizar o app e o celular insistir na versão antiga, feche e abra
de novo — o service worker troca de versão na segunda abertura.

## Notificações

Alerta dentro do app só toca com ele aberto. Para tocar com o celular no bolso:
**Ajustes → Baixar agenda (.ics)** e importe no Google Agenda. Ele gera eventos
recorrentes com alarme para refeições, treinos, água, pausas, leitura e seus eventos
com hora marcada.

Notificação de verdade com o app fechado exigiria Web Push: chaves VAPID, um endpoint
para guardar as inscrições e um cron. Dá para fazer em cima do mesmo Supabase, mas é
outra empreitada.

## Manutenção

Cardápio base, treinos iniciais, horários de água e pausa e **quanto vale cada ponto no
Duelo** estão no topo de `js/dados.js`, nas constantes `CARDAPIO`, `TREINOS_LUIS`,
`AGUA_H`, `PAUSA_H` e `PONTOS`. As constantes só semeiam contas novas — depois disso,
metas, refeições e treinos viram dados editáveis dentro do próprio app.

Ao publicar uma versão nova, **suba o número do cache** em `sw.js`
(`const CACHE = 'agenda-vN'`), senão o celular continua servindo a versão antiga.

## Backup

**Ajustes → Backup → Exportar tudo**, copie o texto e guarde. Com o Supabase ligado os
dados já estão em dois lugares, mas backup manual não faz mal a ninguém.
