import "server-only"

import { createClient, type SupabaseClient } from "@supabase/supabase-js"

import { mediaUrl, type RawExercise, type ExercicioLite, type ExercicioFull } from "./biblioteca"

// A biblioteca de exercicios agora vive na tabela public.biblioteca_exercicios
// (populada a partir do dataset do GitHub). Lemos direto do banco em vez de
// baixar os ~23MB do CDN a cada instancia do servidor.

// Linha crua vinda do banco
interface BibliotecaRow {
  id: string
  name: string
  name_pt?: string | null
  category: string | null
  body_part: string | null
  equipment: string | null
  target: string | null
  muscle_group: string | null
  secondary_muscles: string[] | null
  gif_url: string | null
  image_url: string | null
  media_id: string | null
  instructions: Record<string, string> | null
  instruction_steps: Record<string, string[]> | null
  attribution: string | null
}

const g = globalThis as unknown as { __cf_sb?: SupabaseClient }

function sb(): SupabaseClient {
  if (g.__cf_sb) return g.__cf_sb
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  // Usamos a chave anon: a policy de leitura publica na tabela permite SELECT.
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  g.__cf_sb = createClient(url, key, { auth: { persistSession: false } })
  return g.__cf_sb
}

// As URLs de gif/imagem ja estao completas no banco; mediaUrl e idempotente
// para URLs absolutas, entao mantemos por seguranca.
function rowToLite(r: BibliotecaRow): ExercicioLite {
  return {
    id: r.id,
    // Preferimos o nome em portugues; caimos para o ingles quando ainda nao traduzido.
    name: r.name_pt?.trim() || r.name,
    category: r.category ?? "",
    body_part: r.body_part ?? "",
    equipment: r.equipment ?? "",
    target: r.target ?? "",
    secondary_muscles: r.secondary_muscles ?? [],
    image: r.image_url ? mediaUrl(r.image_url) : "",
    gif: r.gif_url ? mediaUrl(r.gif_url) : "",
  }
}

function rowToFull(r: BibliotecaRow): ExercicioFull {
  return {
    ...rowToLite(r),
    muscle_group: r.muscle_group ?? "",
    instructions: r.instructions ?? {},
    instruction_steps: r.instruction_steps ?? {},
    attribution: r.attribution ?? "© Gym visual — https://gymvisual.com/",
  }
}

// Mantidos para compatibilidade com codigo que ainda importe estes helpers.
export function toLite(ex: RawExercise): ExercicioLite {
  return {
    id: ex.id,
    name: ex.name,
    category: ex.category,
    body_part: ex.body_part,
    equipment: ex.equipment,
    target: ex.target ?? "",
    secondary_muscles: ex.secondary_muscles ?? [],
    image: mediaUrl(ex.image),
    gif: mediaUrl(ex.gif_url),
  }
}

export function toFull(ex: RawExercise): ExercicioFull {
  return {
    ...toLite(ex),
    muscle_group: ex.muscle_group ?? "",
    instructions: ex.instructions ?? {},
    instruction_steps: ex.instruction_steps ?? {},
    attribution: ex.attribution ?? "© Gym visual — https://gymvisual.com/",
  }
}

export async function getExercicioById(id: string): Promise<ExercicioFull | null> {
  const { data, error } = await sb().from("biblioteca_exercicios").select("*").eq("id", id).maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null
  return rowToFull(data as BibliotecaRow)
}

export interface QueryOpts {
  q?: string
  category?: string
  equipment?: string
  page: number
  pageSize: number
}

export async function queryBiblioteca(opts: QueryOpts) {
  const client = sb()
  const q = opts.q?.trim()

  // Consulta paginada + filtros
  let query = client.from("biblioteca_exercicios").select("*", { count: "exact" })
  if (opts.category) query = query.eq("category", opts.category)
  if (opts.equipment) query = query.eq("equipment", opts.equipment)
  if (q) {
    const like = `%${q}%`
    query = query.or(`name.ilike.${like},target.ilike.${like},muscle_group.ilike.${like}`)
  }

  const start = (opts.page - 1) * opts.pageSize
  query = query.order("id", { ascending: true }).range(start, start + opts.pageSize - 1)

  const { data, error, count } = await query
  if (error) throw new Error(error.message)

  const items = (data as BibliotecaRow[]).map(rowToLite)

  // Facetas: contagem por categoria e equipamento sobre a tabela inteira.
  const [{ data: catRows }, { data: equipRows }] = await Promise.all([
    client.from("biblioteca_exercicios").select("category"),
    client.from("biblioteca_exercicios").select("equipment"),
  ])

  const catCount = new Map<string, number>()
  for (const row of (catRows as { category: string | null }[]) ?? []) {
    const c = row.category ?? ""
    if (c) catCount.set(c, (catCount.get(c) ?? 0) + 1)
  }
  const equipCount = new Map<string, number>()
  for (const row of (equipRows as { equipment: string | null }[]) ?? []) {
    const e = row.equipment ?? ""
    if (e) equipCount.set(e, (equipCount.get(e) ?? 0) + 1)
  }

  return {
    items,
    total: count ?? items.length,
    page: opts.page,
    pageSize: opts.pageSize,
    catCount,
    equipCount,
  }
}
