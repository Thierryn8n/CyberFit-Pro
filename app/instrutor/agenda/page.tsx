"use client"

import { useEffect, useState } from "react"
import { Calendar, Plus, X, Clock } from "@phosphor-icons/react"

import { createClient } from "@/lib/supabase/client"
import { useUserProfile } from "../../hooks/useUserProfile"
import { PageHeader, EmptyState, Card, Badge } from "../../components/ui"

interface AgendaRow {
  id: string
  title: string
  scheduled_at: string
  duration_min: number
  status: string
  alunos: { profiles: { full_name: string | null } | null } | null
}

interface AlunoOption {
  id: string
  profiles: { full_name: string | null } | null
}

const tone: Record<string, "primary" | "success" | "danger"> = {
  agendado: "primary",
  concluido: "success",
  cancelado: "danger",
}

export default function AgendaPage() {
  const { profile } = useUserProfile()
  const [rows, setRows] = useState<AgendaRow[]>([])
  const [alunos, setAlunos] = useState<AlunoOption[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ aluno_id: "", title: "", scheduled_at: "", duration_min: "60" })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    if (!profile) return
    const supabase = createClient()
    const [{ data: agenda }, { data: als }] = await Promise.all([
      supabase
        .from("agenda")
        .select("id, title, scheduled_at, duration_min, status, alunos(profiles(full_name))")
        .eq("instrutor_id", profile.id)
        .order("scheduled_at", { ascending: true }),
      supabase.from("alunos").select("id, profiles(full_name)").eq("instrutor_id", profile.id),
    ])
    setRows((agenda as unknown as AgendaRow[]) ?? [])
    setAlunos((als as unknown as AlunoOption[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  const create = async () => {
    if (!profile || !form.title || !form.scheduled_at) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from("agenda").insert({
      instrutor_id: profile.id,
      aluno_id: form.aluno_id || null,
      title: form.title,
      scheduled_at: new Date(form.scheduled_at).toISOString(),
      duration_min: Number(form.duration_min),
    })
    setSaving(false)
    setOpen(false)
    setForm({ aluno_id: "", title: "", scheduled_at: "", duration_min: "60" })
    load()
  }

  return (
    <div>
      <PageHeader
        title="Agenda"
        subtitle="Aulas e compromissos"
        action={
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-neon transition hover:bg-primary/90"
          >
            <Plus size={18} weight="bold" /> Agendar
          </button>
        }
      />

      {loading ? (
        <p className="text-sm text-muted">Carregando...</p>
      ) : rows.length === 0 ? (
        <EmptyState icon={Calendar} title="Agenda vazia" description="Agende aulas e avaliações com seus alunos." />
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
                  <p className="truncate text-xs text-muted">{r.alunos?.profiles?.full_name ?? "—"}</p>
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

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button aria-label="Fechar" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="animate-fade-in relative w-full max-w-md cf-card p-6">
            <button onClick={() => setOpen(false)} aria-label="Fechar" className="absolute right-4 top-4 text-muted hover:text-foreground">
              <X size={20} />
            </button>
            <h3 className="text-lg font-semibold">Agendar</h3>

            <label className="mb-1 mt-4 block text-sm text-muted">Título</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Avaliação física"
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-foreground outline-none focus:border-primary"
            />

            <label className="mb-1 mt-4 block text-sm text-muted">Aluno (opcional)</label>
            <select
              value={form.aluno_id}
              onChange={(e) => setForm({ ...form, aluno_id: e.target.value })}
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-foreground outline-none focus:border-primary"
            >
              <option value="">—</option>
              {alunos.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.profiles?.full_name ?? "Aluno"}
                </option>
              ))}
            </select>

            <label className="mb-1 mt-4 block text-sm text-muted">Data e hora</label>
            <input
              type="datetime-local"
              value={form.scheduled_at}
              onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-foreground outline-none focus:border-primary"
            />

            <label className="mb-1 mt-4 block text-sm text-muted">Duração (min)</label>
            <input
              type="number"
              value={form.duration_min}
              onChange={(e) => setForm({ ...form, duration_min: e.target.value })}
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-foreground outline-none focus:border-primary"
            />

            <button
              onClick={create}
              disabled={saving || !form.title || !form.scheduled_at}
              className="mt-5 w-full rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground shadow-neon transition hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? "Salvando..." : "Agendar"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
