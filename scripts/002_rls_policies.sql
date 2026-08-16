-- =====================================================================
-- CyberFit Pro - Row Level Security
-- Rode este script DEPOIS de 001_init_schema.sql
-- =====================================================================

alter table public.profiles    enable row level security;
alter table public.academias   enable row level security;
alter table public.instrutores enable row level security;
alter table public.alunos      enable row level security;
alter table public.invites     enable row level security;
alter table public.treinos     enable row level security;
alter table public.exercicios  enable row level security;
alter table public.agenda      enable row level security;
alter table public.avaliacoes  enable row level security;
alter table public.pagamentos  enable row level security;

-- ---------- PROFILES -------------------------------------------------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select
  using (
    id = auth.uid()
    or public.get_academia_id(id) = public.get_academia_id(auth.uid())
  );

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles for insert
  with check (id = auth.uid());

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update
  using (id = auth.uid());

-- ---------- ACADEMIAS ------------------------------------------------
drop policy if exists academias_select on public.academias;
create policy academias_select on public.academias for select
  using (id = auth.uid() or id = public.get_academia_id(auth.uid()));

drop policy if exists academias_insert on public.academias;
create policy academias_insert on public.academias for insert
  with check (id = auth.uid());

drop policy if exists academias_update on public.academias;
create policy academias_update on public.academias for update
  using (id = auth.uid());

-- ---------- INSTRUTORES ----------------------------------------------
drop policy if exists instrutores_select on public.instrutores;
create policy instrutores_select on public.instrutores for select
  using (
    id = auth.uid()
    or academia_id = public.get_academia_id(auth.uid())
  );

drop policy if exists instrutores_insert on public.instrutores;
create policy instrutores_insert on public.instrutores for insert
  with check (id = auth.uid());

drop policy if exists instrutores_update on public.instrutores;
create policy instrutores_update on public.instrutores for update
  using (id = auth.uid() or academia_id = public.get_academia_id(auth.uid()));

-- ---------- ALUNOS ---------------------------------------------------
drop policy if exists alunos_select on public.alunos;
create policy alunos_select on public.alunos for select
  using (
    id = auth.uid()
    or instrutor_id = auth.uid()
    or academia_id = public.get_academia_id(auth.uid())
  );

drop policy if exists alunos_insert on public.alunos;
create policy alunos_insert on public.alunos for insert
  with check (id = auth.uid());

drop policy if exists alunos_update on public.alunos;
create policy alunos_update on public.alunos for update
  using (
    id = auth.uid()
    or instrutor_id = auth.uid()
    or academia_id = public.get_academia_id(auth.uid())
  );

-- ---------- INVITES --------------------------------------------------
drop policy if exists invites_select on public.invites;
create policy invites_select on public.invites for select
  using (
    created_by = auth.uid()
    or academia_id = public.get_academia_id(auth.uid())
  );
-- insercao/consumo de convites ocorre via RPC security definer.

-- ---------- TREINOS --------------------------------------------------
drop policy if exists treinos_select on public.treinos;
create policy treinos_select on public.treinos for select
  using (
    aluno_id = auth.uid()
    or instrutor_id = auth.uid()
    or exists (select 1 from public.alunos a where a.id = treinos.aluno_id
               and a.academia_id = public.get_academia_id(auth.uid()))
  );

drop policy if exists treinos_write on public.treinos;
create policy treinos_write on public.treinos for all
  using (instrutor_id = auth.uid())
  with check (instrutor_id = auth.uid());

-- ---------- EXERCICIOS -----------------------------------------------
drop policy if exists exercicios_select on public.exercicios;
create policy exercicios_select on public.exercicios for select
  using (
    exists (
      select 1 from public.treinos t
      where t.id = exercicios.treino_id
        and (t.aluno_id = auth.uid() or t.instrutor_id = auth.uid())
    )
  );

drop policy if exists exercicios_write on public.exercicios;
create policy exercicios_write on public.exercicios for all
  using (
    exists (select 1 from public.treinos t where t.id = exercicios.treino_id and t.instrutor_id = auth.uid())
  )
  with check (
    exists (select 1 from public.treinos t where t.id = exercicios.treino_id and t.instrutor_id = auth.uid())
  );

-- ---------- AGENDA ---------------------------------------------------
drop policy if exists agenda_select on public.agenda;
create policy agenda_select on public.agenda for select
  using (
    aluno_id = auth.uid()
    or instrutor_id = auth.uid()
    or academia_id = public.get_academia_id(auth.uid())
  );

drop policy if exists agenda_write on public.agenda;
create policy agenda_write on public.agenda for all
  using (instrutor_id = auth.uid() or academia_id = public.get_academia_id(auth.uid()))
  with check (instrutor_id = auth.uid() or academia_id = public.get_academia_id(auth.uid()));

-- ---------- AVALIACOES -----------------------------------------------
drop policy if exists avaliacoes_select on public.avaliacoes;
create policy avaliacoes_select on public.avaliacoes for select
  using (
    aluno_id = auth.uid()
    or instrutor_id = auth.uid()
    or exists (select 1 from public.alunos a where a.id = avaliacoes.aluno_id
               and a.academia_id = public.get_academia_id(auth.uid()))
  );

drop policy if exists avaliacoes_write on public.avaliacoes;
create policy avaliacoes_write on public.avaliacoes for all
  using (instrutor_id = auth.uid())
  with check (instrutor_id = auth.uid());

-- ---------- PAGAMENTOS -----------------------------------------------
drop policy if exists pagamentos_select on public.pagamentos;
create policy pagamentos_select on public.pagamentos for select
  using (
    aluno_id = auth.uid()
    or academia_id = public.get_academia_id(auth.uid())
  );

drop policy if exists pagamentos_write on public.pagamentos;
create policy pagamentos_write on public.pagamentos for all
  using (academia_id = public.get_academia_id(auth.uid()))
  with check (academia_id = public.get_academia_id(auth.uid()));
