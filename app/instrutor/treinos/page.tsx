"use client"

import { useEffect, useState } from "react"
import { Barbell, Plus, X, CaretDown, Trash } from "@phosphor-icons/react"

import { createClient } from "@/lib/supabase/client"
import { useUserProfile } from "../../hooks/useUserProfile"
import { PageHeader, EmptyState, Card, Badge } from "../../components/ui"
import { catLabel, type ExercicioLite } from "../../lib/biblioteca"
import BibliotecaExercicios from "../../components/BibliotecaExercicios"

interface ExercicioTreino {
  id: string
  name: string
  sets: number | null
  reps: string | null
  gif_url?: string | null
}

interface TreinoRow {
  id: string
  name: string
  description: string | null
  status: string
  day_of_week: number | null
  alunos: { profiles: { full_name: string | null } | null } | null
  exercicios: ExercicioTreino[]
}

interface AlunoOption {
  id: string
  profiles: { full_name: string | null } | null
}

// Exercicio selecionado no builder (antes de salvar)
interface Selecionado {
  biblioteca_id: string
  name: string
  category: string
  gif_url: string
  image_url: string
  target: string
  equipment: string
  sets: string
  reps: string
}

const DIAS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"]

export default function TreinosPage() {
  const { profile } = useUserProfile()
  const [rows, setRows] = useState<TreinoRow[]>([])
  const [alunos, setAlunos] = useState<AlunoOption[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [form, setForm] = useState({ aluno_id: "", name: "", description: "", day_of_week: "1" })
  const [selecionados, setSelecionados] = useState<Selecionado[]>([])
  const [picker, setPicker] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    if (!profile) return
    const supabase = createClient()
    const [{ data: treinos }, { data: als }] = await Promise.all([
      supabase
        .from("treinos")
        .select(
          "id, name, description, status, day_of_week, alunos(profiles(full_name)), exercicios(id, name, sets, reps, gif_url, order_index)",
        )
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

  const addExercicio = (ex: ExercicioLite) => {
    setSelecionados((prev) =>
      prev.some((s) => s.biblioteca_id === ex.id)
        ? prev
        : [
            ...prev,
            {
              biblioteca_id: ex.id,
              name: ex.name,
              category: ex.category,
              gif_url: ex.gif,
              image_url: ex.image,
              target: ex.target,
              equipment: ex.equipment,
              sets: "3",
              reps: "12",
            },
          ],
    )
  }

  const updateSel = (id: string, patch: Partial<Selecionado>) =>
    setSelecionados((prev) => prev.map((s) => (s.biblioteca_id === id ? { ...s, ...patch } : s)))

  const removeSel = (id: string) => setSelecionados((prev) => prev.filter((s) => s.biblioteca_id !== id))

  const resetForm = () => {
    setForm({ aluno_id: "", name: "", description: "", day_of_week: "1" })
    setSelecionados([])
  }

  const create = async () => {
    if (!profile || !form.aluno_id || !form.name) return
    setSaving(true)
    const supabase = createClient()
    const { data: treino, error } = await supabase
      .from("treinos")
      .insert({
        instrutor_id: profile.id,
        aluno_id: form.aluno_id,
        name: form.name,
        description: form.description || null,
        day_of_week: Number(form.day_of_week),
      })
      .select("id")
      .single()

    if (!error && treino && selecionados.length > 0) {
      const payload = selecionados.map((s, i) => ({
        treino_id: treino.id,
        name: s.name,
        sets: s.sets ? Number(s.sets) : null,
        reps: s.reps || null,
        order_index: i,
        biblioteca_id: s.biblioteca_id,
        gif_url: s.gif_url,
        image_url: s.image_url,
        target: s.target,
        equipment: s.equipment,
      }))
      const { error: exError } = await supabase.from("exercicios").insert(payload)
      // Fallback: se as colunas de midia ainda nao existem no banco, salva sem elas
      if (exError) {
        const basic = selecionados.map((s, i) => ({
          treino_id: treino.id,
          name: s.name,
          sets: s.sets ? Number(s.sets) : null,
          reps: s.reps || null,
          order_index: i,
        }))
        await supabase.from("exercicios").insert(basic)
      }
    }

    setSaving(false)
    setOpen(false)
    resetForm()
    load()
  }

  return (
    <div>
      <PageHeader
        title="Treinos"
        subtitle="Monte treinos com a biblioteca de 1.324 exercícios"
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
              : "Crie o primeiro treino e escolha exercícios da biblioteca."
          }
        />
      ) : (
        <div className="space-y-4">
          {rows.map((t) => {
            const expanded = openId === t.id
            const exs = [...(t.exercicios ?? [])]
            return (
              <Card key={t.id} className="p-0">
                <button
                  onClick={() => setOpenId(expanded ? null : t.id)}
                  className="flex w-full items-center gap-4 p-5 text-left"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/15 text-accent">
                    <Barbell size={22} weight="duotone" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-medium text-foreground">{t.name}</h3>
                    <p className="text-xs text-muted">
                      {t.alunos?.profiles?.full_name ?? "Sem aluno"}
                      {t.day_of_week != null ? ` · ${DIAS[t.day_of_week]}` : ""}
                    </p>
                  </div>
                  <Badge tone="primary">{exs.length} exercícios</Badge>
                  <Badge tone={t.status === "ativo" ? "success" : "muted"}>{t.status}</Badge>
                  <CaretDown size={18} className={`text-muted transition ${expanded ? "rotate-180" : ""}`} />
                </button>

                {expanded && (
                  <div className="border-t border-border px-5 py-4">
                    {t.description && <p className="mb-3 text-sm text-muted">{t.description}</p>}
                    {exs.length ? (
                      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {exs.map((ex) => (
                          <li key={ex.id} className="flex items-center gap-3 rounded-lg bg-background p-2">
                            {ex.gif_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={ex.gif_url || "/placeholder.svg"}
                                alt={ex.name}
                                className="h-12 w-12 shrink-0 rounded-md object-cover"
                              />
                            ) : (
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-surface-2 text-muted">
                                <Barbell size={20} />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm text-foreground">{ex.name}</p>
                              <p className="text-xs text-muted">
                                {ex.sets ?? "?"}x{ex.reps ?? "?"}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted">Sem exercícios neste treino.</p>
                    )}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal criar treino */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button aria-label="Fechar" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="animate-fade-in relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden cf-card p-0">
            <div className="flex items-center justify-between border-b border-border p-5">
              <h3 className="text-lg font-semibold">Novo treino</h3>
              <button onClick={() => setOpen(false)} aria-label="Fechar" className="text-muted hover:text-foreground">
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-muted">Aluno</label>
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
                </div>
                <div>
                  <label className="mb-1 block text-sm text-muted">Dia da semana</label>
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
                </div>
              </div>

              <label className="mb-1 mt-4 block text-sm text-muted">Nome do treino</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Treino A - Peito e tríceps"
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-foreground outline-none focus:border-primary"
              />

              <label className="mb-1 mt-4 block text-sm text-muted">Observações</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                className="w-full resize-none rounded-xl border border-border bg-background px-4 py-2.5 text-foreground outline-none focus:border-primary"
              />

              {/* Exercicios selecionados */}
              <div className="mt-5 flex items-center justify-between">
                <label className="block text-sm font-medium text-foreground">
                  Exercícios {selecionados.length > 0 && `(${selecionados.length})`}
                </label>
                <button
                  onClick={() => setPicker(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-surface-2 px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-primary hover:text-primary-foreground"
                >
                  <Plus size={15} weight="bold" /> Adicionar da biblioteca
                </button>
              </div>

              {selecionados.length === 0 ? (
                <p className="mt-2 rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted">
                  Nenhum exercício. Adicione da biblioteca.
                </p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {selecionados.map((s) => (
                    <li key={s.biblioteca_id} className="flex items-center gap-3 rounded-xl bg-background p-2.5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={s.gif_url || s.image_url || "/placeholder.svg"} alt={s.name} className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium capitalize text-foreground">{s.name}</p>
                        <p className="text-xs text-muted">{catLabel(s.category)}</p>
                        <div className="mt-1.5 flex items-center gap-2">
                          <input
                            value={s.sets}
                            onChange={(e) => updateSel(s.biblioteca_id, { sets: e.target.value })}
                            className="w-14 rounded-md border border-border bg-surface px-2 py-1 text-xs text-foreground outline-none focus:border-primary"
                            placeholder="Séries"
                            aria-label="Séries"
                          />
                          <span className="text-xs text-muted">x</span>
                          <input
                            value={s.reps}
                            onChange={(e) => updateSel(s.biblioteca_id, { reps: e.target.value })}
                            className="w-16 rounded-md border border-border bg-surface px-2 py-1 text-xs text-foreground outline-none focus:border-primary"
                            placeholder="Reps"
                            aria-label="Repetições"
                          />
                          <span className="text-xs text-muted">reps</span>
                        </div>
                      </div>
                      <button
                        onClick={() => removeSel(s.biblioteca_id)}
                        aria-label="Remover"
                        className="text-muted transition hover:text-danger"
                      >
                        <Trash size={18} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border-t border-border p-5">
              <button
                onClick={create}
                disabled={saving || !form.aluno_id || !form.name}
                className="w-full rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground shadow-neon transition hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? "Salvando..." : "Criar treino"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal picker da biblioteca */}
      {picker && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <button aria-label="Fechar" onClick={() => setPicker(false)} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="animate-fade-in relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden cf-card p-0">
            <div className="flex items-center justify-between border-b border-border p-5">
              <div>
                <h3 className="text-lg font-semibold">Biblioteca de Exercícios</h3>
                <p className="text-xs text-muted">{selecionados.length} selecionado(s)</p>
              </div>
              <button
                onClick={() => setPicker(false)}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              >
                Concluir
              </button>
            </div>
            <div className="overflow-y-auto p-5">
              <BibliotecaExercicios
                mode="picker"
                onPick={addExercicio}
                pickedIds={selecionados.map((s) => s.biblioteca_id)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
