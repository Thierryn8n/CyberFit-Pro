"use client"

import { useEffect, useState } from "react"
import { Calendar, Clock } from "@phosphor-icons/react"

import { createClient } from "@/lib/supabase/client"
import { useUserProfile } from "../../hooks/useUserProfile"
import { PageHeader, EmptyState, Card, Badge } from "../../components/ui"

interface AgendaRow {
  id: string
  title: string
  scheduled_at: string
  duration_min: number
  status: string
}

const tone: Record<string, "primary" | "success" | "danger"> = {
  agendado: "primary",
  concluido: "success",
  cancelado: "danger",
}

export default function AlunoAgendaPage() {
  const { profile } = useUserProfile()
  const [rows, setRows] = useState<AgendaRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    const supabase = createClient()

    async function load() {
      const { data } = await supabase
        .from("agenda")
        .select("id, title, scheduled_at, duration_min, status")
        .eq("aluno_id", profile!.id)
        .order("scheduled_at", { ascending: true })
      setRows((data as AgendaRow[]) ?? [])
      setLoading(false)
    }

    load()
  }, [profile])

  return (
    <div>
      <PageHeader title="Agenda" subtitle="Suas aulas e avaliações" />

      {loading ? (
        <p className="text-sm text-muted">Carregando...</p>
      ) : rows.length === 0 ? (
        <EmptyState icon={Calendar} title="Nada agendado" description="Seu instrutor ainda não marcou compromissos." />
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const d = new Date(r.scheduled_at)
            return (
              <Card key={r.id} className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <span className="text-lg font-semibold leading-none">{d.getDate()}</span>
                  <span className="text-[10px] uppercase">{d.toLocaleDateString("pt-BR", { month: "short" })}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">{r.title}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted">
                    <Clock size={13} /> {d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} ·{" "}
                    {r.duration_min}min
                  </p>
                </div>
                <Badge tone={tone[r.status] ?? "muted"}>{r.status}</Badge>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
