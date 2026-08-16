"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { MagnifyingGlass, X, Barbell, Plus, Check, SpinnerGap, Translate } from "@phosphor-icons/react"

import {
  fetchBiblioteca,
  fetchExercicio,
  traduzirExercicio,
  traduzirLoteBiblioteca,
  aplicarTraducao,
  catLabel,
  equipLabel,
  muscleLabel,
  idiomaLabel,
  IDIOMA_PREFERENCIA,
  type ExercicioLite,
  type ExercicioFull,
  type Idioma,
  type BibliotecaResponse,
} from "../lib/biblioteca"
import { cn } from "../lib/utils"
import { Badge } from "./ui"

function titleCase(s: string) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase())
}

interface Props {
  /** "browse" mostra so navegacao; "picker" adiciona botao de selecionar em cada card */
  mode?: "browse" | "picker"
  onPick?: (ex: ExercicioLite) => void
  pickedIds?: string[]
}

export default function BibliotecaExercicios({ mode = "browse", onPick, pickedIds = [] }: Props) {
  const [q, setQ] = useState("")
  const [debouncedQ, setDebouncedQ] = useState("")
  const [category, setCategory] = useState("")
  const [equipment, setEquipment] = useState("")
  const [page, setPage] = useState(1)
  const [data, setData] = useState<BibliotecaResponse | null>(null)
  const [items, setItems] = useState<ExercicioLite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  // Estado do botao "Traduzir tudo" (traduz nomes e instrucoes de toda a
  // biblioteca em lote, salvando direto no banco).
  const [translatingAll, setTranslatingAll] = useState(false)
  const [translateProgress, setTranslateProgress] = useState<{ etapa: "nomes" | "instrucoes"; remaining: number } | null>(
    null,
  )
  const stopTranslateRef = useRef(false)

  // Debounce da busca
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 350)
    return () => clearTimeout(t)
  }, [q])

  // Reset de pagina quando filtros mudam
  useEffect(() => {
    setPage(1)
  }, [debouncedQ, category, equipment])

  const load = useCallback(
    async (signal: AbortSignal) => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetchBiblioteca({ q: debouncedQ, category, equipment, page, pageSize: 24, signal })
        setData(res)
        setItems((prev) => (page === 1 ? res.items : [...prev, ...res.items]))
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError("Não foi possível carregar os exercícios. Tente novamente.")
      } finally {
        setLoading(false)
      }
    },
    [debouncedQ, category, equipment, page, reloadKey],
  )

  useEffect(() => {
    const ctrl = new AbortController()
    load(ctrl.signal)
    return () => ctrl.abort()
  }, [load])

  useEffect(() => {
    return () => {
      stopTranslateRef.current = true
    }
  }, [])

  const hasMore = data ? items.length < data.total : false

  // Dispara a traducao em lote de toda a biblioteca (nomes, depois
  // instrucoes), chamando a rota repetidamente ate zerar o "remaining".
  // A cada lote os itens ja traduzidos no banco, entao recarregamos a lista
  // periodicamente para o instrutor ver o progresso em tempo real.
  const handleTraduzirTudo = useCallback(async () => {
    if (translatingAll) return
    setTranslatingAll(true)
    stopTranslateRef.current = false
    try {
      for (const etapa of ["nomes", "instrucoes"] as const) {
        // eslint-disable-next-line no-constant-condition
        while (true) {
          if (stopTranslateRef.current) return
          const res = await traduzirLoteBiblioteca(etapa, 60)
          if (!res) break
          setTranslateProgress({ etapa, remaining: res.remaining })
          setReloadKey((k) => k + 1)
          if (res.remaining <= 0 || res.processed === 0) break
        }
      }
    } finally {
      setTranslatingAll(false)
      setTranslateProgress(null)
    }
  }, [translatingAll])

  return (
    <div>
      {/* Busca + filtro de equipamento */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar exercício, músculo..."
            className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-foreground outline-none focus:border-primary"
          />
        </div>
        <select
          value={equipment}
          onChange={(e) => setEquipment(e.target.value)}
          className="rounded-xl border border-border bg-background px-4 py-2.5 text-foreground outline-none focus:border-primary sm:w-56"
        >
          <option value="">Todos equipamentos</option>
          {data?.facets.equipments.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label} ({f.count})
            </option>
          ))}
        </select>
        <button
          onClick={handleTraduzirTudo}
          disabled={translatingAll}
          className={cn(
            "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium transition",
            translatingAll
              ? "cursor-not-allowed bg-surface-2 text-muted"
              : "bg-primary text-primary-foreground hover:bg-primary/90",
          )}
          title="Traduz todos os nomes e instruções da biblioteca para português e salva no banco"
        >
          {translatingAll ? <SpinnerGap size={16} className="animate-spin" /> : <Translate size={16} weight="bold" />}
          {translatingAll
            ? translateProgress
              ? `Traduzindo ${translateProgress.etapa === "nomes" ? "nomes" : "instruções"}... (${translateProgress.remaining} restantes)`
              : "Traduzindo..."
            : "Traduzir tudo"}
        </button>
      </div>

      {/* Chips de categoria */}
      <div className="mb-5 flex flex-wrap gap-2">
        <button
          onClick={() => setCategory("")}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-medium transition",
            category === "" ? "bg-primary text-primary-foreground" : "bg-surface-2 text-muted hover:text-foreground",
          )}
        >
          Todos
        </button>
        {data?.facets.categories.map((f) => (
          <button
            key={f.value}
            onClick={() => setCategory(f.value)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition",
              category === f.value ? "bg-primary text-primary-foreground" : "bg-surface-2 text-muted hover:text-foreground",
            )}
          >
            {f.label} <span className="opacity-60">{f.count}</span>
          </button>
        ))}
      </div>

      {/* Contagem */}
      {data && !error && (
        <p className="mb-3 text-xs text-muted">
          {data.total.toLocaleString("pt-BR")} exercício{data.total === 1 ? "" : "s"} encontrado
          {data.total === 1 ? "" : "s"}
        </p>
      )}

      {error && (
        <div className="cf-card p-6 text-center">
          <p className="text-sm text-danger">{error}</p>
          <button
            onClick={() => setPage((p) => p)}
            className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {items.map((ex) => {
          const picked = pickedIds.includes(ex.id)
          return (
            <div key={ex.id} className="cf-card group overflow-hidden p-0">
              <button
                onClick={() => setDetailId(ex.id)}
                className="block w-full text-left"
                aria-label={`Ver ${ex.name}`}
              >
                <div className="relative aspect-square overflow-hidden bg-surface-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={ex.gif || ex.image || "/placeholder.svg"}
                    alt={ex.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="p-3">
                  <h3 className="line-clamp-2 text-sm font-medium text-foreground">{titleCase(ex.name)}</h3>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Badge tone="primary">{catLabel(ex.category)}</Badge>
                  </div>
                </div>
              </button>
              {mode === "picker" && (
                <div className="px-3 pb-3">
                  <button
                    onClick={() => onPick?.(ex)}
                    disabled={picked}
                    className={cn(
                      "inline-flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium transition",
                      picked
                        ? "bg-success/15 text-success"
                        : "bg-primary text-primary-foreground hover:bg-primary/90",
                    )}
                  >
                    {picked ? <Check size={16} weight="bold" /> : <Plus size={16} weight="bold" />}
                    {picked ? "Adicionado" : "Adicionar"}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Loading / carregar mais */}
      {loading && (
        <div className="flex justify-center py-8 text-muted">
          <SpinnerGap size={28} className="animate-spin" />
        </div>
      )}
      {!loading && hasMore && (
        <div className="flex justify-center py-6">
          <button
            onClick={() => setPage((p) => p + 1)}
            className="rounded-xl border border-border bg-surface px-6 py-2.5 text-sm font-medium text-foreground transition hover:border-primary"
          >
            Carregar mais
          </button>
        </div>
      )}
      {!loading && items.length === 0 && !error && (
        <div className="cf-card flex flex-col items-center justify-center px-6 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-2 text-muted">
            <Barbell size={28} weight="duotone" />
          </div>
          <h3 className="mt-4 text-lg font-medium text-foreground">Nenhum exercício encontrado</h3>
          <p className="mt-1 text-sm text-muted">Tente ajustar a busca ou os filtros.</p>
        </div>
      )}

      {detailId && <DetailModal id={detailId} onClose={() => setDetailId(null)} />}
    </div>
  )
}

function DetailModal({ id, onClose }: { id: string; onClose: () => void }) {
  const [ex, setEx] = useState<ExercicioFull | null>(null)
  const [lang, setLang] = useState<Idioma | null>(null)
  const [loading, setLoading] = useState(true)
  const [autoTranslating, setAutoTranslating] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    let active = true
    fetchExercicio(id)
      .then((d) => {
        if (!active) return
        setEx(d)
        setLoading(false)
      })
      .catch(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [id])

  // Traducao automatica "on-demand": se o nome ou a instrucao ainda nao tem
  // pt-BR salvo, pede a traducao em segundo plano e atualiza a tela assim
  // que chega, sem precisar recarregar nada.
  useEffect(() => {
    if (!ex) return
    const precisaNome = !ex.name_translated
    const precisaInstrucao = !ex.instructions.pt && !ex.instruction_steps.pt
    if (!precisaNome && !precisaInstrucao) return
    let active = true
    setAutoTranslating(true)
    traduzirExercicio(ex.id).then((t) => {
      if (!active) return
      setAutoTranslating(false)
      if (t) setEx((prev) => (prev ? aplicarTraducao(prev, t) : prev))
    })
    return () => {
      active = false
    }
    // Dispara so quando o id muda (evita loop: aplicarTraducao gera um novo ex).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ex?.id])

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  const langs = ex ? (Object.keys(ex.instructions) as Idioma[]).filter((l) => ex.instructions[l]) : []

  // Escolhe o idioma exibido por padrao (pt sempre que disponivel) sempre que
  // a lista de idiomas mudar (ex.: apos a traducao automatica chegar).
  useEffect(() => {
    if (langs.length === 0) return
    if (lang && langs.includes(lang)) return
    const preferido = IDIOMA_PREFERENCIA.find((l) => langs.includes(l)) ?? langs[0]
    setLang(preferido)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [langs.join(","), lang])

  const steps = ex && lang ? ex.instruction_steps?.[lang] : undefined
  const text = ex && lang ? ex.instructions?.[lang] : undefined

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button aria-label="Fechar" onClick={onClose} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="animate-fade-in relative flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden cf-card p-0">
        <button
          ref={closeRef}
          onClick={onClose}
          aria-label="Fechar"
          className="absolute right-4 top-4 z-10 rounded-lg bg-surface/80 p-2 text-muted backdrop-blur hover:text-foreground"
        >
          <X size={20} />
        </button>

        {loading ? (
          <div className="flex h-64 items-center justify-center text-muted">
            <SpinnerGap size={28} className="animate-spin" />
          </div>
        ) : !ex ? (
          <div className="p-10 text-center text-sm text-danger">Exercício não encontrado.</div>
        ) : (
          <div className="overflow-y-auto">
            <div className="grid gap-0 sm:grid-cols-2">
              <div className="bg-surface-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ex.gif || ex.image || "/placeholder.svg"} alt={ex.name} className="h-full w-full object-cover" />
              </div>
              <div className="p-5">
                <h2 className="text-xl font-semibold text-balance text-foreground">{titleCase(ex.name)}</h2>
                {autoTranslating && (
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
                    <SpinnerGap size={12} className="animate-spin" /> Traduzindo automaticamente para português...
                  </p>
                )}
                <div className="mt-3 space-y-2 text-sm">
                  <Row label="Grupo" value={catLabel(ex.category)} />
                  <Row label="Equipamento" value={equipLabel(ex.equipment)} />
                  {ex.target && <Row label="Alvo" value={muscleLabel(ex.target)} />}
                </div>
                {ex.secondary_muscles.length > 0 && (
                  <div className="mt-3">
                    <p className="mb-1.5 text-xs text-muted">Músculos secundários</p>
                    <div className="flex flex-wrap gap-1.5">
                      {ex.secondary_muscles.map((m) => (
                        <Badge key={m}>{muscleLabel(m)}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-border p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="font-medium text-foreground">Como executar</h3>
                {langs.length > 1 && (
                  <select
                    value={lang ?? ""}
                    onChange={(e) => setLang(e.target.value as Idioma)}
                    className="rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground outline-none focus:border-primary"
                  >
                    {langs.map((l) => (
                      <option key={l} value={l}>
                        {idiomaLabel(l)}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              {steps && steps.length > 0 ? (
                <ol className="space-y-2">
                  {steps.map((s, i) => (
                    <li key={i} className="flex gap-3 text-sm text-foreground/90">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-medium text-primary">
                        {i + 1}
                      </span>
                      <span className="leading-relaxed">{s}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm leading-relaxed text-foreground/90">{text ?? "Sem instruções disponíveis."}</p>
              )}
              <p className="mt-5 border-t border-border pt-3 text-xs text-muted">{ex.attribution}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  )
}
