"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, CheckCircle, Circle, CaretRight, Barbell } from "@phosphor-icons/react"

import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { useUserProfile } from "../../../hooks/useUserProfile"
import ExercicioPlayer, { type PlayerExercicio } from "../../../components/ExercicioPlayer"
import { dataLocalISO } from "../../../lib/treino"
import { fetchBiblioteca, mediaUrl } from "../../../lib/biblioteca"

export default function SessaoTreino() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { profile } = useUserProfile()
  const [treinoNome, setTreinoNome] = useState("Treino")
  const [exercicios, setExercicios] = useState<PlayerExercicio[]>([])
  const [doneMap, setDoneMap] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [aberto, setAberto] = useState<number | null>(null)

  useEffect(() => {
    if (!profile) return

    async function loadDemo() {
      // Preview sem Supabase: monta um treino de exemplo com GIFs reais.
      try {
        const res = await fetchBiblioteca({ category: "chest", pageSize: 4 })
        setTreinoNome("Treino A — Peito e Tríceps (demo)")
        setExercicios(
          res.items.map((it, i) => ({
            id: `demo-${it.id}`,
            name: it.name,
            sets: 3 + (i % 2),
            reps: i % 2 === 0 ? "12" : "10-12",
            weight: null,
            notes: "Mantenha a postura, controle a descida e expire no esforço.",
            gif_url: it.gif,
            image_url: it.image,
            target: it.target,
            equipment: it.equipment,
          })),
        )
      } catch {
        setExercicios([])
      }
      setLoading(false)
    }

    async function loadReal() {
      const supabase = createClient()
      const { data: treino } = await supabase.from("treinos").select("name").eq("id", id).maybeSingle()
      if (treino?.name) setTreinoNome(treino.name)

      const { data: ex } = await supabase
        .from("exercicios")
        .select("id, name, sets, reps, weight, notes, gif_url, image_url, target, equipment")
        .eq("treino_id", id)
        .order("order_index", { ascending: true })

      const list = (ex ?? []).map((e: any) => ({
        ...e,
        gif_url: e.gif_url ? mediaUrl(e.gif_url) : null,
        image_url: e.image_url ? mediaUrl(e.image_url) : null,
      })) as PlayerExercicio[]
      setExercicios(list)

      // Marca exercicios ja concluidos hoje (todas as series registradas)
      const ids = list.map((e) => e.id)
      if (ids.length > 0) {
        const { data: regs } = await supabase
          .from("series_registros")
          .select("exercicio_id, set_index")
          .eq("aluno_id", profile!.id)
          .eq("session_date", dataLocalISO())
          .in("exercicio_id", ids)
        const counts: Record<string, number> = {}
        for (const r of (regs as any[]) ?? []) counts[r.exercicio_id] = (counts[r.exercicio_id] ?? 0) + 1
        const dm: Record<string, boolean> = {}
        for (const e of list) dm[e.id] = (counts[e.id] ?? 0) >= Math.max(1, e.sets ?? 3)
        setDoneMap(dm)
      }
      setLoading(false)
    }

    setLoading(true)
    if (isSupabaseConfigured) loadReal().catch(() => setLoading(false))
    else loadDemo()
  }, [profile, id])

  const totalFeitos = Object.values(doneMap).filter(Boolean).length
  const progresso = exercicios.length > 0 ? Math.round((totalFeitos / exercicios.length) * 100) : 0

  function handleProgress(exId: string, done: boolean) {
    setDoneMap((prev) => ({ ...prev, [exId]: done }))
  }

  return (
    <div className="px-5 pt-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/aluno")}
          aria-label="Voltar"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-foreground"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold text-foreground">{treinoNome}</h1>
          <p className="text-xs text-muted">
            {totalFeitos}/{exercicios.length} exercícios concluídos
          </p>
        </div>
      </div>

      {/* Barra de progresso */}
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-surface">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all"
          style={{ width: `${progresso}%` }}
        />
      </div>

      {/* Lista de exercicios */}
      <div className="mt-6 flex flex-col gap-3">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-surface" />)
        ) : exercicios.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-3xl border border-border bg-surface p-8 text-center">
            <Barbell size={40} className="text-muted" weight="duotone" />
            <p className="font-medium text-foreground">Treino sem exercícios</p>
            <p className="text-sm text-muted">Seu instrutor ainda não adicionou exercícios a este treino.</p>
          </div>
        ) : (
          exercicios.map((ex, i) => {
            const done = doneMap[ex.id]
            const thumb = ex.image_url || ex.gif_url || ""
            return (
              <button
                key={ex.id}
                onClick={() => setAberto(i)}
                className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition-colors ${
                  done ? "border-success/40 bg-success/5" : "border-border bg-surface"
                }`}
              >
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-surface-2">
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumb || "/placeholder.svg"} alt={ex.name} className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-foreground">{ex.name}</p>
                  <p className="mt-0.5 text-sm text-muted">
                    {Math.max(1, ex.sets ?? 3)} séries x {ex.reps || "–"} reps
                  </p>
                  {ex.target && <p className="mt-0.5 truncate text-xs text-primary">{ex.target}</p>}
                </div>
                {done ? (
                  <CheckCircle size={24} weight="fill" className="text-success" />
                ) : (
                  <span className="flex items-center gap-1 text-xs font-medium text-primary">
                    <Circle size={20} /> <CaretRight size={16} />
                  </span>
                )}
              </button>
            )
          })
        )}
      </div>

      {/* Player */}
      {aberto !== null && exercicios[aberto] && profile && (
        <ExercicioPlayer
          exercicio={exercicios[aberto]}
          alunoId={profile.id}
          treinoId={id}
          persist={isSupabaseConfigured && !exercicios[aberto].id.startsWith("demo-")}
          index={aberto}
          total={exercicios.length}
          onClose={() => setAberto(null)}
          onNext={() => setAberto((v) => (v !== null && v + 1 < exercicios.length ? v + 1 : v))}
          onProgress={handleProgress}
        />
      )}
    </div>
  )
}
