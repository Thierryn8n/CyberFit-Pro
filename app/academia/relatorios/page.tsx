"use client"

import { useEffect, useState } from "react"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts"

import { createClient } from "@/lib/supabase/client"
import { useUserProfile } from "../../hooks/useUserProfile"
import { PageHeader, Card } from "../../components/ui"

export default function RelatoriosPage() {
  const { profile } = useUserProfile()
  const [statusData, setStatusData] = useState<{ name: string; value: number }[]>([])
  const [receitaData, setReceitaData] = useState<{ mes: string; valor: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    const supabase = createClient()

    async function load() {
      const { data: alunos } = await supabase
        .from("alunos")
        .select("plan_status")
        .eq("academia_id", profile!.id)
      const { data: pagamentos } = await supabase
        .from("pagamentos")
        .select("amount, paid_at")
        .eq("academia_id", profile!.id)
        .eq("status", "pago")

      const counts: Record<string, number> = { ativo: 0, pendente: 0, inativo: 0 }
      ;(alunos ?? []).forEach((a) => {
        counts[a.plan_status] = (counts[a.plan_status] ?? 0) + 1
      })
      setStatusData([
        { name: "Ativos", value: counts.ativo },
        { name: "Pendentes", value: counts.pendente },
        { name: "Inativos", value: counts.inativo },
      ])

      const meses: Record<string, number> = {}
      ;(pagamentos ?? []).forEach((p) => {
        if (!p.paid_at) return
        const key = new Date(p.paid_at).toLocaleDateString("pt-BR", { month: "short" })
        meses[key] = (meses[key] ?? 0) + Number(p.amount)
      })
      setReceitaData(Object.entries(meses).map(([mes, valor]) => ({ mes, valor })))
      setLoading(false)
    }

    load()
  }, [profile])

  const colors = ["#22c55e", "#f59e0b", "#ef4444"]

  return (
    <div>
      <PageHeader title="Relatórios" subtitle="Indicadores da academia" />

      {loading ? (
        <p className="text-sm text-muted">Carregando...</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <h3 className="mb-4 font-medium">Receita por mês</h3>
            {receitaData.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted">Sem dados de receita ainda.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={receitaData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="mes" stroke="#8b8ba7" fontSize={12} />
                  <YAxis stroke="#8b8ba7" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      background: "#16162a",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 12,
                      color: "#fff",
                    }}
                  />
                  <Bar dataKey="valor" fill="#7c5cff" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card>
            <h3 className="mb-4 font-medium">Status dos alunos</h3>
            {statusData.every((s) => s.value === 0) ? (
              <p className="py-12 text-center text-sm text-muted">Sem alunos cadastrados ainda.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={3}>
                    {statusData.map((_, i) => (
                      <Cell key={i} fill={colors[i]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "#16162a",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 12,
                      color: "#fff",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
            <div className="mt-4 flex justify-center gap-4">
              {statusData.map((s, i) => (
                <div key={s.name} className="flex items-center gap-1.5 text-xs text-muted">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: colors[i] }} />
                  {s.name} ({s.value})
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
