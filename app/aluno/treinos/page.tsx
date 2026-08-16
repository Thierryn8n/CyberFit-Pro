"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Barbell, CaretRight } from "@phosphor-icons/react"

import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { useUserProfile } from "../../hooks/useUserProfile"
import { DIAS_SEMANA, hojeDiaSemana, nomeDia } from "../../lib/treino"

interface TreinoRow {
  id: string
  name: string
  description: string | null
  day_of_week: number | null
  exCount: number
}

export default function AlunoTreinosPage() {
  const { profile } = useUserProfile()
  const [rows, setRows] = useState<TreinoRow[]>([])
  const [loading, setLoading] = useState(true)
  const hoje = hojeDiaSemana()

  useEffect(() => {
    if (!profile) return

    async function load() {
      if (!isSupabaseConfigured) {
        // Demo: uma grade semanal de exemplo
        setRows([
          { id: "demo-a", name: "Treino A — Peito e Tríceps", description: null, day_of_week: 1, exCount: 6 },
          { id: "demo-b", name: "Treino B — Costas e Bíceps", description: null, day_of_week: 3, exCount: 6 },
          { id: "demo-c", name: "Treino C — Pernas", description: null, day_of_week: 5, exCount: 7 },
        ])
        setLoading(false)
        return
      }
      const supabase = createClient()
      const { data } = await supabase
        .from("treinos")
        .select("id, name, description, day_of_week, exercicios(count)")
        .eq("aluno_id", profile!.id)
        .eq("status", "ativo")
        .order("day_of_week", { ascending: true })
      setRows(
        (data ?? []).map((t: any) => ({
          id: t.id,
          name: t.name,
          description: t.description,
          day_of_week: t.day_of_week,
          exCount: t.exercicios?.[0]?.count ?? 0,
        })),
      )
      setLoading(false)
    }

    load().catch(() => setLoading(false))
  }, [profile])

  // Agrupa por dia da semana
  const porDia = useMemo(() => {
    const grupos: { dow: number | null; treinos: TreinoRow[] }[] = []
    for (let d = 0; d < 7; d++) {
      const t = rows.filter((r) => r.day_of_week === d)
      if (t.length) grupos.push({ dow: d, treinos: t })
    }
    const semDia = rows.filter((r) => r.day_of_week == null)
    if (semDia.length) grupos.push({ dow: null, treinos: semDia })
    return grupos
  }, [rows])

  return (
    <div className="px-5 pt-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Meus treinos</h1>
        <p className="mt-0.5 text-sm text-muted">Programação da semana montada pelo seu instrutor</p>
      </header>

      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-surface" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-3xl border border-border bg-surface p-8 text-center">
          <Barbell size={40} className="text-muted" weight="duotone" />
          <p className="font-medium text-foreground">Nenhum treino ainda</p>
          <p className="text-sm text-muted">Assim que seu instrutor montar um treino, ele aparece aqui.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {porDia.map((g) => (
            <div key={g.dow ?? "sem"}>
              <div className="mb-2 flex items-center gap-2">
                <span
                  className={`flex h-7 w-11 items-center justify-center rounded-lg text-xs font-bold ${
                    g.dow === hoje ? "bg-primary text-primary-foreground" : "bg-surface text-muted"
                  }`}
                >
                  {g.dow == null ? "—" : DIAS_SEMANA[g.dow].short}
                </span>
                <span className="text-sm font-medium text-foreground">
                  {nomeDia(g.dow)} {g.dow === hoje && <span className="text-primary">· hoje</span>}
                </span>
              </div>
              <div className="flex flex-col gap-3">
                {g.treinos.map((t) => (
                  <Link
                    key={t.id}
                    href={`/aluno/treino/${t.id}`}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                      <Barbell size={22} weight="duotone" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-foreground">{t.name}</p>
                      <p className="text-xs text-muted">{t.exCount} exercícios</p>
                    </div>
                    <CaretRight size={18} className="text-muted" />
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
