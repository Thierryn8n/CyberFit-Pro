import { NextResponse } from "next/server"

import { getDataset, toFull } from "../../../lib/biblioteca-server"

export const runtime = "nodejs"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const { byId } = await getDataset()
    const ex = byId.get(id)
    if (!ex) {
      return NextResponse.json({ error: "Exercício não encontrado." }, { status: 404 })
    }
    return NextResponse.json(toFull(ex))
  } catch (err) {
    console.log("[v0] Erro ao carregar exercício:", (err as Error).message)
    return NextResponse.json({ error: "Não foi possível carregar o exercício." }, { status: 502 })
  }
}
