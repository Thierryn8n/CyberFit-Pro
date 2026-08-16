"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Barbell,
  Ruler,
  Target,
  Moon,
  Sun,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Spinner,
} from "@phosphor-icons/react"

import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { useTheme, type Theme } from "../components/ThemeProvider"

type Gender = "masculino" | "feminino" | "outro"

const OBJETIVOS = ["Hipertrofia", "Emagrecimento", "Condicionamento", "Força", "Saúde geral"]
const NIVEIS = ["Iniciante", "Intermediário", "Avançado"]

interface FormState {
  gender: Gender | ""
  birthDate: string
  weight: string
  height: string
  waist: string
  hip: string
  arm: string
  thigh: string
  chest: string
  goal: string
  level: string
  theme: Theme
}

const STEPS = ["Sobre você", "Medidas", "Objetivo", "Tema"] as const

export default function OnboardingPage() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checking, setChecking] = useState(true)

  const [form, setForm] = useState<FormState>({
    gender: "",
    birthDate: "",
    weight: "",
    height: "",
    waist: "",
    hip: "",
    arm: "",
    thigh: "",
    chest: "",
    goal: "",
    level: "",
    theme: "dark",
  })

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }))

  // Se já concluiu a triagem, não deixa repetir — manda pro painel.
  useEffect(() => {
    let mounted = true
    if (!isSupabaseConfigured) {
      setForm((f) => ({ ...f, theme }))
      setChecking(false)
      return
    }
    ;(async () => {
      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
          router.replace("/login")
          return
        }
        const { data } = await supabase.from("alunos").select("onboarding_completed").eq("id", user.id).maybeSingle()
        if (data?.onboarding_completed) {
          router.replace("/aluno")
          return
        }
      } catch {
        /* segue para o formulário */
      } finally {
        if (mounted) {
          setForm((f) => ({ ...f, theme }))
          setChecking(false)
        }
      }
    })()
    return () => {
      mounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const num = (s: string) => {
    const n = Number.parseFloat(s.replace(",", "."))
    return Number.isFinite(n) ? n : null
  }

  const canNext = () => {
    if (step === 0) return form.gender !== "" && form.weight !== "" && form.height !== ""
    if (step === 2) return form.goal !== "" && form.level !== ""
    return true
  }

  const finish = async () => {
    setSaving(true)
    setError(null)

    // Aplica o tema escolhido imediatamente
    setTheme(form.theme)

    if (!isSupabaseConfigured) {
      router.replace("/aluno")
      return
    }

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.replace("/login")
        return
      }

      const { error: alunoErr } = await supabase
        .from("alunos")
        .update({
          gender: (form.gender || null) as Gender | null,
          birth_date: form.birthDate || null,
          weight_kg: num(form.weight),
          height_cm: num(form.height),
          waist_cm: num(form.waist),
          hip_cm: num(form.hip),
          arm_cm: num(form.arm),
          thigh_cm: num(form.thigh),
          chest_cm: num(form.chest),
          goal: form.goal || null,
          activity_level: form.level || null,
          onboarding_completed: true,
        })
        .eq("id", user.id)

      if (alunoErr) throw alunoErr

      // Preferência de tema no perfil (não bloqueia se falhar)
      await supabase.from("profiles").update({ theme_preference: form.theme }).eq("id", user.id)

      router.replace("/aluno")
    } catch (err) {
      setError(
        err instanceof Error
          ? `Não foi possível salvar: ${err.message}. Verifique se a migration 005 foi executada.`
          : "Não foi possível salvar seus dados.",
      )
      setSaving(false)
    }
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size={32} className="animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 py-6">
      {/* Cabeçalho + progresso */}
      <header className="mb-6">
        <div className="mb-4 flex items-center gap-2.5">
          <div
            className="cf-emboss flex h-11 w-11 items-center justify-center rounded-2xl"
            style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent-2)))" }}
          >
            <Barbell size={22} weight="duotone" className="text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-heading text-lg font-bold leading-tight text-foreground">Vamos te conhecer</h1>
            <p className="text-xs text-muted">Passo {step + 1} de {STEPS.length} · {STEPS[step]}</p>
          </div>
        </div>
        <div className="flex gap-1.5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-all ${i <= step ? "bg-primary" : "bg-surface-2"}`}
              style={i <= step ? { boxShadow: "0 0 8px hsl(var(--primary) / 0.5)" } : undefined}
            />
          ))}
        </div>
      </header>

      <main className="flex-1">
        <div className="cf-card animate-fade-in">
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Sexo biológico</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["masculino", "feminino", "outro"] as Gender[]).map((g) => (
                    <button
                      key={g}
                      onClick={() => set("gender", g)}
                      className={`rounded-2xl border p-3 text-sm font-medium capitalize transition-all ${
                        form.gender === g
                          ? "cf-emboss border-transparent text-primary-foreground"
                          : "border-border bg-surface-2 text-muted hover:text-foreground"
                      }`}
                      style={
                        form.gender === g
                          ? { backgroundImage: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent-2)))" }
                          : undefined
                      }
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <Labeled label="Data de nascimento">
                <input
                  type="date"
                  value={form.birthDate}
                  onChange={(e) => set("birthDate", e.target.value)}
                  className="cf-input !px-4"
                />
              </Labeled>

              <div className="grid grid-cols-2 gap-3">
                <Labeled label="Peso (kg)">
                  <input
                    inputMode="decimal"
                    placeholder="78"
                    value={form.weight}
                    onChange={(e) => set("weight", e.target.value)}
                    className="cf-input !px-4"
                  />
                </Labeled>
                <Labeled label="Altura (cm)">
                  <input
                    inputMode="decimal"
                    placeholder="178"
                    value={form.height}
                    onChange={(e) => set("height", e.target.value)}
                    className="cf-input !px-4"
                  />
                </Labeled>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="mb-1 flex items-center gap-2 text-muted">
                <Ruler size={18} />
                <p className="text-xs">Circunferências em cm (opcional, ajuda a acompanhar sua evolução)</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Labeled label="Cintura">
                  <input inputMode="decimal" placeholder="cm" value={form.waist} onChange={(e) => set("waist", e.target.value)} className="cf-input !px-4" />
                </Labeled>
                <Labeled label="Quadril">
                  <input inputMode="decimal" placeholder="cm" value={form.hip} onChange={(e) => set("hip", e.target.value)} className="cf-input !px-4" />
                </Labeled>
                <Labeled label="Braço">
                  <input inputMode="decimal" placeholder="cm" value={form.arm} onChange={(e) => set("arm", e.target.value)} className="cf-input !px-4" />
                </Labeled>
                <Labeled label="Coxa">
                  <input inputMode="decimal" placeholder="cm" value={form.thigh} onChange={(e) => set("thigh", e.target.value)} className="cf-input !px-4" />
                </Labeled>
                <Labeled label="Peito">
                  <input inputMode="decimal" placeholder="cm" value={form.chest} onChange={(e) => set("chest", e.target.value)} className="cf-input !px-4" />
                </Labeled>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                  <Target size={18} className="text-primary" /> Qual seu objetivo?
                </label>
                <div className="flex flex-wrap gap-2">
                  {OBJETIVOS.map((o) => (
                    <button
                      key={o}
                      onClick={() => set("goal", o)}
                      className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                        form.goal === o
                          ? "cf-emboss border-transparent text-primary-foreground"
                          : "border-border bg-surface-2 text-muted hover:text-foreground"
                      }`}
                      style={
                        form.goal === o
                          ? { backgroundImage: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent-2)))" }
                          : undefined
                      }
                    >
                      {o}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">Nível de experiência</label>
                <div className="grid grid-cols-3 gap-2">
                  {NIVEIS.map((n) => (
                    <button
                      key={n}
                      onClick={() => set("level", n)}
                      className={`rounded-2xl border p-3 text-xs font-medium transition-all ${
                        form.level === n
                          ? "cf-emboss border-transparent text-primary-foreground"
                          : "border-border bg-surface-2 text-muted hover:text-foreground"
                      }`}
                      style={
                        form.level === n
                          ? { backgroundImage: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent-2)))" }
                          : undefined
                      }
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-muted">Escolha a aparência do app. Você pode trocar quando quiser.</p>
              <div className="grid grid-cols-2 gap-3">
                <ThemeCard
                  active={form.theme === "dark"}
                  onClick={() => {
                    set("theme", "dark")
                    setTheme("dark")
                  }}
                  icon={Moon}
                  label="Escuro"
                  desc="Padrão"
                />
                <ThemeCard
                  active={form.theme === "light"}
                  onClick={() => {
                    set("theme", "light")
                    setTheme("light")
                  }}
                  icon={Sun}
                  label="Claro"
                  desc="Branco e roxo"
                />
              </div>
            </div>
          )}
        </div>

        {error && (
          <p className="mt-4 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
        )}
      </main>

      {/* Navegação */}
      <footer className="mt-6 flex items-center gap-3">
        {step > 0 && (
          <button
            onClick={() => setStep((s) => s - 1)}
            className="cf-inset flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-border bg-surface-2 text-foreground"
            aria-label="Voltar"
          >
            <ArrowLeft size={20} />
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button
            onClick={() => canNext() && setStep((s) => s + 1)}
            disabled={!canNext()}
            className="cf-btn-primary flex-1"
          >
            Continuar <ArrowRight size={18} weight="bold" />
          </button>
        ) : (
          <button onClick={finish} disabled={saving} className="cf-btn-primary flex-1">
            {saving ? <Spinner size={20} className="animate-spin" /> : (<><CheckCircle size={20} weight="fill" /> Concluir</>)}
          </button>
        )}
      </footer>

      {step === 1 && (
        <button
          onClick={() => setStep((s) => s + 1)}
          className="mt-3 text-center text-sm text-muted underline-offset-4 hover:text-foreground hover:underline"
        >
          Pular medidas por enquanto
        </button>
      )}
    </div>
  )
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">{label}</span>
      {children}
    </label>
  )
}

function ThemeCard({
  active,
  onClick,
  icon: Icon,
  label,
  desc,
}: {
  active: boolean
  onClick: () => void
  icon: typeof Moon
  label: string
  desc: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-2 rounded-2xl border p-5 transition-all ${
        active ? "cf-emboss border-transparent" : "border-border bg-surface-2"
      }`}
      style={active ? { backgroundImage: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent-2)))" } : undefined}
    >
      <Icon size={28} weight="fill" className={active ? "text-primary-foreground" : "text-muted"} />
      <div className="text-center">
        <p className={`font-semibold ${active ? "text-primary-foreground" : "text-foreground"}`}>{label}</p>
        <p className={`text-xs ${active ? "text-primary-foreground/80" : "text-muted"}`}>{desc}</p>
      </div>
    </button>
  )
}
