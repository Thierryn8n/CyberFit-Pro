"use client"

import { useEffect, useState } from "react"
import { Users, Barbell, Calendar, ChartLineUp } from "@phosphor-icons/react"

import { createClient } from "@/lib/supabase/client"
import { useUserProfile } from "../hooks/useUserProfile"
import { PageHeader, StatCard, Card, EmptyState } from "../components/ui"
import InviteButton from "../components/InviteButton"

export default function InstrutorDashboard() {
  const { profile, loading: profileLoading } = useUserProfile()
  const [stats, setStats] = useState({ alunos: 0, treinos: 0, agenda: 0, avaliacoes: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    const supabase = createClient()

    async function load() {
      const [{ count: alunos }, { count: treinos }, { count: agenda }, { count: avaliacoes }] = await Promise.all([
        supabase.from("alunos").select("id", { count: "exact", head: true }).eq("instrutor_id", profile!.id),
        supabase
          .from("treinos")
          .select("id", { count: "exact", head: true })
          .eq("instrutor_id", profile!.id)
          .eq("status", "ativo"),
        supabase
          .from("agenda")
          .select("id", { count: "exact", head: true })
          .eq("instrutor_id", profile!.id)
          .eq("status", "agendado"),
        supabase.from("avaliacoes").select("id", { count: "exact", head: true }).eq("instrutor_id", profile!.id),
      ])
      setStats({ alunos: alunos ?? 0, treinos: treinos ?? 0, agenda: agenda ?? 0, avaliacoes: avaliacoes ?? 0 })
      setLoading(false)
    }

    load()
  }, [profile])

  const busy = profileLoading || loading

  return (
    <div>
      <PageHeader
        title={`Olá, ${profile?.full_name?.split(" ")[0] ?? "Instrutor"}`}
        subtitle="Resumo dos seus alunos e treinos"
        action={<InviteButton targetRole="aluno" label="Convidar aluno" />}
      />

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Meus alunos" value={busy ? "–" : stats.alunos} icon={Users} accent="primary" />
        <StatCard label="Treinos ativos" value={busy ? "–" : stats.treinos} icon={Barbell} accent="accent" />
        <StatCard label="Aulas agendadas" value={busy ? "–" : stats.agenda} icon={Calendar} accent="success" />
        <StatCard label="Avaliações" value={busy ? "–" : stats.avaliacoes} icon={ChartLineUp} accent="warning" />
      </div>

      {!busy && stats.alunos === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={Users}
            title="Você ainda não tem alunos"
            description="Gere um código de convite e envie ao aluno para ele se cadastrar vinculado a você."
            action={<InviteButton targetRole="aluno" label="Convidar aluno" />}
          />
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4">
          <Card>
            <h3 className="mb-1 text-lg font-medium">Monte treinos</h3>
            <p className="text-sm text-muted">
              Crie e atribua treinos aos seus alunos na aba <strong className="text-foreground">Treinos</strong>.
            </p>
          </Card>
          <Card>
            <h3 className="mb-1 text-lg font-medium">Agende avaliações</h3>
            <p className="text-sm text-muted">
              Use a <strong className="text-foreground">Agenda</strong> para marcar aulas e avaliações físicas.
            </p>
          </Card>
        </div>
      )}
    </div>
  )
}
