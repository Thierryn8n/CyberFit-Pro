import "server-only"

import { EXERCISES_JSON_URL, mediaUrl, type RawExercise, type ExercicioLite, type ExercicioFull } from "./biblioteca"

// Cache em memoria do modulo (sobrevive entre requisicoes na mesma instancia).
// Guardamos numa global para nao recarregar 17MB a cada HMR em dev.
interface Cache {
  raw: RawExercise[]
  byId: Map<string, RawExercise>
  loadedAt: number
}

const g = globalThis as unknown as { __cf_biblioteca?: Cache; __cf_loading?: Promise<Cache> }

async function loadDataset(): Promise<Cache> {
  // "no-store": o dataset tem ~23MB e estoura o limite de 2MB do Data Cache do Next.
  // O cache em memoria (globalThis) abaixo garante que o download ocorra uma unica vez
  // por instancia do servidor, entao nao ha refetch a cada requisicao.
  const res = await fetch(EXERCISES_JSON_URL, { cache: "no-store" })
  if (!res.ok) throw new Error(`Falha ao baixar o dataset (${res.status})`)
  const raw = (await res.json()) as RawExercise[]
  const byId = new Map<string, RawExercise>()
  for (const ex of raw) byId.set(ex.id, ex)
  return { raw, byId, loadedAt: Date.now() }
}

export async function getDataset(): Promise<Cache> {
  if (g.__cf_biblioteca) return g.__cf_biblioteca
  if (!g.__cf_loading) {
    g.__cf_loading = loadDataset().then((c) => {
      g.__cf_biblioteca = c
      g.__cf_loading = undefined
      return c
    })
  }
  return g.__cf_loading
}

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

export interface QueryOpts {
  q?: string
  category?: string
  equipment?: string
  page: number
  pageSize: number
}

export async function queryBiblioteca(opts: QueryOpts) {
  const { raw } = await getDataset()

  const q = opts.q?.trim().toLowerCase()
  let filtered = raw
  if (opts.category) filtered = filtered.filter((e) => e.category === opts.category)
  if (opts.equipment) filtered = filtered.filter((e) => e.equipment === opts.equipment)
  if (q) {
    filtered = filtered.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        (e.target ?? "").toLowerCase().includes(q) ||
        (e.muscle_group ?? "").toLowerCase().includes(q),
    )
  }

  // Facetas calculadas sobre o dataset completo (contagem por categoria/equipamento)
  const catCount = new Map<string, number>()
  const equipCount = new Map<string, number>()
  for (const e of raw) {
    catCount.set(e.category, (catCount.get(e.category) ?? 0) + 1)
    equipCount.set(e.equipment, (equipCount.get(e.equipment) ?? 0) + 1)
  }

  const total = filtered.length
  const start = (opts.page - 1) * opts.pageSize
  const items = filtered.slice(start, start + opts.pageSize).map(toLite)

  return {
    items,
    total,
    page: opts.page,
    pageSize: opts.pageSize,
    catCount,
    equipCount,
  }
}
