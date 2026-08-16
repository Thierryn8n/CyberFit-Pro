"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Barbell, CaretRight, Fire, CheckCircle, Moon } from "@phosphor-icons/react"

import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { useUserProfile } from "../hooks/useUserProfile"
import { DIAS_SEMANA, hojeDiaSemana, dataLocalISO, fmtVolume } from "../lib/treino"

interface TreinoLite {
  id: string
  name: string
  description: string | null
  day_of_week: number | null
  exCount: number
}

export default function AlunoHome() {
  const { profile, loading: profileLoading } = useUserProfile()
  const [treinos, setTreinos] = useState<TreinoLite[]>([])
  const [weekVolume, setWeekVolume] = useState(0)
  const [weekSessions, setWeekSessions] = useState(0)
  const [loading, setLoading] = useState(true)

  const hoje = hojeDiaSemana()

  useEffect(() => {
    if (!profile) return
    const supabase = createClient()

    async function load() {
      // Treinos ativos do aluno + contagem de exercicios
      const { data: tr } = await supabase
        .from("treinos")
        .select("id, name, description, day_of_week, exercicios(count)")
        .eq("aluno_id", profile!.id)
        .eq("status", "ativo")
        .order("day_of_week", { ascending: true })

      const list: TreinoLite[] = (tr ?? []).map((t: any) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        day_of_week: t.day_of_week,
        exCount: t.exercicios?.[0]?.count ?? 0,
      }))
      setTreinos(list)

      // Resumo da semana (domingo -> hoje) a partir das series registradas
      const now = new Date()
      const domingo = new Date(now)
      domingo.setDate(now.getDate() - now.getDay())
      const { data: series } = await supabase
        .from("series_registros")
        .select("reps, weight, session_date")
        .eq("aluno_id", profile!.id)
        .gte("session_date", dataLocalISO(domingo))

      const vol = (series ?? []).reduce((a: number, s: any) => a + (s.reps ?? 0) * (s.weight ?? 0), 0)
      const dias = new Set((series ?? []).map((s: any) => s.session_date))
      setWeekVolume(vol)
      setWeekSessions(dias.size)
      setLoading(false)
    }

    load().catch(() => setLoading(false))
  }, [profile])

  const treinosHoje = useMemo(() => treinos.filter((t) => t.day_of_week === hoje), [treinos, hoje])
  const diasComTreino = useMemo(() => new Set(treinos.map((t) => t.day_of_week)), [treinos])
  const busy = profileLoading || loading

  return (
    <div className="px-5 pt-8">
      {/* Saudacao */}
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted">
            {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
          </p>
          <h1 className="mt-0.5 font-heading text-2xl font-bold text-foreground text-balance">
            Olá, {profile?.full_name?.split(" ")[0] ?? "Aluno"}
          </h1>
        </div>
        <Link
          href="/aluno/perfil"
          className="flex h-11 w-11 items-center justify-center rounded-full text-lg font-bold text-primary-foreground shadow-neon"
          style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent-2)))" }}
          aria-label="Perfil"
        >
          {(profile?.full_name ?? "A").charAt(0).toUpperCase()}
        </Link>
      </header>

      {!isSupabaseConfigured && (
        <div className="mt-4 rounded-xl border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
          Conecte o Supabase para carregar seus treinos reais.
        </div>
      )}

      {/* Faixa de dias da semana */}
      <div className="mt-6 flex justify-between gap-1">
        {DIAS_SEMANA.map((d, i) => {
          const isToday = i === hoje
          const tem = diasComTreino.has(i)
          return (
            <div
              key={i}
              className={`flex h-16 flex-1 flex-col items-center justify-center gap-1 rounded-2xl border text-xs backdrop-blur-sm transition-colors ${
                isToday
                  ? "border-primary/60 bg-primary/20 text-primary shadow-neon"
                  : "border-white/10 bg-white/[0.03] text-muted"
              }`}
            >
              <span className="font-medium">{d.short}</span>
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  tem ? (isToday ? "bg-primary" : "bg-accent") : "bg-transparent"
                }`}
                aria-hidden
              />
            </div>
          )
        })}
      </div>

      {/* Treino de hoje */}
      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Treino de hoje</h2>

        {busy ? (
          <div className="h-40 animate-pulse rounded-3xl bg-white/[0.03]" />
        ) : treinosHoje.length > 0 ? (
          <div className="flex flex-col gap-3">
            {treinosHoje.map((t) => (
              <Link
                key={t.id}
                href={`/aluno/treino/${t.id}`}
                className="group relative overflow-hidden rounded-3xl p-5 text-primary-foreground shadow-neon"
                style={{ backgroundImage: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent-2)))" }}
              >
                <div className="relative z-10">
                  <p className="text-xs font-medium uppercase tracking-wide opacity-80">Pronto para treinar</p>
                  <h3 className="mt-1 font-heading text-2xl font-bold text-balance">{t.name}</h3>
                  <p className="mt-1 text-sm opacity-90">{t.exCount} exercícios</p>
                  <span className="mt-4 inline-flex items-center gap-1 rounded-full bg-black/25 px-4 py-2 text-sm font-semibold backdrop-blur-sm">
                    Iniciar treino <CaretRight size={16} weight="bold" />
                  </span>
                </div>
                <Barbell
                  size={120}
                  weight="fill"
                  className="absolute -bottom-4 -right-2 opacity-15"
                  aria-hidden
                />
              </Link>
            ))}
          </div>
        ) : (
          <div className="cf-glass flex flex-col items-center gap-2 p-8 text-center">
            <Moon size={40} className="text-muted" weight="duotone" />
            <p className="font-medium text-foreground">Dia de descanso</p>
            <p className="text-sm text-muted">Nenhum treino marcado para hoje. Aproveite para recuperar.</p>
          </div>
        )}
      </section>

      {/* Resumo da semana */}
      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Sua semana</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="cf-glass p-4">
            <CheckCircle size={22} className="text-success" weight="fill" />
            <p className="mt-2 font-heading text-2xl font-bold text-foreground">{busy ? "–" : weekSessions}</p>
            <p className="text-xs text-muted">dias treinados</p>
          </div>
          <div className="cf-glass p-4">
            <Fire size={22} className="text-warning" weight="fill" />
            <p className="mt-2 font-heading text-2xl font-bold text-foreground">{busy ? "–" : fmtVolume(weekVolume)}</p>
            <p className="text-xs text-muted">volume total</p>
          </div>
        </div>
      </section>

      {/* Atalho para todos os treinos */}
      <Link
        href="/aluno/treinos"
        className="cf-glass mt-6 flex items-center justify-between p-4 text-sm font-medium text-foreground"
      >
        <span className="flex items-center gap-2">
          <Barbell size={20} className="text-primary" /> Ver todos os treinos da semana
        </span>
        <CaretRight size={16} className="text-muted" />
      </Link>
    </div>
  )
}
