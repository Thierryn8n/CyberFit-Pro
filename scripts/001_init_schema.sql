-- =====================================================================
-- CyberFit Pro - Schema completo (Supabase / PostgreSQL)
-- Rode este script primeiro. Ele cria as tabelas, funcoes e triggers.
-- Depois rode 002_rls_policies.sql para as politicas de seguranca.
-- =====================================================================

-- Extensoes -----------------------------------------------------------
create extension if not exists "pgcrypto";

-- =====================================================================
-- TABELAS
-- =====================================================================

-- Perfil base: 1 linha por usuario autenticado
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        text not null check (role in ('academia', 'instrutor', 'aluno')),
  full_name   text,
  email       text,
  phone       text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Academia (dados especificos)
create table if not exists public.academias (
  id          uuid primary key references public.profiles(id) on delete cascade,
  cnpj        text,
  address     text,
  description text,
  created_at  timestamptz not null default now()
);

-- Instrutor (dados especificos)
create table if not exists public.instrutores (
  id          uuid primary key references public.profiles(id) on delete cascade,
  academia_id uuid references public.academias(id) on delete set null,
  cref        text,
  cpf         text,
  specialty   text,
  bio         text,
  created_at  timestamptz not null default now()
);

-- Aluno (dados especificos)
create table if not exists public.alunos (
  id           uuid primary key references public.profiles(id) on delete cascade,
  instrutor_id uuid references public.instrutores(id) on delete set null,
  academia_id  uuid references public.academias(id) on delete set null,
  cpf          text,
  birth_date   date,
  weight_kg    numeric(5,2),
  height_cm    numeric(5,2),
  goal         text,
  plan_status  text not null default 'ativo' check (plan_status in ('ativo', 'inativo', 'pendente')),
  created_at   timestamptz not null default now()
);

-- Convites (sistema de token): academia -> instrutor -> aluno
create table if not exists public.invites (
  id           uuid primary key default gen_random_uuid(),
  code         text unique not null,
  role         text not null check (role in ('instrutor', 'aluno')),
  academia_id  uuid references public.academias(id) on delete cascade,
  instrutor_id uuid references public.instrutores(id) on delete cascade,
  created_by   uuid references public.profiles(id) on delete set null,
  used_by      uuid references public.profiles(id) on delete set null,
  used_at      timestamptz,
  expires_at   timestamptz,
  created_at   timestamptz not null default now()
);

-- Treinos
create table if not exists public.treinos (
  id           uuid primary key default gen_random_uuid(),
  aluno_id     uuid references public.alunos(id) on delete cascade,
  instrutor_id uuid references public.instrutores(id) on delete set null,
  name         text not null,
  description  text,
  day_of_week  int check (day_of_week between 0 and 6),
  status       text not null default 'ativo' check (status in ('ativo', 'arquivado')),
  created_at   timestamptz not null default now()
);

-- Exercicios de um treino
create table if not exists public.exercicios (
  id            uuid primary key default gen_random_uuid(),
  treino_id     uuid not null references public.treinos(id) on delete cascade,
  name          text not null,
  sets          int,
  reps          text,
  rest_seconds  int,
  weight        text,
  notes         text,
  order_index   int not null default 0,
  -- Referencia opcional a Biblioteca de Exercicios (dataset externo, via CDN)
  biblioteca_id text,
  gif_url       text,
  image_url     text,
  target        text,
  equipment     text
);

-- Agenda / aulas
create table if not exists public.agenda (
  id           uuid primary key default gen_random_uuid(),
  aluno_id     uuid references public.alunos(id) on delete cascade,
  instrutor_id uuid references public.instrutores(id) on delete set null,
  academia_id  uuid references public.academias(id) on delete set null,
  title        text not null,
  scheduled_at timestamptz not null,
  duration_min int not null default 60,
  status       text not null default 'agendado' check (status in ('agendado', 'concluido', 'cancelado')),
  notes        text,
  created_at   timestamptz not null default now()
);

-- Avaliacoes fisicas (progresso)
create table if not exists public.avaliacoes (
  id           uuid primary key default gen_random_uuid(),
  aluno_id     uuid not null references public.alunos(id) on delete cascade,
  instrutor_id uuid references public.instrutores(id) on delete set null,
  assessed_on  date not null default current_date,
  weight_kg    numeric(5,2),
  height_cm    numeric(5,2),
  body_fat     numeric(4,1),
  muscle_mass  numeric(5,2),
  notes        text,
  created_at   timestamptz not null default now()
);

-- Financeiro / pagamentos
create table if not exists public.pagamentos (
  id          uuid primary key default gen_random_uuid(),
  aluno_id    uuid references public.alunos(id) on delete set null,
  academia_id uuid references public.academias(id) on delete cascade,
  amount      numeric(10,2) not null,
  description text,
  due_date    date,
  paid_at     timestamptz,
  status      text not null default 'pendente' check (status in ('pendente', 'pago', 'atrasado', 'cancelado')),
  created_at  timestamptz not null default now()
);

-- Indices uteis
create index if not exists idx_instrutores_academia on public.instrutores(academia_id);
create index if not exists idx_alunos_instrutor on public.alunos(instrutor_id);
create index if not exists idx_alunos_academia on public.alunos(academia_id);
create index if not exists idx_treinos_aluno on public.treinos(aluno_id);
create index if not exists idx_exercicios_treino on public.exercicios(treino_id);
create index if not exists idx_agenda_instrutor on public.agenda(instrutor_id);
create index if not exists idx_agenda_aluno on public.agenda(aluno_id);
create index if not exists idx_avaliacoes_aluno on public.avaliacoes(aluno_id);
create index if not exists idx_pagamentos_academia on public.pagamentos(academia_id);
create index if not exists idx_invites_code on public.invites(code);

-- =====================================================================
-- FUNCOES AUXILIARES (security definer -> ignoram RLS, evitam recursao)
-- =====================================================================

-- Papel do usuario
create or replace function public.get_role(uid uuid)
returns text language sql security definer set search_path = '' stable as $$
  select role from public.profiles where id = uid;
$$;

-- Academia a qual o usuario pertence (academia, instrutor ou aluno)
create or replace function public.get_academia_id(uid uuid)
returns uuid language sql security definer set search_path = '' stable as $$
  select case p.role
    when 'academia'  then a.id
    when 'instrutor' then i.academia_id
    when 'aluno'     then al.academia_id
  end
  from public.profiles p
  left join public.academias a  on a.id  = p.id
  left join public.instrutores i on i.id = p.id
  left join public.alunos al    on al.id = p.id
  where p.id = uid;
$$;

-- =====================================================================
-- TRIGGER: cria perfil + linha especifica + consome convite no signup
-- =====================================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_role        text := coalesce(new.raw_user_meta_data ->> 'role', 'aluno');
  v_full_name   text := new.raw_user_meta_data ->> 'full_name';
  v_phone       text := new.raw_user_meta_data ->> 'phone';
  v_invite_code text := new.raw_user_meta_data ->> 'invite_code';
  v_invite      public.invites;
begin
  insert into public.profiles (id, role, full_name, email, phone)
  values (new.id, v_role, v_full_name, new.email, v_phone)
  on conflict (id) do nothing;

  if v_role = 'academia' then
    insert into public.academias (id, cnpj, address)
    values (new.id, new.raw_user_meta_data ->> 'cnpj', new.raw_user_meta_data ->> 'address')
    on conflict (id) do nothing;

  elsif v_role = 'instrutor' then
    select * into v_invite from public.invites
      where code = v_invite_code and role = 'instrutor' and used_by is null
        and (expires_at is null or expires_at > now())
      limit 1;
    insert into public.instrutores (id, academia_id, cref, cpf)
    values (new.id, v_invite.academia_id, new.raw_user_meta_data ->> 'cref', new.raw_user_meta_data ->> 'cpf')
    on conflict (id) do nothing;
    if v_invite.id is not null then
      update public.invites set used_by = new.id, used_at = now() where id = v_invite.id;
    end if;

  elsif v_role = 'aluno' then
    select * into v_invite from public.invites
      where code = v_invite_code and role = 'aluno' and used_by is null
        and (expires_at is null or expires_at > now())
      limit 1;
    insert into public.alunos (id, instrutor_id, academia_id, cpf, birth_date)
    values (
      new.id,
      v_invite.instrutor_id,
      v_invite.academia_id,
      new.raw_user_meta_data ->> 'cpf',
      nullif(new.raw_user_meta_data ->> 'birth_date', '')::date
    )
    on conflict (id) do nothing;
    if v_invite.id is not null then
      update public.invites set used_by = new.id, used_at = now() where id = v_invite.id;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- RPC: gerar convite (academia gera p/ instrutor, instrutor gera p/ aluno)
-- =====================================================================
create or replace function public.create_invite(target_role text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_uid      uuid := auth.uid();
  v_role     text := public.get_role(v_uid);
  v_code     text := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  v_academia uuid;
  v_instrutor uuid;
begin
  if v_uid is null then
    raise exception 'Nao autenticado';
  end if;

  if v_role = 'academia' and target_role = 'instrutor' then
    v_academia := v_uid;
  elsif v_role = 'instrutor' and target_role = 'aluno' then
    select academia_id into v_academia from public.instrutores where id = v_uid;
    v_instrutor := v_uid;
  else
    raise exception 'Perfil % nao pode gerar convite para %', v_role, target_role;
  end if;

  insert into public.invites (code, role, academia_id, instrutor_id, created_by, expires_at)
  values (v_code, target_role, v_academia, v_instrutor, v_uid, now() + interval '30 days');

  return v_code;
end;
$$;

-- =====================================================================
-- RPC: validar convite (usado na tela de cadastro, antes do login)
-- =====================================================================
create or replace function public.validate_invite(p_code text)
returns table (valid boolean, role text, academia_name text)
language plpgsql security definer set search_path = '' as $$
begin
  return query
  select true,
         i.role,
         coalesce(p.full_name, 'Academia')
  from public.invites i
  left join public.academias a on a.id = i.academia_id
  left join public.profiles p on p.id = a.id
  where i.code = upper(p_code)
    and i.used_by is null
    and (i.expires_at is null or i.expires_at > now())
  limit 1;

  if not found then
    return query select false, null::text, null::text;
  end if;
end;
$$;

grant execute on function public.validate_invite(text) to anon, authenticated;
grant execute on function public.create_invite(text) to authenticated;
