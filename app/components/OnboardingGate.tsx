"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Spinner } from "@phosphor-icons/react"

import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { useTheme, type Theme } from "./ThemeProvider"

// Garante que o aluno passe pela triagem antes de usar o app. Também aplica a
// preferência de tema salva no perfil quando disponível.
export default function OnboardingGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { setTheme } = useTheme()
  const [ready, setReady] = useState(!isSupabaseConfigured)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setReady(true)
      return
    }
    let mounted = true
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
        const { data, error } = await supabase
          .from("alunos")
          .select("onboarding_completed")
          .eq("id", user.id)
          .maybeSingle()

        // Aplica tema do perfil (se houver) sem sobrepor escolha manual local
        const { data: prof } = await supabase.from("profiles").select("theme_preference").eq("id", user.id).maybeSingle()
        if (prof?.theme_preference && !localStorage.getItem("cf-theme")) {
          setTheme(prof.theme_preference as Theme)
        }

        // Se a coluna ainda não existe (migration não rodou), não bloqueia.
        const needsOnboarding = !error && data && data.onboarding_completed === false
        if (needsOnboarding) {
          router.replace("/onboarding")
          return
        }
      } catch {
        /* em erro, libera o acesso para não travar o usuário */
      } finally {
        if (mounted) setReady(true)
      }
    })()
    return () => {
      mounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size={32} className="animate-spin text-primary" />
      </div>
    )
  }

  return <>{children}</>
}
