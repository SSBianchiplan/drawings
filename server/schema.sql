-- GPlanSiS|Drawings — esquema do servidor (PostgreSQL 16+). Idempotente.
-- Usuários com papel + permissões, sessões, desenhos versionados com
-- compartilhamento, lixeira e histórico; registro de acessos à parte.
create schema if not exists drawings;
set search_path = drawings;

create table if not exists usuarios (
  id            bigserial primary key,
  login         text not null,                  -- e-mail
  nome          text not null,
  cargo         text,
  papel         text not null check (papel in ('ADMIN','PROJETISTA','REVISOR','CONSULTA')),
  permissoes    text[],                         -- null = padrão do papel
  ativo         boolean not null default true,
  master        boolean not null default false, -- administrador master: não rebaixa, não desativa
  senha_hash    text not null,
  trocar_senha  boolean not null default true,
  falhas        int not null default 0,
  bloqueado_ate timestamptz,
  avatar        bytea,
  avatar_tipo   text,
  avatar_ver    int not null default 0,
  prefs         jsonb not null default '{}'::jsonb,
  criado_em     timestamptz not null default now(),
  criado_por    text,
  atualizado_em timestamptz not null default now(),
  ultimo_login  timestamptz,
  constraint master_e_admin check (not master or (papel = 'ADMIN' and ativo)),
  constraint avatar_limite check (avatar is null or octet_length(avatar) <= 400000)
);
create unique index if not exists usuarios_login_uk on usuarios (lower(login));
-- última tentativa errada: o contador de falhas zera quando ela fica antiga (antes, nunca zerava)
alter table usuarios add column if not exists ultima_falha timestamptz;

create table if not exists sessoes (
  token_hash  text primary key,
  usuario_id  bigint not null references usuarios(id) on delete cascade,
  criado_em   timestamptz not null default now(),
  expira_em   timestamptz not null,
  ultimo_uso  timestamptz not null default now(),
  ip          text,
  ua          text
);
create index if not exists sessoes_usuario_ix on sessoes (usuario_id);

create table if not exists desenhos (
  id             bigserial primary key,
  nome           text not null check (length(nome) between 1 and 160),
  dono_id        bigint not null references usuarios(id),
  doc            jsonb not null,
  versao         int not null default 1,
  bytes          int not null default 0,
  objetos        int not null default 0,
  miniatura      text,                          -- data:image/webp|png pequena
  equipe         text check (equipe in ('LER','EDITAR')), -- null = só convidados
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now(),
  atualizado_por text,
  excluido_em    timestamptz                    -- não nulo = na lixeira
);
create index if not exists desenhos_dono_ix on desenhos (dono_id, atualizado_em desc);

create table if not exists desenho_acesso (
  desenho_id bigint not null references desenhos(id) on delete cascade,
  usuario_id bigint not null references usuarios(id) on delete cascade,
  nivel      text not null check (nivel in ('LER','EDITAR')),
  primary key (desenho_id, usuario_id)
);
create index if not exists desenho_acesso_usuario_ix on desenho_acesso (usuario_id);

create table if not exists desenho_versoes (
  desenho_id bigint not null references desenhos(id) on delete cascade,
  versao     int not null,
  nome       text not null,
  doc        jsonb not null,
  bytes      int not null,
  objetos    int not null,
  salvo_em   timestamptz not null default now(),
  salvo_por  text,
  primary key (desenho_id, versao)
);

create table if not exists acessos (
  id         bigserial primary key,
  ts         timestamptz not null default now(),
  usuario_id bigint,
  login      text,
  evento     text not null,
  ip         text,
  ua         text,
  detalhe    text
);
create index if not exists acessos_ts_ix on acessos (ts desc);

-- Configurações do sistema editáveis pelo painel (ex.: Assistente IA).
-- Segredos ficam cifrados (Fernet, chave em DRAWINGS_SEGREDO no .env), nunca em claro.
create table if not exists config (
  chave          text primary key,
  valor          jsonb not null,
  atualizado_em  timestamptz not null default now(),
  atualizado_por text
);

-- Integração com o GPlanSiS|Docs: cada desenho enviado vira um documento (tipo Desenho) no Docs.
-- O estado (revisões, status, comentários) chega por evento assinado e fica aqui em cache.
create table if not exists docs_vinculo (
  desenho_id     bigint primary key references desenhos(id) on delete cascade,
  doc_id         text not null unique,
  projeto_id     text,
  projeto_codigo text,
  codigo         text,
  titulo         text,
  revisao_id     text,
  revisao_label  text,
  revisao_status text,
  finalidade     text,
  estado         jsonb not null default '{}'::jsonb,
  plot           jsonb,                       -- transformação da plotagem enviada (página → modelo)
  versao_enviada int,
  enviado_em     timestamptz,
  enviado_por    text,
  ultimo_evento  bigint not null default 0,
  atualizado_em  timestamptz not null default now()
);

create table if not exists sso_nonce (
  nonce     text primary key,
  expira_em timestamptz not null
);

