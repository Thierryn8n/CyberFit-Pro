-- Adiciona a coluna de nome traduzido (pt-BR) na biblioteca de exercicios.
-- O nome original em ingles fica preservado em "name" como fallback.

alter table public.biblioteca_exercicios
  add column if not exists name_pt text;

-- Index para busca por nome traduzido
create index if not exists biblioteca_exercicios_name_pt_idx
  on public.biblioteca_exercicios using gin (to_tsvector('portuguese', coalesce(name_pt, '')));
