import { createBrowserClient } from "@supabase/ssr"

import type { Database } from "@/app/lib/database.types"

let client: ReturnType<typeof createBrowserClient<Database>> | undefined

// A anon key do Supabase e um JWT que carrega o "ref" do projeto no payload.
// Quando a variavel NEXT_PUBLIC_SUPABASE_URL nao esta definida, derivamos a URL
// (https://<ref>.supabase.co) a partir dela — assim o app conecta ao banco
// mesmo que so a anon key tenha sido configurada.
function refFromAnonKey(anonKey: string | undefined): string | null {
  if (!anonKey) return null
  try {
    const payload = anonKey.split(".")[1]
    if (!payload) return null
    const json = JSON.parse(
      typeof atob === "function"
        ? atob(payload.replace(/-/g, "+").replace(/_/g, "/"))
        : Buffer.from(payload, "base64").toString(),
    )
    return typeof json.ref === "string" ? json.ref : null
  } catch {
    return null
  }
}

const anonKeyEnv = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const derivedRef = refFromAnonKey(anonKeyEnv)
const resolvedUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? (derivedRef ? `https://${derivedRef}.supabase.co` : undefined)

// Flag exposta para as telas: consideramos configurado quando temos a anon key
// e uma URL (explicita ou derivada do proprio JWT).
export const isSupabaseConfigured = Boolean(resolvedUrl && anonKeyEnv)

export function createClient() {
  if (client) return client

  // Fallback com placeholders validos: evita que o app quebre no preview antes
  // de o Supabase ser conectado. As chamadas de rede simplesmente falham e sao
  // tratadas nas telas; a construcao do client nao lanca excecao.
  const url = resolvedUrl ?? "https://placeholder.supabase.co"
  const anonKey = anonKeyEnv ?? "placeholder-anon-key"

  client = createBrowserClient<Database>(url, anonKey, {
    // Cookies seguros em producao; em dev fica off para funcionar no localhost.
    cookieOptions: { secure: process.env.NODE_ENV === "production" },
  })

  return client
}
