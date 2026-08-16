"use client"

import { useEffect, useState } from "react"
import { ChalkboardTeacher, Users, EnvelopeSimple } from "@phosphor-icons/react"

import { createClient } from "@/lib/supabase/client"
import { useUserProfile } from "../../hooks/useUserProfile"
import { PageHeader, Card, EmptyState, Badge } from "../../components/ui"
import InviteButton from "../../components/InviteButton"

interface InstrutorRow {
  id: string
  cref: string | null
  specialty: string | null
  profiles: { full_name: string | null; email: string | null } | null
  alunos: { count: number }[]
}

export default function InstrutoresPage() {
  const { profile } = useUserProfile()
  const [rows, setRows] = useState<InstrutorRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    const supabase = createClient()

    async function load() {
      const { data } = await supabase
        .from("instrutores")
        .select("id, cref, specialty, profiles(full_name, email), alunos(count)")
        .eq("academia_id", profile!.id)
      setRows((data as unknown as InstrutorRow[]) ?? [])
      setLoading(false)
    }

    load()
  }, [profile])

  return (
    <div>
      <PageHeader
        title="Instrutores"
        subtitle="Gerencie sua equipe"
        action={<InviteButton targetRole="instrutor" label="Convidar instrutor" />}
      />

      {loading ? (
        <p className="text-sm text-muted">Carregando...</p>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={ChalkboardTeacher}
          title="Nenhum instrutor ainda"
          description="Gere um código de convite e envie ao instrutor para ele se cadastrar e entrar na sua equipe."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((inst) => (
            <Card key={inst.id}>
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <ChalkboardTeacher size={22} weight="duotone" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-medium text-foreground">{inst.profiles?.full_name ?? "Instrutor"}</h3>
                  <p className="flex items-center gap-1 truncate text-xs text-muted">
                    <EnvelopeSimple size={13} /> {inst.profiles?.email ?? "—"}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <Badge tone="primary">CREF {inst.cref ?? "—"}</Badge>
                <span className="inline-flex items-center gap-1.5 text-sm text-muted">
                  <Users size={16} /> {inst.alunos?.[0]?.count ?? 0} alunos
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
