-- =====================================================================
-- CyberFit Pro - Onboarding do aluno + medidas corporais + preferências
-- Rode este script no SQL Editor do Supabase (depois dos anteriores).
-- Idempotente: pode rodar mais de uma vez sem erro.
-- =====================================================================

-- Novas colunas em alunos (triagem inicial) ---------------------------
alter table public.alunos add column if not exists gender               text;
alter table public.alunos add column if not exists activity_level       text;
alter table public.alunos add column if not exists waist_cm             numeric(5,2);
alter table public.alunos add column if not exists hip_cm               numeric(5,2);
alter table public.alunos add column if not exists arm_cm               numeric(5,2);
alter table public.alunos add column if not exists thigh_cm             numeric(5,2);
alter table public.alunos add column if not exists chest_cm             numeric(5,2);
alter table public.alunos add column if not exists onboarding_completed boolean not null default false;

-- Preferência de tema por usuário ------------------------------------
alter table public.profiles add column if not exists theme_preference text
  check (theme_preference in ('dark', 'light')) default 'dark';

-- Restrições brandas via check (adiciona só se ainda não existir) ------
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'alunos_gender_check') then
    alter table public.alunos
      add constraint alunos_gender_check
      check (gender is null or gender in ('masculino', 'feminino', 'outro'));
  end if;
end $$;
