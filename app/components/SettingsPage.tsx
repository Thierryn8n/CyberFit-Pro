"use client"

import { useEffect, useState } from "react"
import { FloppyDisk, UserCircle } from "@phosphor-icons/react"

import { createClient } from "@/lib/supabase/client"
import { useUserProfile } from "../hooks/useUserProfile"
import { PageHeader, Card } from "./ui"

export default function SettingsPage() {
  const { profile, loading } = useUserProfile()
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!profile) return
    const supabase = createClient()
    supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("id", profile.id)
      .single()
      .then(({ data }) => {
        setFullName(data?.full_name ?? "")
        setPhone(data?.phone ?? "")
      })
  }, [profile])

  const save = async () => {
    if (!profile) return
    setSaving(true)
    setMsg(null)
    const supabase = createClient()
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, phone, updated_at: new Date().toISOString() })
      .eq("id", profile.id)
    setMsg(error ? "Erro ao salvar." : "Alterações salvas!")
    setSaving(false)
  }

  return (
    <div>
      <PageHeader title="Configurações" subtitle="Seus dados de perfil" />

      {loading ? (
        <p className="text-sm text-muted">Carregando...</p>
      ) : (
        <Card className="max-w-xl">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
              <UserCircle size={28} weight="fill" />
            </div>
            <div>
              <p className="font-medium text-foreground">{profile?.email}</p>
              <p className="text-xs text-muted capitalize">{profile?.role}</p>
            </div>
          </div>

          <label className="mb-1 block text-sm text-muted">Nome completo</label>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="mb-4 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-foreground outline-none focus:border-primary"
          />

          <label className="mb-1 block text-sm text-muted">Telefone</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mb-5 w-full rounded-xl border border-border bg-background px-4 py-2.5 text-foreground outline-none focus:border-primary"
          />

          <div className="flex items-center gap-3">
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-neon transition hover:bg-primary/90 disabled:opacity-60"
            >
              <FloppyDisk size={18} />
              {saving ? "Salvando..." : "Salvar"}
            </button>
            {msg && <span className="text-sm text-muted">{msg}</span>}
          </div>
        </Card>
      )}
    </div>
  )
}
