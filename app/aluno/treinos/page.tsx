"use client"

import { useEffect, useState } from "react"
import { Barbell, CaretDown } from "@phosphor-icons/react"

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

  useEffect(() => {
    if (!profile) return
    const supabase = createClient()

    async function load() {
      const { data } = await supabase
        .from("treinos")
        .select("id, name, description, day_of_week, exercicios(id, name, sets, reps, rest_seconds, weight, order_index)")
        .eq("aluno_id", profile!.id)
        .eq("status", "ativo")
        .order("day_of_week", { ascending: true })
      setRows((data as unknown as TreinoRow[]) ?? [])
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
                    {t.description && <p className="mb-3 text-sm text-muted">{t.description}</p>}
                    {t.exercicios?.length ? (
                      <ul className="space-y-2">
                        {t.exercicios.map((ex) => (
                          <li key={ex.id} className="flex items-center justify-between rounded-lg bg-background px-3 py-2.5">
                            <span className="text-sm text-foreground">{ex.name}</span>
                            <span className="text-xs text-muted">
                              {ex.sets ?? "?"}x{ex.reps ?? "?"}
                              {ex.weight ? ` · ${ex.weight}` : ""}
                            </span>
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
    </div>
  )
}
