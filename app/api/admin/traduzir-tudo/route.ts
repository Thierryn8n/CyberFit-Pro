import { NextResponse } from "next/server"

import pg from "pg"

import { dbConnString, traduzirInstrucoesPendentes, traduzirNomesPendentes } from "../../../lib/traduzir-server"

export const runtime = "nodejs"
export const maxDuration = 120

// Rota usada pelo botao "Traduzir tudo" do painel do instrutor. Traduz UM
// lote (nomes ou instrucoes) por chamada e devolve quantos exercicios ainda
// faltam; o cliente chama repetidamente ate remaining chegar a 0. Cada
// exercicio traduzido e salvo direto no banco (name_pt / instructions_pt /
// instruction_steps_pt), entao o resultado fica disponivel para todo mundo
// imediatamente.

export async function POST(request: Request) {
  const cs = dbConnString()
  if (!cs) {
    return NextResponse.json({ error: "Banco de dados indisponivel no momento." }, { status: 503 })
  }

  let body: { modo?: "nomes" | "instrucoes"; limit?: number } = {}
  try {
    body = await request.json()
  } catch {
    // corpo vazio e aceitavel, usa os defaults
  }
  const modo = body.modo === "instrucoes" ? "instrucoes" : "nomes"
  const limit = Math.min(Math.max(Number(body.limit) || 60, 1), 150)

  const client = new pg.Client({ connectionString: cs, ssl: { rejectUnauthorized: false } })
  await client.connect()

  try {
    const resultado = modo === "instrucoes" ? await traduzirInstrucoesPendentes(client, limit) : await traduzirNomesPendentes(client, limit)
    return NextResponse.json({ modo, ...resultado })
  } catch (e) {
    return NextResponse.json({ error: "Falha na traducao", detalhe: (e as Error).message }, { status: 500 })
  } finally {
    await client.end()
  }
}
