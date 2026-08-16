# CyberFit Pro — Setup do banco (Supabase)

## 1. Conectar o Supabase

No v0, clique no ícone de **Settings** (canto superior direito) → **Integrations** → conecte o **Supabase**.
Isso adiciona automaticamente as variáveis:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

> Se sua conta não tiver permissão para conectar pela equipe, peça a um admin, ou
> adicione as duas variáveis manualmente em **Settings → Vars** (pegue os valores em
> Supabase → Project Settings → API).

## 2. Rodar os scripts SQL (nesta ordem)

Rode no **SQL Editor** do Supabase, ou deixe o v0 executar via MCP do Supabase:

1. `001_init_schema.sql` — tabelas, funções, triggers e sistema de convites
2. `002_rls_policies.sql` — políticas de segurança (RLS)

## 3. Fluxo de cadastro (por convite / token)

1. **Academia** cria a conta livremente (não precisa de código).
2. Academia gera um **código de convite** para instrutor (botão "Convidar instrutor").
3. **Instrutor** se cadastra usando esse código → fica vinculado à academia.
4. Instrutor gera código para **aluno** (botão "Convidar aluno").
5. **Aluno** se cadastra com o código → fica vinculado ao instrutor e à academia.

## 4. Confirmação de e-mail

Por padrão o Supabase exige confirmar o e-mail antes do primeiro login.
Para testar rápido, você pode desativar em Supabase → Authentication → Providers → Email
→ "Confirm email" (apenas em desenvolvimento).

## Estrutura

- `profiles` — 1 linha por usuário (role: academia / instrutor / aluno)
- `academias`, `instrutores`, `alunos` — dados específicos de cada perfil
- `invites` — códigos de convite
- `treinos` + `exercicios` — fichas de treino
- `agenda` — aulas e compromissos
- `avaliacoes` — avaliações físicas (progresso)
- `pagamentos` — financeiro
