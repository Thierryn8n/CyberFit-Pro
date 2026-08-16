import { NextResponse } from "next/server"

import pg from "pg"

import { dbConnString, diag, nvidiaKey, traduzirInstrucoesPendentes, traduzirNomesPendentes } from "../../../lib/traduzir-server"

export const runtime = "nodejs"
export const maxDuration = 300

// Rota administrativa TEMPORARIA para traduzir em LOTE os nomes/instrucoes dos
// exercicios da biblioteca para pt-BR usando a API gratuita da NVIDIA NIM.
// Faz tudo via conexao Postgres direta (DDL + UPDATE), sem depender das
// variaveis NEXT_PUBLIC. Protegida por segredo. Pode ser chamada repetidamente
// ate "remaining" chegar a zero. Para uso pelo botao "Traduzir tudo" da UI,
// veja /api/admin/traduzir-tudo (sem segredo, chamada pelo app).

const SECRET = "cyberfit-traduzir-2026"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  if (searchParams.get("secret") !== SECRET) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
  }

  // Modo diagnostico: retorna quais variaveis o runtime tem (sem expor valores).
  if (searchParams.get("diag") === "1") {
    const nk = nvidiaKey() ?? ""
    return NextResponse.json({
      diag: diag(),
      nvidiaKey: { present: Boolean(nk), len: nk.length, prefix: nk.slice(0, 6) },
    })
  }

  const cs = dbConnString()
  if (!cs) {
    return NextResponse.json(
      { error: "Sem connection string do Postgres no runtime.", diag: diag() },
      { status: 500 },
    )
  }

  const limit = Math.min(Number(searchParams.get("limit") ?? 200), 400)
  const modo = searchParams.get("modo") ?? "nomes"
  const client = new pg.Client({ connectionString: cs, ssl: { rejectUnauthorized: false } })
  await client.connect()

  try {
    const resultado =
      modo === "instrucoes" ? await traduzirInstrucoesPendentes(client, limit) : await traduzirNomesPendentes(client, limit)
    return NextResponse.json({ modo, ...resultado })
  } catch (e) {
    return NextResponse.json({ error: "Falha na traducao", detalhe: (e as Error).message }, { status: 500 })
  } finally {
    await client.end()
  }
}
