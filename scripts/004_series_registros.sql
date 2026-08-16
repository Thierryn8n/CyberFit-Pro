-- =====================================================================
-- CyberFit Pro - Registro de series/cargas executadas pelo aluno.
-- Rode este script no SQL Editor do Supabase (idempotente).
-- =====================================================================

create extension if not exists "pgcrypto";

create table if not exists public.series_registros (
  id            uuid primary key default gen_random_uuid(),
  aluno_id      uuid not null references public.alunos(id) on delete cascade,
  exercicio_id  uuid not null references public.exercicios(id) on delete cascade,
  treino_id     uuid references public.treinos(id) on delete set null,
  set_index     int not null,
  reps          int,
  weight        numeric(6,2),
  performed_at  timestamptz not null default now(),
  session_date  date not null default current_date,
  -- Uma linha por serie de um exercicio no dia (permite upsert / auto-save)
  unique (aluno_id, exercicio_id, session_date, set_index)
);

create index if not exists idx_series_aluno       on public.series_registros(aluno_id);
create index if not exists idx_series_exercicio   on public.series_registros(exercicio_id);
create index if not exists idx_series_treino      on public.series_registros(treino_id);
create index if not exists idx_series_session     on public.series_registros(aluno_id, session_date);

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.series_registros enable row level security;

-- Aluno le os proprios registros; instrutor e academia leem os de seus alunos.
drop policy if exists series_select on public.series_registros;
create policy series_select on public.series_registros for select
  using (
    aluno_id = auth.uid()
    or exists (
      select 1 from public.alunos a
      where a.id = series_registros.aluno_id
        and (a.instrutor_id = auth.uid() or a.academia_id = public.get_academia_id(auth.uid()))
    )
  );

-- Apenas o proprio aluno registra/edita/apaga suas series.
drop policy if exists series_insert on public.series_registros;
create policy series_insert on public.series_registros for insert
  with check (aluno_id = auth.uid());

drop policy if exists series_update on public.series_registros;
create policy series_update on public.series_registros for update
  using (aluno_id = auth.uid()) with check (aluno_id = auth.uid());

drop policy if exists series_delete on public.series_registros;
create policy series_delete on public.series_registros for delete
  using (aluno_id = auth.uid());
