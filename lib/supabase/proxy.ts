import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

// Rotas publicas (nao exigem login)
const PUBLIC_PATHS = ["/", "/login", "/cadastro", "/recuperar-senha", "/reset-password", "/auth", "/api/biblioteca", "/api/admin"]

// Prefixo de rota permitido para cada papel
const ROLE_HOME: Record<string, string> = {
  academia: "/academia",
  instrutor: "/instrutor",
  aluno: "/aluno",
}

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  // Se o Supabase ainda nao foi conectado, nao bloqueia navegacao.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return supabaseResponse
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: { secure: process.env.NODE_ENV === "production" },
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Nao logado tentando acessar area protegida -> manda pro login
  if (!user && !isPublic(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  // Logado: garante que so acessa a area do proprio papel
  if (user) {
    const role = (user.user_metadata?.role as string) || "aluno"
    const home = ROLE_HOME[role] ?? "/aluno"

    // Se esta numa area de outro papel, redireciona para a propria
    const otherAreas = Object.values(ROLE_HOME).filter((h) => h !== home)
    if (otherAreas.some((area) => pathname === area || pathname.startsWith(`${area}/`))) {
      const url = request.nextUrl.clone()
      url.pathname = home
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
