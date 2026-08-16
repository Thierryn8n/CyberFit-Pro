"use client"

import { useEffect, useState } from "react"
import { ClockCounterClockwise, CheckCircle, Barbell } from "@phosphor-icons/react"

import { createClient } from "@/lib/supabase/client"
import { useUserProfile } from "../../hooks/useUserProfile"
import { PageHeader, EmptyState, Card } from "../../components/ui"

interface HistItem {
  id: string
  title: string
  date: string
}

export default function HistoricoPage() {
  const { profile } = useUserProfile()
  const [items, setItems] = useState<HistItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    const supabase = createClient()

    async function load() {
      const { data } = await supabase
        .from("agenda")
        .select("id, title, scheduled_at")
        .eq("aluno_id", profile!.id)
        .eq("status", "concluido")
        .order("scheduled_at", { ascending: false })
      setItems(
        ((data as { id: string; title: string; scheduled_at: string }[]) ?? []).map((d) => ({
          id: d.id,
          title: d.title,
          date: d.scheduled_at,
        })),
      )
      setLoading(false)
    }

    load()
  }, [profile])

  return (
    <div>
      <PageHeader title="Histórico" subtitle="Aulas e avaliações concluídas" />

      {loading ? (
        <p className="text-sm text-muted">Carregando...</p>
      ) : items.length === 0 ? (
        <EmptyState
          icon={ClockCounterClockwise}
          title="Sem histórico ainda"
          description="Compromissos concluídos aparecerão aqui."
        />
      ) : (
        <div className="space-y-3">
          {items.map((it) => (
            <Card key={it.id} className="flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-success/15 text-success">
                <CheckCircle size={22} weight="duotone" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 truncate font-medium text-foreground">
                  <Barbell size={16} className="text-muted" /> {it.title}
                </p>
                <p className="text-xs text-muted">{new Date(it.date).toLocaleDateString("pt-BR", { dateStyle: "long" })}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
