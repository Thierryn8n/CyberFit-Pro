"use client"

import { useEffect, useMemo, useState } from "react"
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts"
import { ChartLineUp, Barbell, TrendUp } from "@phosphor-icons/react"

import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { useUserProfile } from "../../hooks/useUserProfile"
import { fmtVolume, fmtCarga } from "../../lib/treino"

type Aba = "cargas" | "corpo"

interface SerieRow {
  session_date: string
  reps: number | null
  weight: number | null
  exercicio_id: string
  nome: string
}

interface ExercicioAgrupado {
  id: string
  nome: string
  sessoes: { data: string; maxCarga: number; volume: number; series: number }[]
}

interface Avaliacao {
  assessed_on: string
  weight_kg: number | null
  body_fat: number | null
  muscle_mass: number | null
}

export default function ProgressoPage() {
  const { profile } = useUserProfile()
  const [aba, setAba] = useState<Aba>("cargas")
  const [exercicios, setExercicios] = useState<ExercicioAgrupado[]>([])
  const [selId, setSelId] = useState<string | null>(null)
  const [aval, setAval] = useState<Avaliacao[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return

    async function load() {
      if (!isSupabaseConfigured) {
        const demo: ExercicioAgrupado = {
          id: "demo",
          nome: "Supino reto (demo)",
          sessoes: [
            { data: "01/07", maxCarga: 40, volume: 1440, series: 3 },
            { data: "08/07", maxCarga: 42.5, volume: 1530, series: 3 },
            { data: "15/07", maxCarga: 45, volume: 1620, series: 3 },
            { data: "22/07", maxCarga: 45, volume: 1710, series: 4 },
            { data: "29/07", maxCarga: 47.5, volume: 1805, series: 4 },
          ],
        }
        setExercicios([demo])
        setSelId("demo")
        setLoading(false)
        return
      }

      const supabase = createClient()
      const [{ data: series }, { data: avaliacoes }] = await Promise.all([
        supabase
          .from("series_registros")
          .select("session_date, reps, weight, exercicio_id, exercicios(name)")
          .eq("aluno_id", profile!.id)
          .order("session_date", { ascending: true }),
        supabase
          .from("avaliacoes")
          .select("assessed_on, weight_kg, body_fat, muscle_mass")
          .eq("aluno_id", profile!.id)
          .order("assessed_on", { ascending: true }),
      ])

      const rows: SerieRow[] = ((series as any[]) ?? []).map((r) => ({
        session_date: r.session_date,
        reps: r.reps,
        weight: r.weight,
        exercicio_id: r.exercicio_id,
        nome: r.exercicios?.name ?? "Exercício",
      }))

      // Agrupa por exercicio -> por data
      const mapa = new Map<string, ExercicioAgrupado>()
      for (const r of rows) {
        if (!mapa.has(r.exercicio_id)) mapa.set(r.exercicio_id, { id: r.exercicio_id, nome: r.nome, sessoes: [] })
        const g = mapa.get(r.exercicio_id)!
        const dataLabel = new Date(r.session_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
        let s = g.sessoes.find((x) => x.data === dataLabel)
        if (!s) {
          s = { data: dataLabel, maxCarga: 0, volume: 0, series: 0 }
          g.sessoes.push(s)
        }
        s.maxCarga = Math.max(s.maxCarga, r.weight ?? 0)
        s.volume += (r.reps ?? 0) * (r.weight ?? 0)
        s.series += 1
      }
      const arr = Array.from(mapa.values())
      setExercicios(arr)
      setSelId(arr[0]?.id ?? null)
      setAval((avaliacoes as Avaliacao[]) ?? [])
      setLoading(false)
    }

    load().catch(() => setLoading(false))
  }, [profile])

  const sel = useMemo(() => exercicios.find((e) => e.id === selId) ?? null, [exercicios, selId])
  const primeiro = sel?.sessoes[0]
  const ultimo = sel?.sessoes[sel.sessoes.length - 1]
  const ganho =
    primeiro && ultimo && primeiro.maxCarga > 0
      ? Math.round(((ultimo.maxCarga - primeiro.maxCarga) / primeiro.maxCarga) * 100)
      : 0

  const chartCorpo = aval.map((r) => ({
    data: new Date(r.assessed_on).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
    peso: r.weight_kg,
    gordura: r.body_fat,
    massa: r.muscle_mass,
  }))

  return (
    <div className="px-5 pt-8">
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-foreground">Progresso</h1>
        <p className="mt-0.5 text-sm text-muted">Sua evolução de carga, séries e físico</p>
      </header>

      {/* Abas */}
      <div className="mb-5 flex gap-1 rounded-2xl bg-surface p-1">
        {(["cargas", "corpo"] as Aba[]).map((a) => (
          <button
            key={a}
            onClick={() => setAba(a)}
            className={`flex-1 rounded-xl py-2 text-sm font-medium transition-colors ${
              aba === a ? "bg-primary text-primary-foreground" : "text-muted"
            }`}
          >
            {a === "cargas" ? "Cargas e séries" : "Físico"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="h-64 animate-pulse rounded-3xl bg-surface" />
      ) : aba === "cargas" ? (
        exercicios.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-3xl border border-border bg-surface p-8 text-center">
            <Barbell size={40} className="text-muted" weight="duotone" />
            <p className="font-medium text-foreground">Ainda sem registros</p>
            <p className="text-sm text-muted">Registre as séries dos seus treinos para acompanhar a evolução.</p>
          </div>
        ) : (
          <div>
            {/* Seletor de exercicio */}
            <select
              value={selId ?? ""}
              onChange={(e) => setSelId(e.target.value)}
              className="mb-4 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-medium text-foreground outline-none focus:border-primary"
            >
              {exercicios.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.nome}
                </option>
              ))}
            </select>

            {/* Cartoes de destaque */}
            <div className="mb-4 grid grid-cols-3 gap-2">
              <div className="rounded-2xl border border-border bg-surface p-3">
                <p className="text-xs text-muted">Carga atual</p>
                <p className="mt-1 text-lg font-bold text-foreground">{fmtCarga(ultimo?.maxCarga ?? null)}</p>
              </div>
              <div className="rounded-2xl border border-border bg-surface p-3">
                <p className="text-xs text-muted">Evolução</p>
                <p className="mt-1 flex items-center gap-1 text-lg font-bold text-success">
                  <TrendUp size={16} weight="bold" /> {ganho}%
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-surface p-3">
                <p className="text-xs text-muted">Volume</p>
                <p className="mt-1 text-lg font-bold text-foreground">{fmtVolume(ultimo?.volume ?? 0)}</p>
              </div>
            </div>

            {/* Grafico de carga maxima */}
            <div className="rounded-3xl border border-border bg-surface p-4">
              <h3 className="mb-3 text-sm font-semibold text-foreground">Carga máxima por sessão</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={sel?.sessoes ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="data" stroke="#8b8ba7" fontSize={11} />
                  <YAxis stroke="#8b8ba7" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      background: "#16162a",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 12,
                      color: "#fff",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="maxCarga"
                    stroke="#7c5cff"
                    strokeWidth={2.5}
                    dot={{ r: 4 }}
                    name="Carga (kg)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Historico de sessoes */}
            <div className="mt-4">
              <h3 className="mb-2 text-sm font-semibold text-foreground">Sessões recentes</h3>
              <div className="flex flex-col gap-2">
                {[...(sel?.sessoes ?? [])].reverse().map((s, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3 text-sm"
                  >
                    <span className="font-medium text-foreground">{s.data}</span>
                    <span className="text-muted">
                      {s.series} séries · máx {fmtCarga(s.maxCarga)} · {fmtVolume(s.volume)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      ) : aval.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-3xl border border-border bg-surface p-8 text-center">
          <ChartLineUp size={40} className="text-muted" weight="duotone" />
          <p className="font-medium text-foreground">Sem avaliações ainda</p>
          <p className="text-sm text-muted">Quando seu instrutor registrar avaliações, sua evolução aparece aqui.</p>
        </div>
      ) : (
        <div className="rounded-3xl border border-border bg-surface p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Evolução física</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartCorpo}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="data" stroke="#8b8ba7" fontSize={11} />
              <YAxis stroke="#8b8ba7" fontSize={11} />
              <Tooltip
                contentStyle={{
                  background: "#16162a",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 12,
                  color: "#fff",
                }}
              />
              <Line type="monotone" dataKey="peso" stroke="#7c5cff" strokeWidth={2} dot={{ r: 3 }} name="Peso (kg)" />
              <Line type="monotone" dataKey="massa" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} name="Massa (kg)" />
              <Line type="monotone" dataKey="gordura" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} name="Gordura (%)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
