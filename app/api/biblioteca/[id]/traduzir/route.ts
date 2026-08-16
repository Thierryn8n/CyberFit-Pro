import { NextResponse } from "next/server"

import pg from "pg"

import { dbConnString, traduzirExercicioUnico } from "../../../../lib/traduzir-server"

export const runtime = "nodejs"
export const maxDuration = 30

// Traducao "on-demand": disparada automaticamente pelo app quando o
// instrutor ou o aluno abre um exercicio que ainda nao tem nome/instrucao em
// pt-BR. Traduz so aquele exercicio (rapido) e ja salva no banco, entao da
// segunda vez em diante ele carrega direto em portugues sem chamar a NVIDIA
// de novo.

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!id) return NextResponse.json({ error: "id ausente" }, { status: 400 })

  const cs = dbConnString()
  if (!cs) {
    // Sem banco disponivel agora (variaveis ausentes) - falha silenciosa,
    // a UI mantem o idioma de fallback ate a proxima tentativa.
    return NextResponse.json({ error: "Banco de dados indisponivel no momento." }, { status: 503 })
  }

  const client = new pg.Client({ connectionString: cs, ssl: { rejectUnauthorized: false } })
  await client.connect()

  try {
    const resultado = await traduzirExercicioUnico(client, id)
    if (!resultado) return NextResponse.json({ error: "Exercício não encontrado" }, { status: 404 })
    return NextResponse.json(resultado)
  } catch (e) {
    return NextResponse.json({ error: "Falha na traducao", detalhe: (e as Error).message }, { status: 500 })
  } finally {
    await client.end()
  }
}
