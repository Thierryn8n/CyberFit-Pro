import { createBrowserClient } from "@supabase/ssr"

import type { Database } from "@/app/lib/database.types"

let client: ReturnType<typeof createBrowserClient<Database>> | undefined

// Flag exposta para as telas mostrarem um aviso amigavel quando o Supabase
// ainda nao foi conectado (variaveis de ambiente ausentes).
export const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
)

export function createClient() {
  if (client) return client

  // Fallback com placeholders validos: evita que o app quebre no preview antes
  // de o Supabase ser conectado. As chamadas de rede simplesmente falham e sao
  // tratadas nas telas; a construcao do client nao lanca excecao.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co"
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder-anon-key"

  client = createBrowserClient<Database>(url, anonKey, {
    // Cookies seguros em producao; em dev fica off para funcionar no localhost.
    cookieOptions: { secure: process.env.NODE_ENV === "production" },
  })

  return client
}
