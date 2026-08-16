import { NextResponse, type NextRequest } from "next/server"

import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get("code")
  const next = searchParams.get("next")

  if (code) {
    const supabase = await createClient()
    const { error, data } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Decide o destino pelo papel do usuario
      const role = (data.user?.user_metadata?.role as string) || "aluno"
      const home = next ?? (role === "academia" ? "/academia" : role === "instrutor" ? "/instrutor" : "/aluno")
      return NextResponse.redirect(`${origin}${home}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
