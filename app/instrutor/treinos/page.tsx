"use client"

import { useEffect, useMemo, useState } from "react"
import { Barbell, Plus, X, CaretDown, Trash, Copy, Users, Check, CalendarBlank } from "@phosphor-icons/react"

import { createClient } from "@/lib/supabase/client"
import { useUserProfile } from "../../hooks/useUserProfile"
import { PageHeader, EmptyState, Card, Badge } from "../../components/ui"
import { catLabel, type ExercicioLite } from "../../lib/biblioteca"
import BibliotecaExercicios from "../../components/BibliotecaExercicios"
import { criarTreinos, duplicarTreino, type ExercicioPayload } from "../../lib/treino-ops"

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

type Gender = "masculino" | "feminino" | "outro" | null

interface AlunoOption {
  id: string
  gender: Gender
  profiles: { full_name: string | null } | null
}

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
const DIAS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
type GenderFilter = "todos" | "masculino" | "feminino"

export default function TreinosPage() {
  const { profile } = useUserProfile()
  const [rows, setRows] = useState<TreinoRow[]>([])
  const [alunos, setAlunos] = useState<AlunoOption[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: "", description: "" })
  const [alunosSel, setAlunosSel] = useState<string[]>([])
  const [dias, setDias] = useState<number[]>([1])
  const [genderFilter, setGenderFilter] = useState<GenderFilter>("todos")
  const [selecionados, setSelecionados] = useState<Selecionado[]>([])
  const [picker, setPicker] = useState(false)
  const [saving, setSaving] = useState(false)

  // Duplicação
  const [dupSource, setDupSource] = useState<TreinoRow | null>(null)
  const [dupTargets, setDupTargets] = useState<string[]>([])
  const [dupGender, setDupGender] = useState<GenderFilter>("todos")
  const [dupSaving, setDupSaving] = useState(false)

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
      supabase.from("alunos").select("id, gender, profiles(full_name)").eq("instrutor_id", profile.id),
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
    setForm({ name: "", description: "" })
    setAlunosSel([])
    setDias([1])
    setGenderFilter("todos")
    setSelecionados([])
  }

  const toggleDia = (d: number) => setDias((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]))
  const toggleAluno = (id: string) =>
    setAlunosSel((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const create = async () => {
    if (!profile || alunosSel.length === 0 || !form.name) return
    setSaving(true)
    const supabase = createClient()
    const exercicios: ExercicioPayload[] = selecionados.map((s) => ({
      name: s.name,
      sets: s.sets ? Number(s.sets) : null,
      reps: s.reps || null,
      biblioteca_id: s.biblioteca_id,
      gif_url: s.gif_url,
      image_url: s.image_url,
      target: s.target,
      equipment: s.equipment,
    }))
    await criarTreinos(supabase, {
      instrutorId: profile.id,
      alunoIds: alunosSel,
      dias,
      name: form.name,
      description: form.description || null,
      exercicios,
    })
    setSaving(false)
    setOpen(false)
    resetForm()
    load()
  }

  const runDuplicate = async () => {
    if (!profile || !dupSource || dupTargets.length === 0) return
    setDupSaving(true)
    const supabase = createClient()
    await duplicarTreino(supabase, {
      instrutorId: profile.id,
      sourceTreinoId: dupSource.id,
      source: { name: dupSource.name, description: dupSource.description, day_of_week: dupSource.day_of_week },
      alunoIds: dupTargets,
    })
    setDupSaving(false)
    setDupSource(null)
    setDupTargets([])
    setDupGender("todos")
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
            className="cf-btn-primary !px-4 !py-2.5 text-sm disabled:opacity-50"
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
                <div className="flex w-full items-center gap-3 p-4">
                  <button onClick={() => setOpenId(expanded ? null : t.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <div className="cf-emboss flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent/15 text-accent">
                      <Barbell size={22} weight="duotone" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-medium text-foreground">{t.name}</h3>
                      <p className="truncate text-xs text-muted">
                        {t.alunos?.profiles?.full_name ?? "Sem aluno"}
                        {t.day_of_week != null ? ` · ${DIAS[t.day_of_week]}` : ""}
                      </p>
                    </div>
                  </button>
                  <Badge tone="primary">{exs.length} ex.</Badge>
                  <button
                    onClick={() => {
                      setDupSource(t)
                      setDupTargets([])
                    }}
                    aria-label="Duplicar treino"
                    title="Duplicar para outros alunos"
                    className="cf-inset flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-2 text-foreground transition-colors hover:text-primary"
                  >
                    <Copy size={17} weight="duotone" />
                  </button>
                  <button onClick={() => setOpenId(expanded ? null : t.id)} aria-label="Expandir" className="shrink-0">
                    <CaretDown size={18} className={`text-muted transition ${expanded ? "rotate-180" : ""}`} />
                  </button>
                </div>

                {expanded && (
                  <div className="border-t border-border px-5 py-4">
                    {t.description && <p className="mb-3 text-sm text-muted">{t.description}</p>}
                    {exs.length ? (
                      <ul className="grid grid-cols-1 gap-2">
                        {exs.map((ex) => (
                          <li key={ex.id} className="flex items-center gap-3 rounded-xl bg-surface-2 p-2">
                            {ex.gif_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={ex.gif_url || "/placeholder.svg"} alt={ex.name} className="h-12 w-12 shrink-0 rounded-md object-cover" />
                            ) : (
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-background text-muted">
                                <Barbell size={20} />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm capitalize text-foreground">{ex.name}</p>
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
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          <button aria-label="Fechar" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="animate-fade-in relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden cf-card !rounded-b-none p-0 sm:!rounded-3xl">
            <div className="flex items-center justify-between border-b border-border p-5">
              <h3 className="text-lg font-semibold">Novo treino</h3>
              <button onClick={() => setOpen(false)} aria-label="Fechar" className="text-muted hover:text-foreground">
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto p-5">
              {/* Alunos (multi-seleção + filtro por sexo) */}
              <div className="mb-2 flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <Users size={16} className="text-primary" /> Alunos {alunosSel.length > 0 && `(${alunosSel.length})`}
                </label>
                <GenderFilterTabs value={genderFilter} onChange={setGenderFilter} />
              </div>
              <AlunoPicker
                alunos={alunos}
                filter={genderFilter}
                selected={alunosSel}
                onToggle={toggleAluno}
                onSelectAll={(ids) => setAlunosSel(ids)}
                onClear={() => setAlunosSel([])}
              />

              {/* Dias da semana (multi) */}
              <label className="mb-2 mt-5 flex items-center gap-1.5 text-sm font-medium text-foreground">
                <CalendarBlank size={16} className="text-primary" /> Dias da semana
              </label>
              <div className="flex flex-wrap gap-2">
                {DIAS_SHORT.map((d, i) => {
                  const active = dias.includes(i)
                  return (
                    <button
                      key={d}
                      onClick={() => toggleDia(i)}
                      className={`rounded-xl border px-3 py-2 text-xs font-medium transition-all ${
                        active ? "cf-emboss border-transparent text-primary-foreground" : "border-border bg-surface-2 text-muted hover:text-foreground"
                      }`}
                      style={active ? { backgroundImage: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent-2)))" } : undefined}
                    >
                      {d}
                    </button>
                  )
                })}
              </div>
              <p className="mt-1.5 text-xs text-muted">
                {dias.length > 1
                  ? `O treino será criado em ${dias.length} dias para cada aluno selecionado.`
                  : "Selecione um ou mais dias."}
              </p>

              <label className="mb-1 mt-5 block text-sm text-muted">Nome do treino</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Treino A - Peito e tríceps"
                className="cf-input !px-4"
              />

              <label className="mb-1 mt-4 block text-sm text-muted">Observações</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                className="cf-input !px-4 resize-none"
              />

              {/* Exercícios */}
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
                    <li key={s.biblioteca_id} className="flex items-center gap-3 rounded-xl bg-surface-2 p-2.5">
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
                      <button onClick={() => removeSel(s.biblioteca_id)} aria-label="Remover" className="text-muted transition hover:text-danger">
                        <Trash size={18} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border-t border-border p-5">
              <button onClick={create} disabled={saving || alunosSel.length === 0 || !form.name} className="cf-btn-primary w-full disabled:opacity-50">
                {saving
                  ? "Salvando..."
                  : `Criar ${alunosSel.length * Math.max(dias.length, 1)} treino(s)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal duplicar */}
      {dupSource && (
        <div className="fixed inset-0 z-[55] flex items-end justify-center sm:items-center sm:p-4">
          <button aria-label="Fechar" onClick={() => setDupSource(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="animate-fade-in relative flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden cf-card !rounded-b-none p-0 sm:!rounded-3xl">
            <div className="flex items-center justify-between border-b border-border p-5">
              <div className="min-w-0">
                <h3 className="truncate text-lg font-semibold">Duplicar treino</h3>
                <p className="truncate text-xs text-muted">{dupSource.name}</p>
              </div>
              <button onClick={() => setDupSource(null)} aria-label="Fechar" className="text-muted hover:text-foreground">
                <X size={20} />
              </button>
            </div>
            <div className="overflow-y-auto p-5">
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">Copiar para {dupTargets.length > 0 && `(${dupTargets.length})`}</label>
                <GenderFilterTabs value={dupGender} onChange={setDupGender} />
              </div>
              <AlunoPicker
                alunos={alunos}
                filter={dupGender}
                selected={dupTargets}
                onToggle={(id) => setDupTargets((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))}
                onSelectAll={(ids) => setDupTargets(ids)}
                onClear={() => setDupTargets([])}
              />
              <p className="mt-3 text-xs text-muted">
                Mantém o mesmo dia ({dupSource.day_of_week != null ? DIAS[dupSource.day_of_week] : "sem dia"}) e todos os exercícios.
              </p>
            </div>
            <div className="border-t border-border p-5">
              <button onClick={runDuplicate} disabled={dupSaving || dupTargets.length === 0} className="cf-btn-primary w-full disabled:opacity-50">
                {dupSaving ? "Duplicando..." : `Duplicar para ${dupTargets.length} aluno(s)`}
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
              <button onClick={() => setPicker(false)} className="cf-btn-primary !px-4 !py-2 text-sm">
                Concluir
              </button>
            </div>
            <div className="overflow-y-auto p-5">
              <BibliotecaExercicios mode="picker" onPick={addExercicio} pickedIds={selecionados.map((s) => s.biblioteca_id)} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function GenderFilterTabs({ value, onChange }: { value: GenderFilter; onChange: (v: GenderFilter) => void }) {
  const opts: { v: GenderFilter; label: string }[] = [
    { v: "todos", label: "Todos" },
    { v: "masculino", label: "Masc." },
    { v: "feminino", label: "Fem." },
  ]
  return (
    <div className="cf-inset flex gap-0.5 rounded-xl border border-border bg-surface-2 p-0.5">
      {opts.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all ${
            value === o.v ? "bg-primary text-primary-foreground" : "text-muted hover:text-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function AlunoPicker({
  alunos,
  filter,
  selected,
  onToggle,
  onSelectAll,
  onClear,
}: {
  alunos: AlunoOption[]
  filter: GenderFilter
  selected: string[]
  onToggle: (id: string) => void
  onSelectAll: (ids: string[]) => void
  onClear: () => void
}) {
  const filtered = useMemo(
    () => (filter === "todos" ? alunos : alunos.filter((a) => a.gender === filter)),
    [alunos, filter],
  )
  const allIds = filtered.map((a) => a.id)
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.includes(id))

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <button
          onClick={() => (allSelected ? onClear() : onSelectAll(allIds))}
          className="rounded-lg bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-foreground transition hover:bg-primary hover:text-primary-foreground"
        >
          {allSelected ? "Limpar seleção" : "Selecionar todos"}
        </button>
        {filtered.length === 0 && <span className="text-xs text-muted">Nenhum aluno neste filtro.</span>}
      </div>
      <div className="grid max-h-44 grid-cols-1 gap-1.5 overflow-y-auto sm:grid-cols-2">
        {filtered.map((a) => {
          const on = selected.includes(a.id)
          return (
            <button
              key={a.id}
              onClick={() => onToggle(a.id)}
              className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-left transition-all ${
                on ? "border-primary bg-primary/10" : "border-border bg-surface-2 hover:border-primary/40"
              }`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                  on ? "border-transparent bg-primary text-primary-foreground" : "border-border"
                }`}
              >
                {on && <Check size={13} weight="bold" />}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-foreground">{a.profiles?.full_name ?? "Aluno"}</span>
              {a.gender && (
                <span className="shrink-0 text-[10px] uppercase text-muted">{a.gender === "masculino" ? "M" : a.gender === "feminino" ? "F" : "-"}</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
