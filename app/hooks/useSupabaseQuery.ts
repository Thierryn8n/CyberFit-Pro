"use client"

import { useEffect, useState } from "react"

import { createClient } from "@/lib/supabase/client"

type QueryFn<T> = (
  supabase: ReturnType<typeof createClient>,
  userId: string,
) => Promise<T>

/**
 * Executa uma query no Supabase apos garantir que ha um usuario logado.
 * Retorna { data, loading, error, refetch }.
 */
export function useSupabaseQuery<T>(queryFn: QueryFn<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let mounted = true
    const supabase = createClient()

    async function run() {
      setLoading(true)
      setError(null)
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
          if (mounted) setError("Sessão não encontrada.")
          return
        }
        const result = await queryFn(supabase, user.id)
        if (mounted) setData(result)
      } catch (err) {
        if (mounted) setError(err instanceof Error ? err.message : "Erro ao carregar dados.")
      } finally {
        if (mounted) setLoading(false)
      }
    }

    run()
    return () => {
      mounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, ...deps])

  return { data, loading, error, refetch: () => setTick((t) => t + 1) }
}
