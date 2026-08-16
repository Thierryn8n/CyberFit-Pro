"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  X,
  CheckCircle,
  Circle,
  CaretRight,
  ClockCounterClockwise,
  Info,
  CaretDown,
  SpinnerGap,
  ListNumbers,
  NotePencil,
} from "@phosphor-icons/react"

import { createClient } from "@/lib/supabase/client"
import { dataLocalISO, calcularVolume, fmtCarga } from "../lib/treino"
import {
  fetchExercicio,
  fetchExercicioPorNome,
  resolverInstrucao,
  catLabel,
  equipLabel,
  muscleLabel,
  idiomaLabel,
  type ExercicioFull,
} from "../lib/biblioteca"

export interface PlayerExercicio {
  id: string
  name: string
  sets: number | null
  reps: string | null
  weight: string | null
  notes: string | null
  gif_url: string | null
  image_url: string | null
  target: string | null
  equipment: string | null
  biblioteca_id?: string | null
  /** Detalhe completo da biblioteca (quando ja carregado na tela de lista). */
  full?: ExercicioFull | null
}

interface SetState {
  reps: string
  weight: string
  done: boolean
}

interface Props {
  exercicio: PlayerExercicio
  alunoId: string
  treinoId: string
  persist: boolean
  index: number
  total: number
  onClose: () => void
  onNext: () => void
  onProgress: (exercicioId: string, done: boolean) => void
}

export default function ExercicioPlayer({
  exercicio,
  alunoId,
  treinoId,
  persist,
  index,
  total,
  onClose,
  onNext,
  onProgress,
}: Props) {
  const nSets = Math.max(1, exercicio.sets ?? 3)
  const [sets, setSets] = useState<SetState[]>(() =>
    Array.from({ length: nSets }, () => ({ reps: exercicio.reps ?? "", weight: "", done: false })),
  )
  const [last, setLast] = useState<Record<number, { reps: number | null; weight: number | null }>>({})
  const [showInfo, setShowInfo] = useState(false)
  const [detail, setDetail] = useState<ExercicioFull | null>(exercicio.full ?? null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailTentado, setDetailTentado] = useState(Boolean(exercicio.full))
  const media = exercicio.gif_url || exercicio.image_url || ""

  // Ao abrir "Ver mais", busca o detalhe completo da biblioteca (grupo, alvo,
  // musculos secundarios e passo a passo) caso ainda nao tenha sido carregado.
  useEffect(() => {
    if (!showInfo || detail || detailTentado || detailLoading) return
    let active = true
    setDetailLoading(true)
    async function carregar() {
      let d: ExercicioFull | null = null
      if (exercicio.biblioteca_id) {
        d = await fetchExercicio(exercicio.biblioteca_id).catch(() => null)
      }
      if (!d) d = await fetchExercicioPorNome(exercicio.name)
      if (!active) return
      setDetail(d)
      setDetailLoading(false)
      setDetailTentado(true)
    }
    carregar()
    return () => {
      active = false
    }
  }, [showInfo, detail, detailTentado, detailLoading, exercicio.biblioteca_id, exercicio.name])

  // Reset ao trocar de exercicio (o player e reutilizado entre exercicios).
  useEffect(() => {
    setDetail(exercicio.full ?? null)
    setDetailTentado(Boolean(exercicio.full))
    setShowInfo(false)
  }, [exercicio.id, exercicio.full])

  const instrucao = useMemo(() => (detail ? resolverInstrucao(detail) : null), [detail])

  // Carrega series ja registradas hoje + a ultima sessao anterior (comparativo)
  useEffect(() => {
    if (!persist) return
    const supabase = createClient()
    const hoje = dataLocalISO()

    async function load() {
      const { data: hojeRows } = await supabase
        .from("series_registros")
        .select("set_index, reps, weight")
        .eq("aluno_id", alunoId)
        .eq("exercicio_id", exercicio.id)
        .eq("session_date", hoje)

      if (hojeRows && hojeRows.length > 0) {
        setSets((prev) => {
          const copy = [...prev]
          for (const r of hojeRows as any[]) {
            const i = r.set_index - 1
            if (copy[i]) copy[i] = { reps: String(r.reps ?? ""), weight: String(r.weight ?? ""), done: true }
          }
          return copy
        })
      }

      // Ultima sessao anterior a hoje
      const { data: prevDateRow } = await supabase
        .from("series_registros")
        .select("session_date")
        .eq("aluno_id", alunoId)
        .eq("exercicio_id", exercicio.id)
        .lt("session_date", hoje)
        .order("session_date", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (prevDateRow?.session_date) {
        const { data: prevRows } = await supabase
          .from("series_registros")
          .select("set_index, reps, weight")
          .eq("aluno_id", alunoId)
          .eq("exercicio_id", exercicio.id)
          .eq("session_date", prevDateRow.session_date)
        const map: Record<number, { reps: number | null; weight: number | null }> = {}
        for (const r of (prevRows as any[]) ?? []) map[r.set_index] = { reps: r.reps, weight: r.weight }
        setLast(map)
      }
    }

    load().catch(() => {})
  }, [alunoId, exercicio.id, persist])

  const volume = useMemo(
    () =>
      calcularVolume(
        sets
          .filter((s) => s.done)
          .map((s, i) => ({ set_index: i + 1, reps: Number(s.reps) || 0, weight: Number(s.weight) || 0 })),
      ),
    [sets],
  )

  const allDone = sets.every((s) => s.done)
  const prevAllDone = useRef(false)
  useEffect(() => {
    if (allDone !== prevAllDone.current) {
      prevAllDone.current = allDone
      onProgress(exercicio.id, allDone)
    }
  }, [allDone, exercicio.id, onProgress])

  function update(i: number, patch: Partial<SetState>) {
    setSets((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)))
  }

  async function toggleDone(i: number) {
    const target = sets[i]
    const nextDone = !target.done
    update(i, { done: nextDone })
    if (!persist) return
    const supabase = createClient()
    try {
      if (nextDone) {
        await supabase.from("series_registros").upsert(
          {
            aluno_id: alunoId,
            exercicio_id: exercicio.id,
            treino_id: treinoId,
            set_index: i + 1,
            reps: Number(target.reps) || null,
            weight: Number(target.weight) || null,
            session_date: dataLocalISO(),
          },
          { onConflict: "aluno_id,exercicio_id,session_date,set_index" },
        )
      } else {
        await supabase
          .from("series_registros")
          .delete()
          .eq("aluno_id", alunoId)
          .eq("exercicio_id", exercicio.id)
          .eq("session_date", dataLocalISO())
          .eq("set_index", i + 1)
      }
    } catch {
      /* offline/preview: mantem estado local */
    }
  }

  return (
    <div className="fixed inset-0 z-50 mx-auto flex max-w-md flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <button onClick={onClose} aria-label="Fechar" className="text-muted hover:text-foreground">
          <X size={24} />
        </button>
        <span className="text-xs font-medium text-muted">
          Exercício {index + 1} de {total}
        </span>
        <span className="w-6" />
      </div>

      <div className="flex-1 overflow-y-auto pb-4">
        {/* Midia */}
        <div className="relative aspect-square w-full bg-surface-2">
          {media ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={media || "/placeholder.svg"} alt={exercicio.name} className="h-full w-full object-contain" />
          ) : (
            <div className="flex h-full items-center justify-center text-muted">Sem imagem</div>
          )}
        </div>

        {/* Titulo e tags */}
        <div className="px-5 pt-4">
          <h1 className="text-xl font-bold text-foreground text-balance">{detail?.name || exercicio.name}</h1>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {(detail?.target || exercicio.target) && (
              <span className="rounded-full bg-primary/15 px-2.5 py-1 text-primary">
                {muscleLabel(detail?.target || exercicio.target || "")}
              </span>
            )}
            {(detail?.equipment || exercicio.equipment) && (
              <span className="rounded-full bg-surface px-2.5 py-1 text-muted">
                {equipLabel(detail?.equipment || exercicio.equipment || "")}
              </span>
            )}
            <span className="rounded-full bg-surface px-2.5 py-1 text-muted">
              Meta: {nSets} x {exercicio.reps || "–"}
            </span>
          </div>

          <button
            onClick={() => setShowInfo((v) => !v)}
            aria-expanded={showInfo}
            className="mt-3 flex w-full items-center justify-between gap-1.5 rounded-xl border border-border bg-surface px-3 py-2.5 text-sm font-medium text-accent"
          >
            <span className="flex items-center gap-1.5">
              <Info size={16} /> {showInfo ? "Ver menos" : "Ver mais sobre o exercício"}
            </span>
            <CaretDown size={16} className={`transition-transform ${showInfo ? "rotate-180" : ""}`} />
          </button>

          {showInfo && (
            <div className="mt-3 flex flex-col gap-4">
              {/* Observacao personalizada do instrutor */}
              {exercicio.notes && (
                <div className="rounded-xl border border-accent/30 bg-accent/10 p-3">
                  <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-accent">
                    <NotePencil size={14} weight="fill" /> Observação do instrutor
                  </p>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">{exercicio.notes}</p>
                </div>
              )}

              {detailLoading && !detail && (
                <div className="flex items-center justify-center gap-2 rounded-xl bg-surface py-6 text-sm text-muted">
                  <SpinnerGap size={18} className="animate-spin" /> Carregando detalhes...
                </div>
              )}

              {detail && (
                <>
                  {/* Ficha do exercicio */}
                  <div className="rounded-xl bg-surface p-3">
                    <div className="flex flex-col gap-2 text-sm">
                      <FichaLinha label="Grupo muscular" value={catLabel(detail.category)} />
                      <FichaLinha label="Equipamento" value={equipLabel(detail.equipment)} />
                      {detail.target && <FichaLinha label="Músculo alvo" value={muscleLabel(detail.target)} />}
                    </div>
                    {detail.secondary_muscles.length > 0 && (
                      <div className="mt-3 border-t border-border pt-3">
                        <p className="mb-1.5 text-xs text-muted">Músculos secundários</p>
                        <div className="flex flex-wrap gap-1.5">
                          {detail.secondary_muscles.map((m) => (
                            <span key={m} className="rounded-full bg-surface-2 px-2.5 py-1 text-xs text-foreground/80">
                              {muscleLabel(m)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Passo a passo */}
                  <div className="rounded-xl bg-surface p-3">
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
                      <ListNumbers size={14} weight="bold" /> Como executar
                    </p>
                    {instrucao && instrucao.steps.length > 0 ? (
                      <ol className="flex flex-col gap-2">
                        {instrucao.steps.map((s, i) => (
                          <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-foreground/90">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-semibold text-primary">
                              {i + 1}
                            </span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ol>
                    ) : instrucao && instrucao.text ? (
                      <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">{instrucao.text}</p>
                    ) : (
                      <p className="text-sm text-muted">Sem instruções disponíveis para este exercício.</p>
                    )}

                    {/* Aviso quando a traducao pt-BR ainda nao esta disponivel */}
                    {instrucao && instrucao.lang && instrucao.lang !== "pt" && (instrucao.steps.length > 0 || instrucao.text) && (
                      <p className="mt-3 border-t border-border pt-2 text-[11px] text-muted">
                        Tradução em português em processamento — exibindo em {idiomaLabel(instrucao.lang)}.
                      </p>
                    )}
                    {detail.attribution && (
                      <p className="mt-2 text-[11px] text-muted">{detail.attribution}</p>
                    )}
                  </div>
                </>
              )}

              {!detailLoading && !detail && !exercicio.notes && (
                <p className="rounded-xl bg-surface p-3 text-sm text-muted">
                  Não foi possível carregar mais detalhes deste exercício.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Registro de series */}
        <div className="mt-5 px-5">
          <div className="mb-2 grid grid-cols-[2.2rem_1fr_1fr_2.5rem] items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
            <span>Set</span>
            <span>Carga (kg)</span>
            <span>Reps</span>
            <span className="text-right">Ok</span>
          </div>

          <div className="flex flex-col gap-2">
            {sets.map((s, i) => {
              const prev = last[i + 1]
              return (
                <div key={i}>
                  <div
                    className={`grid grid-cols-[2.2rem_1fr_1fr_2.5rem] items-center gap-2 rounded-2xl border p-2 transition-colors ${
                      s.done ? "border-success/50 bg-success/10" : "border-border bg-surface"
                    }`}
                  >
                    <span className="text-center text-sm font-bold text-foreground">{i + 1}</span>
                    <input
                      inputMode="decimal"
                      value={s.weight}
                      onChange={(e) => update(i, { weight: e.target.value.replace(",", ".") })}
                      placeholder="0"
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-center text-base font-semibold text-foreground outline-none focus:border-primary"
                    />
                    <input
                      inputMode="numeric"
                      value={s.reps}
                      onChange={(e) => update(i, { reps: e.target.value })}
                      placeholder={exercicio.reps ?? "0"}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-center text-base font-semibold text-foreground outline-none focus:border-primary"
                    />
                    <button
                      onClick={() => toggleDone(i)}
                      aria-label={s.done ? "Desmarcar série" : "Marcar série como feita"}
                      className="flex items-center justify-center"
                    >
                      {s.done ? (
                        <CheckCircle size={30} weight="fill" className="text-success" />
                      ) : (
                        <Circle size={30} className="text-muted" />
                      )}
                    </button>
                  </div>
                  {prev && (
                    <p className="mt-0.5 flex items-center gap-1 px-2 text-[11px] text-muted">
                      <ClockCounterClockwise size={12} />
                      Última vez: {fmtCarga(prev.weight)} x {prev.reps ?? "–"} reps
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Rodape fixo */}
      <div className="border-t border-border bg-surface/95 px-5 py-3 backdrop-blur">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-muted">Volume nesta sessão</span>
          <span className="font-bold text-foreground">{Math.round(volume)} kg</span>
        </div>
        <button
          onClick={index + 1 < total ? onNext : onClose}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 font-semibold text-primary-foreground"
        >
          {index + 1 < total ? (
            <>
              Próximo exercício <CaretRight size={18} weight="bold" />
            </>
          ) : (
            <>
              Concluir treino <CheckCircle size={18} weight="fill" />
            </>
          )}
        </button>
      </div>
    </div>
  )
}

function FichaLinha({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  )
}
