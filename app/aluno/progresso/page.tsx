"use client"

import { useEffect, useState } from "react"
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts"
import { ChartLineUp } from "@phosphor-icons/react"

import { createClient } from "@/lib/supabase/client"
import { useUserProfile } from "../../hooks/useUserProfile"
import { PageHeader, Card, EmptyState, StatCard } from "../../components/ui"

interface Avaliacao {
  assessed_on: string
  weight_kg: number | null
  body_fat: number | null
  muscle_mass: number | null
}

export default function ProgressoPage() {
  const { profile } = useUserProfile()
  const [rows, setRows] = useState<Avaliacao[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    const supabase = createClient()

    async function load() {
      const { data } = await supabase
        .from("avaliacoes")
        .select("assessed_on, weight_kg, body_fat, muscle_mass")
        .eq("aluno_id", profile!.id)
        .order("assessed_on", { ascending: true })
      setRows((data as Avaliacao[]) ?? [])
      setLoading(false)
    }

    load()
  }, [profile])

  const chart = rows.map((r) => ({
    data: new Date(r.assessed_on).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
    peso: r.weight_kg,
    gordura: r.body_fat,
    massa: r.muscle_mass,
  }))

  const last = rows[rows.length - 1]

  return (
    <div>
      <PageHeader title="Progresso" subtitle="Sua evolução física" />

      {loading ? (
        <p className="text-sm text-muted">Carregando...</p>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={ChartLineUp}
          title="Sem avaliações ainda"
          description="Quando seu instrutor registrar avaliações, sua evolução aparece aqui."
        />
      ) : (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Peso atual" value={last?.weight_kg ? `${last.weight_kg} kg` : "—"} icon={ChartLineUp} accent="primary" />
            <StatCard label="Gordura" value={last?.body_fat ? `${last.body_fat}%` : "—"} icon={ChartLineUp} accent="warning" />
            <StatCard label="Massa magra" value={last?.muscle_mass ? `${last.muscle_mass} kg` : "—"} icon={ChartLineUp} accent="success" />
          </div>

          <Card>
            <h3 className="mb-4 font-medium">Evolução</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="data" stroke="#8b8ba7" fontSize={12} />
                <YAxis stroke="#8b8ba7" fontSize={12} />
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
          </Card>
        </>
      )}
    </div>
  )
}
