"use client"

import { useEffect, useState } from "react"
import { Barbell, Calendar, ChartLineUp, Clock } from "@phosphor-icons/react"

import { createClient } from "@/lib/supabase/client"
import { useUserProfile } from "../hooks/useUserProfile"
import { PageHeader, StatCard, Card, EmptyState } from "../components/ui"

interface NextAgenda {
  title: string
  scheduled_at: string
}

export default function AlunoDashboard() {
  const { profile, loading: profileLoading } = useUserProfile()
  const [stats, setStats] = useState({ treinos: 0, agenda: 0, avaliacoes: 0 })
  const [next, setNext] = useState<NextAgenda | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    const supabase = createClient()

    async function load() {
      const [{ count: treinos }, { count: agenda }, { count: avaliacoes }, { data: prox }] = await Promise.all([
        supabase
          .from("treinos")
          .select("id", { count: "exact", head: true })
          .eq("aluno_id", profile!.id)
          .eq("status", "ativo"),
        supabase
          .from("agenda")
          .select("id", { count: "exact", head: true })
          .eq("aluno_id", profile!.id)
          .eq("status", "agendado"),
        supabase.from("avaliacoes").select("id", { count: "exact", head: true }).eq("aluno_id", profile!.id),
        supabase
          .from("agenda")
          .select("title, scheduled_at")
          .eq("aluno_id", profile!.id)
          .eq("status", "agendado")
          .order("scheduled_at", { ascending: true })
          .limit(1)
          .maybeSingle(),
      ])
      setStats({ treinos: treinos ?? 0, agenda: agenda ?? 0, avaliacoes: avaliacoes ?? 0 })
      setNext((prox as NextAgenda) ?? null)
      setLoading(false)
    }

    load()
  }, [profile])

  const busy = profileLoading || loading

  return (
    <div>
      <PageHeader
        title={`Bem-vindo, ${profile?.full_name?.split(" ")[0] ?? "Aluno"}`}
        subtitle="Acompanhe seus treinos e evolução"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Treinos ativos" value={busy ? "–" : stats.treinos} icon={Barbell} accent="primary" />
        <StatCard label="Aulas agendadas" value={busy ? "–" : stats.agenda} icon={Calendar} accent="accent" />
        <StatCard label="Avaliações" value={busy ? "–" : stats.avaliacoes} icon={ChartLineUp} accent="success" />
      </div>

      <div className="mt-6">
        {next ? (
          <Card>
            <p className="text-sm text-muted">Próximo compromisso</p>
            <h3 className="mt-1 text-lg font-medium text-foreground">{next.title}</h3>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-primary">
              <Clock size={16} />
              {new Date(next.scheduled_at).toLocaleString("pt-BR", {
                weekday: "long",
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </Card>
        ) : (
          !busy && (
            <EmptyState
              icon={Calendar}
              title="Nada agendado"
              description="Seu instrutor ainda não marcou aulas ou avaliações."
            />
          )
        )}
      </div>
    </div>
  )
}
