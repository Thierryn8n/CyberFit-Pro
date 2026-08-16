"use client"

import { useEffect, useState } from "react"
import { Users, MagnifyingGlass } from "@phosphor-icons/react"

import { createClient } from "@/lib/supabase/client"
import { useUserProfile } from "../../hooks/useUserProfile"
import { PageHeader, EmptyState, Badge } from "../../components/ui"

interface AlunoRow {
  id: string
  plan_status: string
  goal: string | null
  profiles: { full_name: string | null; email: string | null } | null
  instrutores: { profiles: { full_name: string | null } | null } | null
}

const statusTone: Record<string, "success" | "warning" | "danger"> = {
  ativo: "success",
  pendente: "warning",
  inativo: "danger",
}

export default function AcademiaAlunosPage() {
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
        .select("id, plan_status, goal, profiles(full_name, email), instrutores(profiles(full_name))")
        .eq("academia_id", profile!.id)
      setRows((data as unknown as AlunoRow[]) ?? [])
      setLoading(false)
    }

    load()
  }, [profile])

  const filtered = rows.filter((r) => (r.profiles?.full_name ?? "").toLowerCase().includes(query.toLowerCase()))

  return (
    <div>
      <PageHeader title="Alunos" subtitle="Todos os alunos da academia" />

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
          title="Nenhum aluno encontrado"
          description="Os alunos aparecem aqui conforme os instrutores os cadastram por convite."
        />
      ) : (
        <div className="cf-card overflow-hidden">
          <div className="hidden grid-cols-12 gap-4 border-b border-border px-5 py-3 text-xs font-medium text-muted sm:grid">
            <div className="col-span-4">Aluno</div>
            <div className="col-span-3">Instrutor</div>
            <div className="col-span-3">Objetivo</div>
            <div className="col-span-2 text-right">Status</div>
          </div>
          {filtered.map((a) => (
            <div
              key={a.id}
              className="flex flex-col gap-2 border-b border-border px-5 py-4 last:border-0 sm:grid sm:grid-cols-12 sm:items-center sm:gap-4"
            >
              <div className="col-span-4 min-w-0">
                <p className="truncate font-medium text-foreground">{a.profiles?.full_name ?? "Aluno"}</p>
                <p className="truncate text-xs text-muted">{a.profiles?.email ?? "—"}</p>
              </div>
              <div className="col-span-3 truncate text-sm text-muted">{a.instrutores?.profiles?.full_name ?? "—"}</div>
              <div className="col-span-3 truncate text-sm text-muted">{a.goal ?? "—"}</div>
              <div className="col-span-2 sm:text-right">
                <Badge tone={statusTone[a.plan_status] ?? "muted"}>{a.plan_status}</Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
