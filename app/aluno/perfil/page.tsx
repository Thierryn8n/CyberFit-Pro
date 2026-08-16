"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  User,
  SignOut,
  Barbell,
  ChartLineUp,
  Ruler,
  Target,
  Envelope,
  Phone,
  WarningCircle,
} from "@phosphor-icons/react"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { useUserProfile } from "@/app/hooks/useUserProfile"
import { signOut } from "@/app/lib/auth"

interface AlunoInfo {
  weight_kg: number | null
  height_cm: number | null
  goal: string | null
  plan_status: string | null
}

export default function PerfilPage() {
  const router = useRouter()
  const { profile } = useUserProfile()
  const [info, setInfo] = useState<AlunoInfo | null>(null)
  const [instrutorNome, setInstrutorNome] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    if (!isSupabaseConfigured) {
      // Demonstracao no preview
      setInfo({ weight_kg: 78, height_cm: 178, goal: "Hipertrofia", plan_status: "ativo" })
      setInstrutorNome("Prof. Carlos Mendes")
      setLoading(false)
      return () => {
        mounted = false
      }
    }

    async function load() {
      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) return

        const { data: aluno } = await supabase
          .from("alunos")
          .select("weight_kg, height_cm, goal, plan_status, instrutor_id")
          .eq("id", user.id)
          .maybeSingle()

        if (!mounted) return
        if (aluno) {
          setInfo({
            weight_kg: aluno.weight_kg,
            height_cm: aluno.height_cm,
            goal: aluno.goal,
            plan_status: aluno.plan_status,
          })
          if (aluno.instrutor_id) {
            const { data: prof } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", aluno.instrutor_id)
              .maybeSingle()
            if (mounted && prof) setInstrutorNome(prof.full_name)
          }
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [])

  async function handleSignOut() {
    await signOut()
    router.push("/login")
  }

  const imc =
    info?.weight_kg && info?.height_cm
      ? (info.weight_kg / Math.pow(info.height_cm / 100, 2)).toFixed(1)
      : null

  return (
    <div className="flex flex-col gap-6 p-4">
      {/* Cabecalho do perfil */}
      <header className="flex flex-col items-center gap-3 pt-4 text-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/15 ring-4 ring-primary/20">
          <User size={48} weight="fill" className="text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground text-balance">{profile?.full_name ?? "Aluno"}</h1>
          {profile?.email && (
            <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-muted">
              <Envelope size={14} /> {profile.email}
            </p>
          )}
        </div>
        {info?.plan_status && (
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              info.plan_status === "ativo"
                ? "bg-success/15 text-success"
                : "bg-warning/15 text-warning"
            }`}
          >
            Plano {info.plan_status}
          </span>
        )}
      </header>

      {!isSupabaseConfigured && (
        <div className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
          <WarningCircle size={18} className="mt-0.5 shrink-0" />
          <span>Modo demonstração. Conecte o Supabase para ver seus dados reais.</span>
        </div>
      )}

      {/* Metricas */}
      <section className="grid grid-cols-2 gap-3">
        <MetricCard icon={Barbell} label="Peso" value={info?.weight_kg ? `${info.weight_kg} kg` : "—"} />
        <MetricCard icon={Ruler} label="Altura" value={info?.height_cm ? `${info.height_cm} cm` : "—"} />
        <MetricCard icon={ChartLineUp} label="IMC" value={imc ?? "—"} />
        <MetricCard icon={Target} label="Objetivo" value={info?.goal ?? "—"} />
      </section>

      {/* Instrutor */}
      {instrutorNome && (
        <section className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Seu instrutor</p>
          <p className="mt-1 font-semibold text-foreground">{instrutorNome}</p>
        </section>
      )}

      {/* Acoes */}
      <button
        onClick={handleSignOut}
        className="flex items-center justify-center gap-2 rounded-2xl border border-danger/30 bg-danger/10 py-3.5 font-semibold text-danger transition-colors hover:bg-danger/20"
      >
        <SignOut size={20} weight="bold" />
        Sair da conta
      </button>

      <p className="pb-4 text-center text-xs text-muted">CyberFit Pro · v1.0</p>
    </div>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: string
}) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4">
      <Icon size={22} className="text-primary" />
      <div>
        <p className="text-xs text-muted">{label}</p>
        <p className="text-lg font-bold text-foreground">{value}</p>
      </div>
    </div>
  )
}
