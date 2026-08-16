import { createBrowserClient } from "@supabase/ssr"

import type { Database } from "@/app/lib/database.types"

let client: ReturnType<typeof createBrowserClient<Database>> | undefined

export function createClient() {
  if (client) return client

  client = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Cookies seguros em producao; em dev fica off para funcionar no localhost.
      cookieOptions: { secure: process.env.NODE_ENV === "production" },
    },
  )

  return client
}
