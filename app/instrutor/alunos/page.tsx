"use client"

import { useEffect, useState } from "react"
import { Users, MagnifyingGlass, Target } from "@phosphor-icons/react"

import { createClient } from "@/lib/supabase/client"
import { useUserProfile } from "../../hooks/useUserProfile"
import { PageHeader, EmptyState, Badge, Card } from "../../components/ui"
import InviteButton from "../../components/InviteButton"

interface AlunoRow {
  id: string
  plan_status: string
  goal: string | null
  weight_kg: number | null
  height_cm: number | null
  profiles: { full_name: string | null; email: string | null } | null
}

const statusTone: Record<string, "success" | "warning" | "danger"> = {
  ativo: "success",
  pendente: "warning",
  inativo: "danger",
}

export default function InstrutorAlunosPage() {
  const { profile } = useUserProfile()
  const [rows, setRows] = useState<AlunoRow[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState("")

  useEffect(() => {
    if (!profile) return
    const supabase = createClient()

    async function load() {
      const { data } = await supabase
        .from("alunos")
        .select("id, plan_status, goal, weight_kg, height_cm, profiles(full_name, email)")
        .eq("instrutor_id", profile!.id)
      setRows((data as unknown as AlunoRow[]) ?? [])
      setLoading(false)
    }

    load()
  }, [profile])

  const filtered = rows.filter((r) => (r.profiles?.full_name ?? "").toLowerCase().includes(query.toLowerCase()))

  return (
    <div>
      <PageHeader
        title="Meus alunos"
        subtitle="Acompanhe seus alunos"
        action={<InviteButton targetRole="aluno" label="Convidar aluno" />}
      />

      <div className="mb-5 flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5">
        <MagnifyingGlass size={18} className="text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar aluno..."
          className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted"
        />
      </div>

      {loading ? (
        <p className="text-sm text-muted">Carregando...</p>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum aluno ainda"
          description="Gere um código de convite e compartilhe com seu aluno para vinculá-lo a você."
          action={<InviteButton targetRole="aluno" label="Convidar aluno" />}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((a) => (
            <Card key={a.id}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                    <Users size={22} weight="duotone" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate font-medium text-foreground">{a.profiles?.full_name ?? "Aluno"}</h3>
                    <p className="truncate text-xs text-muted">{a.profiles?.email ?? "—"}</p>
                  </div>
                </div>
                <Badge tone={statusTone[a.plan_status] ?? "muted"}>{a.plan_status}</Badge>
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm text-muted">
                <Target size={16} />
                <span className="truncate">{a.goal ?? "Objetivo não definido"}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
