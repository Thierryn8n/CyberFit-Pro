import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "./database.types"

type SB = SupabaseClient<Database>

// Formato normalizado de um exercício a ser gravado (vale tanto para o builder
// da biblioteca quanto para a duplicação de um treino existente).
export interface ExercicioPayload {
  name: string
  sets: number | null
  reps: string | null
  rest_seconds?: number | null
  weight?: string | null
  notes?: string | null
  biblioteca_id?: string | null
  gif_url?: string | null
  image_url?: string | null
  target?: string | null
  equipment?: string | null
}

// Insere exercícios para vários treinos de uma vez. Se as colunas de mídia
// ainda não existirem no banco, faz fallback para os campos básicos.
export async function inserirExercicios(supabase: SB, treinoIds: string[], exercicios: ExercicioPayload[]) {
  if (treinoIds.length === 0 || exercicios.length === 0) return

  const full = treinoIds.flatMap((treinoId) =>
    exercicios.map((e, i) => ({
      treino_id: treinoId,
      name: e.name,
      sets: e.sets,
      reps: e.reps,
      rest_seconds: e.rest_seconds ?? null,
      weight: e.weight ?? null,
      notes: e.notes ?? null,
      order_index: i,
      biblioteca_id: e.biblioteca_id ?? null,
      gif_url: e.gif_url ?? null,
      image_url: e.image_url ?? null,
      target: e.target ?? null,
      equipment: e.equipment ?? null,
    })),
  )

  const { error } = await supabase.from("exercicios").insert(full)
  if (!error) return

  // Fallback sem colunas de mídia
  const basic = treinoIds.flatMap((treinoId) =>
    exercicios.map((e, i) => ({
      treino_id: treinoId,
      name: e.name,
      sets: e.sets,
      reps: e.reps,
      order_index: i,
    })),
  )
  await supabase.from("exercicios").insert(basic)
}

// Cria N treinos (um por par aluno × dia) e replica os exercícios em todos.
export async function criarTreinos(
  supabase: SB,
  params: {
    instrutorId: string
    alunoIds: string[]
    dias: (number | null)[]
    name: string
    description: string | null
    exercicios: ExercicioPayload[]
  },
) {
  const dias = params.dias.length > 0 ? params.dias : [null]
  const rows = params.alunoIds.flatMap((alunoId) =>
    dias.map((dia) => ({
      instrutor_id: params.instrutorId,
      aluno_id: alunoId,
      name: params.name,
      description: params.description,
      day_of_week: dia,
    })),
  )

  const { data, error } = await supabase.from("treinos").insert(rows).select("id")
  if (error || !data) return { error }

  await inserirExercicios(
    supabase,
    data.map((t) => t.id),
    params.exercicios,
  )
  return { count: rows.length }
}

// Duplica um treino existente (e seus exercícios) para vários alunos.
export async function duplicarTreino(
  supabase: SB,
  params: {
    instrutorId: string
    sourceTreinoId: string
    source: { name: string; description: string | null; day_of_week: number | null }
    alunoIds: string[]
  },
) {
  // Busca os exercícios de origem (todos os campos)
  const { data: src } = await supabase
    .from("exercicios")
    .select("name, sets, reps, rest_seconds, weight, notes, biblioteca_id, gif_url, image_url, target, equipment, order_index")
    .eq("treino_id", params.sourceTreinoId)
    .order("order_index", { ascending: true })

  const rows = params.alunoIds.map((alunoId) => ({
    instrutor_id: params.instrutorId,
    aluno_id: alunoId,
    name: params.source.name,
    description: params.source.description,
    day_of_week: params.source.day_of_week,
  }))

  const { data, error } = await supabase.from("treinos").insert(rows).select("id")
  if (error || !data) return { error }

  await inserirExercicios(
    supabase,
    data.map((t) => t.id),
    (src ?? []) as ExercicioPayload[],
  )
  return { count: rows.length }
}
