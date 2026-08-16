-- Tabela de biblioteca completa de exercicios.
-- Populada a partir de github.com/Thierryn8n/exercises-dataset (1324 exercicios).
-- As colunas gif_url / image_url guardam URLs completas do CDN jsDelivr.

create table if not exists public.biblioteca_exercicios (
  id                 text primary key,          -- id do dataset (ex.: "0001")
  name               text not null,
  category           text,
  body_part          text,
  equipment          text,
  target             text,
  muscle_group       text,
  secondary_muscles  text[] default '{}',
  gif_url            text,                       -- URL completa do GIF (CDN)
  image_url          text,                       -- URL completa da imagem (CDN)
  media_id           text,
  instructions       jsonb default '{}'::jsonb,  -- { "en": "...", "es": "..." }
  instruction_steps  jsonb default '{}'::jsonb,  -- { "en": ["passo 1", ...] }
  attribution        text,
  created_at         timestamptz default now()
);

-- Indices de busca
create index if not exists idx_biblioteca_name on public.biblioteca_exercicios using gin (to_tsvector('simple', name));
create index if not exists idx_biblioteca_category on public.biblioteca_exercicios (category);
create index if not exists idx_biblioteca_equipment on public.biblioteca_exercicios (equipment);
create index if not exists idx_biblioteca_target on public.biblioteca_exercicios (target);

-- RLS: biblioteca e publica para leitura por qualquer usuario autenticado.
alter table public.biblioteca_exercicios enable row level security;

drop policy if exists "biblioteca_leitura_publica" on public.biblioteca_exercicios;
create policy "biblioteca_leitura_publica"
  on public.biblioteca_exercicios
  for select
  using (true);
