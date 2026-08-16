"use client"

import { useEffect, useState } from "react"
import { Barbell, Plus, X } from "@phosphor-icons/react"

import { createClient } from "@/lib/supabase/client"
import { useUserProfile } from "../../hooks/useUserProfile"
import { PageHeader, EmptyState, Card, Badge } from "../../components/ui"

interface TreinoRow {
  id: string
  name: string
  description: string | null
  status: string
  day_of_week: number | null
  alunos: { profiles: { full_name: string | null } | null } | null
}

interface AlunoOption {
  id: string
  profiles: { full_name: string | null } | null
}

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]

export default function TreinosPage() {
  const { profile } = useUserProfile()
  const [rows, setRows] = useState<TreinoRow[]>([])
  const [alunos, setAlunos] = useState<AlunoOption[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ aluno_id: "", name: "", description: "", day_of_week: "1" })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    if (!profile) return
    const supabase = createClient()
    const [{ data: treinos }, { data: als }] = await Promise.all([
      supabase
        .from("treinos")
        .select("id, name, description, status, day_of_week, alunos(profiles(full_name))")
        .eq("instrutor_id", profile.id)
        .order("created_at", { ascending: false }),
      supabase.from("alunos").select("id, profiles(full_name)").eq("instrutor_id", profile.id),
    ])
    setRows((treinos as unknown as TreinoRow[]) ?? [])
    setAlunos((als as unknown as AlunoOption[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  const create = async () => {
    if (!profile || !form.aluno_id || !form.name) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from("treinos").insert({
      instrutor_id: profile.id,
      aluno_id: form.aluno_id,
      name: form.name,
      description: form.description || null,
      day_of_week: Number(form.day_of_week),
    })
    setSaving(false)
    setOpen(false)
    setForm({ aluno_id: "", name: "", description: "", day_of_week: "1" })
    load()
  }

  return (
    <div>
      <PageHeader
        title="Treinos"
        subtitle="Monte e atribua treinos"
        action={
          <button
            onClick={() => setOpen(true)}
            disabled={alunos.length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-neon transition hover:bg-primary/90 disabled:opacity-50"
          >
            <Plus size={18} weight="bold" /> Novo treino
          </button>
        }
      />

      {loading ? (
        <p className="text-sm text-muted">Carregando...</p>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Barbell}
          title="Nenhum treino criado"
          description={
            alunos.length === 0
              ? "Convide um aluno antes de criar treinos."
              : "Crie o primeiro treino e atribua a um aluno."
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((t) => (
            <Card key={t.id}>
              <div className="flex items-start justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/15 text-accent">
                  <Barbell size={22} weight="duotone" />
                </div>
                <Badge tone={t.status === "ativo" ? "success" : "muted"}>{t.status}</Badge>
              </div>
              <h3 className="mt-3 font-medium text-foreground">{t.name}</h3>
              <p className="text-xs text-muted">{t.alunos?.profiles?.full_name ?? "Sem aluno"}</p>
              {t.description && <p className="mt-2 text-sm text-muted line-clamp-2">{t.description}</p>}
              {t.day_of_week != null && <p className="mt-3 text-xs text-primary">{DIAS[t.day_of_week]}</p>}
            </Card>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button aria-label="Fechar" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="animate-fade-in relative w-full max-w-md cf-card p-6">
            <button onClick={() => setOpen(false)} aria-label="Fechar" className="absolute right-4 top-4 text-muted hover:text-foreground">
              <X size={20} />
            </button>
            <h3 className="text-lg font-semibold">Novo treino</h3>

            <label className="mb-1 mt-4 block text-sm text-muted">Aluno</label>
            <select
              value={form.aluno_id}
              onChange={(e) => setForm({ ...form, aluno_id: e.target.value })}
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-foreground outline-none focus:border-primary"
            >
              <option value="">Selecione...</option>
              {alunos.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.profiles?.full_name ?? "Aluno"}
                </option>
              ))}
            </select>

            <label className="mb-1 mt-4 block text-sm text-muted">Nome do treino</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Treino A - Peito e tríceps"
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-foreground outline-none focus:border-primary"
            />

            <label className="mb-1 mt-4 block text-sm text-muted">Dia da semana</label>
            <select
              value={form.day_of_week}
              onChange={(e) => setForm({ ...form, day_of_week: e.target.value })}
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-foreground outline-none focus:border-primary"
            >
              {DIAS.map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </select>

            <label className="mb-1 mt-4 block text-sm text-muted">Observações</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full resize-none rounded-xl border border-border bg-background px-4 py-2.5 text-foreground outline-none focus:border-primary"
            />

            <button
              onClick={create}
              disabled={saving || !form.aluno_id || !form.name}
              className="mt-5 w-full rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground shadow-neon transition hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? "Salvando..." : "Criar treino"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
