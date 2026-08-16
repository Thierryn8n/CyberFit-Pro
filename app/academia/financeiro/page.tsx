"use client"

import { useEffect, useState } from "react"
import { Money, TrendUp, Clock, WarningCircle } from "@phosphor-icons/react"

import { createClient } from "@/lib/supabase/client"
import { useUserProfile } from "../../hooks/useUserProfile"
import { PageHeader, StatCard, EmptyState, Badge } from "../../components/ui"

interface Pagamento {
  id: string
  amount: number
  description: string | null
  due_date: string | null
  status: string
  alunos: { profiles: { full_name: string | null } | null } | null
}

const tone: Record<string, "success" | "warning" | "danger" | "muted"> = {
  pago: "success",
  pendente: "warning",
  atrasado: "danger",
  cancelado: "muted",
}

function brl(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

export default function FinanceiroPage() {
  const { profile } = useUserProfile()
  const [rows, setRows] = useState<Pagamento[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    const supabase = createClient()

    async function load() {
      const { data } = await supabase
        .from("pagamentos")
        .select("id, amount, description, due_date, status, alunos(profiles(full_name))")
        .eq("academia_id", profile!.id)
        .order("due_date", { ascending: false })
      setRows((data as unknown as Pagamento[]) ?? [])
      setLoading(false)
    }

    load()
  }, [profile])

  const recebido = rows.filter((r) => r.status === "pago").reduce((a, r) => a + Number(r.amount), 0)
  const pendente = rows.filter((r) => r.status === "pendente").reduce((a, r) => a + Number(r.amount), 0)
  const atrasado = rows.filter((r) => r.status === "atrasado").reduce((a, r) => a + Number(r.amount), 0)

  return (
    <div>
      <PageHeader title="Financeiro" subtitle="Mensalidades e pagamentos" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Recebido" value={loading ? "–" : brl(recebido)} icon={TrendUp} accent="success" />
        <StatCard label="A receber" value={loading ? "–" : brl(pendente)} icon={Clock} accent="warning" />
        <StatCard label="Em atraso" value={loading ? "–" : brl(atrasado)} icon={WarningCircle} accent="primary" />
      </div>

      <div className="mt-6">
        {loading ? (
          <p className="text-sm text-muted">Carregando...</p>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Money}
            title="Nenhum pagamento registrado"
            description="Os pagamentos das mensalidades aparecerão aqui."
          />
        ) : (
          <div className="cf-card overflow-hidden">
            <div className="hidden grid-cols-12 gap-4 border-b border-border px-5 py-3 text-xs font-medium text-muted sm:grid">
              <div className="col-span-4">Aluno</div>
              <div className="col-span-3">Descrição</div>
              <div className="col-span-2">Vencimento</div>
              <div className="col-span-2 text-right">Valor</div>
              <div className="col-span-1 text-right">Status</div>
            </div>
            {rows.map((p) => (
              <div
                key={p.id}
                className="flex flex-col gap-2 border-b border-border px-5 py-4 last:border-0 sm:grid sm:grid-cols-12 sm:items-center sm:gap-4"
              >
                <div className="col-span-4 truncate font-medium text-foreground">
                  {p.alunos?.profiles?.full_name ?? "—"}
                </div>
                <div className="col-span-3 truncate text-sm text-muted">{p.description ?? "Mensalidade"}</div>
                <div className="col-span-2 text-sm text-muted">
                  {p.due_date ? new Date(p.due_date).toLocaleDateString("pt-BR") : "—"}
                </div>
                <div className="col-span-2 text-sm text-foreground sm:text-right">{brl(Number(p.amount))}</div>
                <div className="col-span-1 sm:text-right">
                  <Badge tone={tone[p.status] ?? "muted"}>{p.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
