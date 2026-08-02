-- =====================================================================
-- Agenda — estrutura do banco no Supabase
--
-- Cole isto inteiro no SQL Editor do projeto e clique em Run. Roda uma
-- vez só; rodar de novo não quebra nada (tudo é "if not exists" ou
-- recriado).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. A tabela. Uma só, de propósito: um registro serve para meta,
--    evento, treino, questão, lançamento de dinheiro e configuração.
--    O que muda é a coluna `tipo` e o conteúdo de `payload`.
--    Um formato único significa uma rotina de sincronia única.
-- ---------------------------------------------------------------------
create table if not exists public.registros (
  id             uuid primary key,
  dono           text not null check (dono in ('luis','mayla')),
  tipo           text not null,
  data           date,
  payload        jsonb not null default '{}'::jsonb,
  compartilhado  boolean not null default false,
  apagado        boolean not null default false,
  atualizado_em  timestamptz not null default now()
);

-- A sincronia pergunta "o que mudou depois de tal horário?" a cada vez.
create index if not exists registros_atualizado_idx on public.registros (atualizado_em);
create index if not exists registros_dono_tipo_idx  on public.registros (dono, tipo);
create index if not exists registros_data_idx       on public.registros (data);

-- ---------------------------------------------------------------------
-- 2. Segurança por linha.
--    Sem isto, qualquer pessoa com a chave publicável (que fica no
--    código do site, à vista) leria e escreveria tudo. Com isto, é
--    preciso estar autenticado, e cada um só escreve no que é seu.
-- ---------------------------------------------------------------------
alter table public.registros enable row level security;

drop policy if exists "ler tudo"      on public.registros;
drop policy if exists "inserir o meu" on public.registros;
drop policy if exists "alterar o meu" on public.registros;

-- Leitura liberada entre as duas contas: é o ponto do app, um enxergar
-- o outro. Continua exigindo login — anônimo não lê nada.
create policy "ler tudo" on public.registros
  for select to authenticated
  using (true);

-- Escrita só no que é seu. O dono sai do e-mail do login:
-- luis@agenda.app  -> 'luis'      mayla@agenda.app -> 'mayla'
create policy "inserir o meu" on public.registros
  for insert to authenticated
  with check (dono = split_part(auth.jwt() ->> 'email', '@', 1));

create policy "alterar o meu" on public.registros
  for update to authenticated
  using      (dono = split_part(auth.jwt() ->> 'email', '@', 1))
  with check (dono = split_part(auth.jwt() ->> 'email', '@', 1));

-- Não existe policy de DELETE de propósito: o app nunca apaga de
-- verdade, só marca `apagado = true`. Assim uma exclusão feita no
-- celular também chega no outro aparelho.

-- ---------------------------------------------------------------------
-- 3. Depois de rodar isto, crie as duas contas em
--    Authentication -> Users -> Add user:
--
--      luis@agenda.app    (marque "Auto Confirm User")
--      mayla@agenda.app   (marque "Auto Confirm User")
--
--    A senha que você definir ali é a que passa a valer no app.
--    Ela agora é conferida no servidor, então vale a pena usar algo
--    melhor que 123456.
-- ---------------------------------------------------------------------
