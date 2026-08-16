-- =====================================================================
-- CyberFit Pro - Migracao: liga a tabela exercicios a Biblioteca
-- Adiciona colunas de midia/metadados vindas do dataset de exercicios.
-- Idempotente: pode rodar em bancos ja existentes.
-- =====================================================================

alter table public.exercicios add column if not exists biblioteca_id text;
alter table public.exercicios add column if not exists gif_url       text;
alter table public.exercicios add column if not exists image_url     text;
alter table public.exercicios add column if not exists target        text;
alter table public.exercicios add column if not exists equipment     text;
