import { NextResponse } from "next/server"

import { getExercicioById } from "../../../lib/biblioteca-server"

export const runtime = "nodejs"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const ex = await getExercicioById(id)
    if (!ex) {
      return NextResponse.json({ error: "Exercício não encontrado." }, { status: 404 })
    }
    return NextResponse.json(ex)
  } catch (err) {
    console.log("[v0] Erro ao carregar exercício:", (err as Error).message)
    return NextResponse.json({ error: "Não foi possível carregar o exercício." }, { status: 502 })
  }
}
