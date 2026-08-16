import { NextResponse, type NextRequest } from "next/server"

import { catLabel, equipLabel, type BibliotecaResponse } from "../../lib/biblioteca"
import { queryBiblioteca } from "../../lib/biblioteca-server"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams
  const page = Math.max(1, Number(sp.get("page") ?? "1"))
  const pageSize = Math.min(60, Math.max(1, Number(sp.get("pageSize") ?? "24")))

  try {
    const result = await queryBiblioteca({
      q: sp.get("q") ?? undefined,
      category: sp.get("category") ?? undefined,
      equipment: sp.get("equipment") ?? undefined,
      page,
      pageSize,
    })

    const facets: BibliotecaResponse["facets"] = {
      categories: [...result.catCount.entries()]
        .map(([value, count]) => ({ value, label: catLabel(value), count }))
        .sort((a, b) => b.count - a.count),
      equipments: [...result.equipCount.entries()]
        .map(([value, count]) => ({ value, label: equipLabel(value), count }))
        .sort((a, b) => b.count - a.count),
    }

    const body: BibliotecaResponse = {
      items: result.items,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      facets,
    }
    return NextResponse.json(body)
  } catch (err) {
    console.log("[v0] Erro ao consultar biblioteca:", (err as Error).message)
    return NextResponse.json({ error: "Não foi possível carregar a biblioteca de exercícios." }, { status: 502 })
  }
}
