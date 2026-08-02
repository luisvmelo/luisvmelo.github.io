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

## Compartilhamento (Supabase)

O projeto já está ligado. A URL e a chave *publicável* estão em `SB_PADRAO`, no topo de
`js/dados.js`, e o schema de `supabase.sql` já foi aplicado — tabela criada, RLS ligado,
três policies no lugar. Nenhum aparelho precisa configurar nada.

As duas contas já existem, confirmadas: `luis@agenda.app` e `mayla@agenda.app`. Os
endereços têm que ser exatamente esses — o RLS descobre o dono de cada registro pelo que
vem antes do `@`, e a tabela só aceita `luis` ou `mayla`.

**A senha é a única coisa entre a internet e os seus dados**, porque a chave publicável
está à vista no código e o repositório é público. Para trocar:
Authentication → Users → clique no usuário → *Reset password*. Não precisa mexer no app.

Se o servidor recusar o login (conta apagada, senha trocada, projeto pausado), o app não
trava: entra em modo local, avisa na tela e para de compartilhar até resolver.

A chave publicável ficar exposta é o desenho normal do Supabase: sozinha ela não lê nada.
Verificado neste projeto — sem login, leitura volta vazia e escrita é recusada pelo RLS.
**Nunca** coloque no código a `service_role` nem a `sb_secret_...`: essas ignoram o RLS.

Para apontar o app a outro projeto, use **Ajustes → Sincronização** — o que for salvo ali
vence o padrão embutido. "Desconectar" desliga a sincronia e volta ao modo local.

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
