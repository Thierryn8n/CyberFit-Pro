"use client"

import { useEffect, useState } from "react"
import { Users, ChalkboardTeacher, Money, ChartLineUp } from "@phosphor-icons/react"

import { createClient } from "@/lib/supabase/client"
import { useUserProfile } from "../hooks/useUserProfile"
import { PageHeader, StatCard, Card, EmptyState } from "../components/ui"

interface Stats {
  instrutores: number
  alunos: number
  ativos: number
  receita: number
}

export default function AcademiaDashboard() {
  const { profile, loading: profileLoading } = useUserProfile()
  const [stats, setStats] = useState<Stats>({ instrutores: 0, alunos: 0, ativos: 0, receita: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    const supabase = createClient()

    async function load() {
      const [{ count: instrutores }, { count: alunos }, { count: ativos }, { data: pagamentos }] = await Promise.all([
        supabase.from("instrutores").select("id", { count: "exact", head: true }).eq("academia_id", profile!.id),
        supabase.from("alunos").select("id", { count: "exact", head: true }).eq("academia_id", profile!.id),
        supabase
          .from("alunos")
          .select("id", { count: "exact", head: true })
          .eq("academia_id", profile!.id)
          .eq("plan_status", "ativo"),
        supabase.from("pagamentos").select("amount").eq("academia_id", profile!.id).eq("status", "pago"),
      ])

      const receita = (pagamentos ?? []).reduce((acc, p) => acc + Number(p.amount ?? 0), 0)
      setStats({
        instrutores: instrutores ?? 0,
        alunos: alunos ?? 0,
        ativos: ativos ?? 0,
        receita,
      })
      setLoading(false)
    }

    load()
  }, [profile])

  const busy = profileLoading || loading

  return (
    <div>
      <PageHeader
        title={`Bem-vindo, ${profile?.full_name?.split(" ")[0] ?? "Academia"}`}
        subtitle="Visão geral da sua academia"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Instrutores" value={busy ? "–" : stats.instrutores} icon={ChalkboardTeacher} accent="primary" />
        <StatCard label="Alunos" value={busy ? "–" : stats.alunos} icon={Users} accent="accent" />
        <StatCard label="Alunos ativos" value={busy ? "–" : stats.ativos} icon={ChartLineUp} accent="success" />
        <StatCard
          label="Receita recebida"
          value={busy ? "–" : `R$ ${stats.receita.toLocaleString("pt-BR")}`}
          icon={Money}
          accent="warning"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-1 text-lg font-medium">Comece por aqui</h3>
          <p className="text-sm text-muted">
            Convide seus instrutores na aba <strong className="text-foreground">Instrutores</strong>. Cada instrutor
            recebe um código para se cadastrar e, depois, gera códigos para os próprios alunos.
          </p>
        </Card>
        <Card>
          <h3 className="mb-1 text-lg font-medium">Financeiro</h3>
          <p className="text-sm text-muted">
            Registre mensalidades e acompanhe pagamentos na aba{" "}
            <strong className="text-foreground">Financeiro</strong>.
          </p>
        </Card>
      </div>

      {!busy && stats.instrutores === 0 && stats.alunos === 0 && (
        <div className="mt-6">
          <EmptyState
            icon={ChalkboardTeacher}
            title="Sua academia ainda está vazia"
            description="Convide seu primeiro instrutor para começar a montar sua equipe."
          />
        </div>
      )}
    </div>
  )
}
