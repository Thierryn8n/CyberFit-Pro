"use client"

import { useEffect, useState } from "react"
import { ClockCounterClockwise, Barbell, Fire } from "@phosphor-icons/react"

import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { useUserProfile } from "../../hooks/useUserProfile"
import { fmtVolume } from "../../lib/treino"

interface Sessao {
  data: string
  dataLabel: string
  series: number
  exercicios: number
  volume: number
}

export default function HistoricoPage() {
  const { profile } = useUserProfile()
  const [sessoes, setSessoes] = useState<Sessao[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return

    async function load() {
      if (!isSupabaseConfigured) {
        setSessoes([
          { data: "2026-08-14", dataLabel: "14 de agosto", series: 18, exercicios: 6, volume: 8400 },
          { data: "2026-08-12", dataLabel: "12 de agosto", series: 20, exercicios: 6, volume: 9100 },
          { data: "2026-08-10", dataLabel: "10 de agosto", series: 21, exercicios: 7, volume: 11200 },
        ])
        setLoading(false)
        return
      }

      const supabase = createClient()
      const { data } = await supabase
        .from("series_registros")
        .select("session_date, reps, weight, exercicio_id")
        .eq("aluno_id", profile!.id)
        .order("session_date", { ascending: false })

      const mapa = new Map<string, { series: number; ex: Set<string>; volume: number }>()
      for (const r of (data as any[]) ?? []) {
        if (!mapa.has(r.session_date)) mapa.set(r.session_date, { series: 0, ex: new Set(), volume: 0 })
        const g = mapa.get(r.session_date)!
        g.series += 1
        g.ex.add(r.exercicio_id)
        g.volume += (r.reps ?? 0) * (r.weight ?? 0)
      }
      setSessoes(
        Array.from(mapa.entries()).map(([data, g]) => ({
          data,
          dataLabel: new Date(data).toLocaleDateString("pt-BR", { day: "2-digit", month: "long" }),
          series: g.series,
          exercicios: g.ex.size,
          volume: g.volume,
        })),
      )
      setLoading(false)
    }

    load().catch(() => setLoading(false))
  }, [profile])

  return (
    <div className="px-5 pt-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Histórico</h1>
        <p className="mt-0.5 text-sm text-muted">Seus treinos concluídos</p>
      </header>

      {loading ? (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-surface" />
          ))}
        </div>
      ) : sessoes.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-3xl border border-border bg-surface p-8 text-center">
          <ClockCounterClockwise size={40} className="text-muted" weight="duotone" />
          <p className="font-medium text-foreground">Sem histórico ainda</p>
          <p className="text-sm text-muted">Cada treino que você registrar aparece aqui com seu volume total.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {sessoes.map((s) => (
            <div key={s.data} className="rounded-2xl border border-border bg-surface p-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-foreground">{s.dataLabel}</p>
                <span className="flex items-center gap-1 rounded-full bg-warning/15 px-2.5 py-1 text-xs font-semibold text-warning">
                  <Fire size={13} weight="fill" /> {fmtVolume(s.volume)}
                </span>
              </div>
              <div className="mt-2 flex gap-4 text-sm text-muted">
                <span className="flex items-center gap-1">
                  <Barbell size={15} /> {s.exercicios} exercícios
                </span>
                <span>{s.series} séries</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
