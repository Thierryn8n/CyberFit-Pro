"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase/client"
import type { Role } from "../lib/database.types"

export interface UserProfile {
  id: string
  role: Role
  full_name: string
  email: string
  academiaName?: string
}

export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    let mounted = true
    const supabase = createClient()

    async function load() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError || !user) {
          router.push("/login")
          return
        }

        const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).single()

        const role = (prof?.role ?? user.user_metadata?.role ?? "aluno") as Role
        const fullName = prof?.full_name ?? user.user_metadata?.full_name ?? "Usuário"

        let academiaName: string | undefined
        if (role === "instrutor") {
          const { data: inst } = await supabase.from("instrutores").select("academia_id").eq("id", user.id).single()
          if (inst?.academia_id) {
            const { data: acad } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", inst.academia_id)
              .single()
            academiaName = acad?.full_name ?? undefined
          }
        }

        if (mounted) {
          setProfile({
            id: user.id,
            role,
            full_name: fullName,
            email: prof?.email ?? user.email ?? "",
            academiaName,
          })
        }
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : "Erro ao carregar perfil")
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [router])

  return { profile, loading, error }
}
