"use client"

import { useEffect, useState } from "react"
import { ChartLineUp, Plus, X } from "@phosphor-icons/react"

import { createClient } from "@/lib/supabase/client"
import { useUserProfile } from "../../hooks/useUserProfile"
import { PageHeader, EmptyState, Card } from "../../components/ui"

interface AvaliacaoRow {
  id: string
  assessed_on: string
  weight_kg: number | null
  body_fat: number | null
  muscle_mass: number | null
  notes: string | null
  alunos: { profiles: { full_name: string | null } | null } | null
}

interface AlunoOption {
  id: string
  profiles: { full_name: string | null } | null
}

export default function AvaliacoesPage() {
  const { profile } = useUserProfile()
  const [rows, setRows] = useState<AvaliacaoRow[]>([])
  const [alunos, setAlunos] = useState<AlunoOption[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ aluno_id: "", weight_kg: "", body_fat: "", muscle_mass: "", notes: "" })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    if (!profile) return
    const supabase = createClient()
    const [{ data: avs }, { data: als }] = await Promise.all([
      supabase
        .from("avaliacoes")
        .select("id, assessed_on, weight_kg, body_fat, muscle_mass, notes, alunos(profiles(full_name))")
        .eq("instrutor_id", profile.id)
        .order("assessed_on", { ascending: false }),
      supabase.from("alunos").select("id, profiles(full_name)").eq("instrutor_id", profile.id),
    ])
    setRows((avs as unknown as AvaliacaoRow[]) ?? [])
    setAlunos((als as unknown as AlunoOption[]) ?? [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  const create = async () => {
    if (!profile || !form.aluno_id) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from("avaliacoes").insert({
      instrutor_id: profile.id,
      aluno_id: form.aluno_id,
      weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
      body_fat: form.body_fat ? Number(form.body_fat) : null,
      muscle_mass: form.muscle_mass ? Number(form.muscle_mass) : null,
      notes: form.notes || null,
    })
    setSaving(false)
    setOpen(false)
    setForm({ aluno_id: "", weight_kg: "", body_fat: "", muscle_mass: "", notes: "" })
    load()
  }

  return (
    <div>
      <PageHeader
        title="Avaliações"
        subtitle="Registro físico dos alunos"
        action={
          <button
            onClick={() => setOpen(true)}
            disabled={alunos.length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-neon transition hover:bg-primary/90 disabled:opacity-50"
          >
            <Plus size={18} weight="bold" /> Nova avaliação
          </button>
        }
      />

      {loading ? (
        <p className="text-sm text-muted">Carregando...</p>
      ) : rows.length === 0 ? (
        <EmptyState icon={ChartLineUp} title="Nenhuma avaliação" description="Registre a evolução física dos seus alunos." />
      ) : (
        <div className="cf-card overflow-hidden">
          <div className="hidden grid-cols-12 gap-4 border-b border-border px-5 py-3 text-xs font-medium text-muted sm:grid">
            <div className="col-span-4">Aluno</div>
            <div className="col-span-2">Data</div>
            <div className="col-span-2">Peso</div>
            <div className="col-span-2">Gordura</div>
            <div className="col-span-2">Massa</div>
          </div>
          {rows.map((a) => (
            <div
              key={a.id}
              className="flex flex-col gap-1 border-b border-border px-5 py-4 last:border-0 sm:grid sm:grid-cols-12 sm:items-center sm:gap-4"
            >
              <div className="col-span-4 truncate font-medium text-foreground">{a.alunos?.profiles?.full_name ?? "—"}</div>
              <div className="col-span-2 text-sm text-muted">{new Date(a.assessed_on).toLocaleDateString("pt-BR")}</div>
              <div className="col-span-2 text-sm text-muted">{a.weight_kg ? `${a.weight_kg} kg` : "—"}</div>
              <div className="col-span-2 text-sm text-muted">{a.body_fat ? `${a.body_fat}%` : "—"}</div>
              <div className="col-span-2 text-sm text-muted">{a.muscle_mass ? `${a.muscle_mass} kg` : "—"}</div>
            </div>
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
            <h3 className="text-lg font-semibold">Nova avaliação</h3>

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

            <div className="mt-4 grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-sm text-muted">Peso (kg)</label>
                <input
                  type="number"
                  value={form.weight_kg}
                  onChange={(e) => setForm({ ...form, weight_kg: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-foreground outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-muted">Gordura %</label>
                <input
                  type="number"
                  value={form.body_fat}
                  onChange={(e) => setForm({ ...form, body_fat: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-foreground outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-muted">Massa (kg)</label>
                <input
                  type="number"
                  value={form.muscle_mass}
                  onChange={(e) => setForm({ ...form, muscle_mass: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-foreground outline-none focus:border-primary"
                />
              </div>
            </div>

            <label className="mb-1 mt-4 block text-sm text-muted">Observações</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
              className="w-full resize-none rounded-xl border border-border bg-background px-4 py-2.5 text-foreground outline-none focus:border-primary"
            />

            <button
              onClick={create}
              disabled={saving || !form.aluno_id}
              className="mt-5 w-full rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground shadow-neon transition hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? "Salvando..." : "Registrar"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
