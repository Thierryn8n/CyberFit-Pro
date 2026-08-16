"use client"

import { useEffect, useState } from "react"
import { Barbell, CaretDown, Info } from "@phosphor-icons/react"

import { createClient } from "@/lib/supabase/client"
import { useUserProfile } from "../../hooks/useUserProfile"
import { PageHeader, EmptyState, Card, Badge } from "../../components/ui"

interface Exercicio {
  id: string
  name: string
  sets: number | null
  reps: string | null
  rest_seconds: number | null
  weight: string | null
  notes: string | null
  gif_url: string | null
  image_url: string | null
  target: string | null
  equipment: string | null
  order_index: number
}

interface TreinoRow {
  id: string
  name: string
  description: string | null
  day_of_week: number | null
  exercicios: Exercicio[]
}

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]

export default function AlunoTreinosPage() {
  const { profile } = useUserProfile()
  const [rows, setRows] = useState<TreinoRow[]>([])
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<Exercicio | null>(null)

  useEffect(() => {
    if (!profile) return
    const supabase = createClient()

    async function load() {
      const { data } = await supabase
        .from("treinos")
        .select(
          "id, name, description, day_of_week, exercicios(id, name, sets, reps, rest_seconds, weight, notes, gif_url, image_url, target, equipment, order_index)",
        )
        .eq("aluno_id", profile!.id)
        .eq("status", "ativo")
        .order("day_of_week", { ascending: true })

      const parsed = ((data as unknown as TreinoRow[]) ?? []).map((t) => ({
        ...t,
        exercicios: [...(t.exercicios ?? [])].sort((a, b) => a.order_index - b.order_index),
      }))
      setRows(parsed)
      setLoading(false)
    }

    load()
  }, [profile])

  return (
    <div>
      <PageHeader title="Meus treinos" subtitle="Treinos atribuídos pelo seu instrutor" />

      {loading ? (
        <p className="text-sm text-muted">Carregando...</p>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Barbell}
          title="Nenhum treino ainda"
          description="Assim que seu instrutor montar um treino, ele aparece aqui."
        />
      ) : (
        <div className="space-y-4">
          {rows.map((t) => {
            const open = openId === t.id
            return (
              <Card key={t.id} className="p-0">
                <button
                  onClick={() => setOpenId(open ? null : t.id)}
                  className="flex w-full items-center gap-4 p-5 text-left"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/15 text-accent">
                    <Barbell size={22} weight="duotone" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-medium text-foreground">{t.name}</h3>
                    {t.day_of_week != null && <p className="text-xs text-muted">{DIAS[t.day_of_week]}</p>}
                  </div>
                  <Badge tone="primary">{t.exercicios?.length ?? 0} exercícios</Badge>
                  <CaretDown size={18} className={`text-muted transition ${open ? "rotate-180" : ""}`} />
                </button>

                {open && (
                  <div className="border-t border-border px-5 py-4">
                    {t.description && <p className="mb-4 text-sm text-muted">{t.description}</p>}
                    {t.exercicios?.length ? (
                      <ul className="grid gap-3 sm:grid-cols-2">
                        {t.exercicios.map((ex) => (
                          <li
                            key={ex.id}
                            className="flex gap-3 rounded-xl border border-border bg-background p-3"
                          >
                            {ex.gif_url || ex.image_url ? (
                              <button
                                onClick={() => setLightbox(ex)}
                                className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-card"
                                aria-label={`Ver animação de ${ex.name}`}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={ex.gif_url || ex.image_url || "/placeholder.svg"}
                                  alt={ex.name}
                                  crossOrigin="anonymous"
                                  className="h-full w-full object-cover"
                                  loading="lazy"
                                />
                              </button>
                            ) : (
                              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-card text-muted">
                                <Barbell size={24} weight="duotone" />
                              </div>
                            )}

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-foreground">{ex.name}</p>
                              <p className="mt-0.5 text-xs text-muted">
                                {ex.sets ?? "?"} séries × {ex.reps ?? "?"} reps
                                {ex.weight ? ` · ${ex.weight}` : ""}
                              </p>
                              {ex.rest_seconds != null && (
                                <p className="text-xs text-muted">Descanso: {ex.rest_seconds}s</p>
                              )}
                              {ex.target && (
                                <span className="mt-1.5 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                                  {ex.target}
                                </span>
                              )}
                              {ex.notes && (
                                <p className="mt-1 flex items-start gap-1 text-xs text-muted">
                                  <Info size={12} className="mt-0.5 shrink-0" />
                                  {ex.notes}
                                </p>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted">Sem exercícios cadastrados neste treino.</p>
                    )}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightbox(null)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="aspect-square bg-background">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightbox.gif_url || lightbox.image_url || "/placeholder.svg"}
                alt={lightbox.name}
                crossOrigin="anonymous"
                className="h-full w-full object-contain"
              />
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-foreground">{lightbox.name}</h3>
              <p className="mt-1 text-sm text-muted">
                {lightbox.sets ?? "?"} séries × {lightbox.reps ?? "?"} reps
                {lightbox.weight ? ` · ${lightbox.weight}` : ""}
              </p>
              <button
                onClick={() => setLightbox(null)}
                className="mt-4 w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
