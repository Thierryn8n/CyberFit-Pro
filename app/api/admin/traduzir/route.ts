import { NextResponse } from "next/server"

import { generateText } from "ai"
import pg from "pg"

export const runtime = "nodejs"
export const maxDuration = 300

// Rota administrativa TEMPORARIA para traduzir os nomes dos exercicios da
// biblioteca para pt-BR usando o AI Gateway (que funciona dentro do runtime).
// Faz tudo via conexao Postgres direta (DDL + UPDATE), sem depender das
// variaveis NEXT_PUBLIC. Protegida por segredo. Pode ser chamada repetidamente
// ate "remaining" chegar a zero.

const MODEL = "openai/gpt-4o-mini"
const BATCH = 40
const SECRET = "cyberfit-traduzir-2026"

const SYSTEM = `Voce e um tradutor especialista em musculacao e fitness do Brasil.
Traduza cada nome de exercicio do ingles para o portugues do Brasil usando a
terminologia REAL usada nas academias brasileiras. Exemplos de estilo:
- "Barbell Bench Press" -> "Supino reto com barra"
- "Incline Dumbbell Press" -> "Supino inclinado com halteres"
- "Romanian Deadlift" -> "Stiff (levantamento terra romeno)"
- "Barbell Curl" -> "Rosca direta com barra"
- "Lat Pulldown" -> "Puxada na frente (pulldown)"
- "Leg Press" -> "Leg press"
- "Triceps Pushdown" -> "Triceps na polia (pushdown)"
- "Dumbbell Lateral Raise" -> "Elevacao lateral com halteres"
Regras:
- Mantenha nomes de equipamentos e termos consagrados (leg press, crossover, drag curl).
- Seja conciso e natural, como um professor de academia escreveria.
- NAO invente exercicios; apenas traduza.
- Responda APENAS com um JSON valido no formato {"items":[{"i":0,"pt":"..."}]}.`

function dbConnString(): string | null {
  const cs = process.env.DIRECT_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL || null
  if (!cs) return null
  if (process.env.POSTGRES_PASSWORD) {
    try {
      const u = new URL(cs)
      u.password = process.env.POSTGRES_PASSWORD
      return u.toString()
    } catch {
      return cs
    }
  }
  return cs
}

function diag() {
  const present = (k: string) => Boolean(process.env[k])
  return {
    DIRECT_URL: present("DIRECT_URL"),
    DATABASE_URL: present("DATABASE_URL"),
    POSTGRES_URL: present("POSTGRES_URL"),
    POSTGRES_PASSWORD: present("POSTGRES_PASSWORD"),
    SUPABASE_SECRET_KEY: present("SUPABASE_SECRET_KEY"),
    NEXT_PUBLIC_SUPABASE_URL: present("NEXT_PUBLIC_SUPABASE_URL"),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: present("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    AI_GATEWAY_API_KEY: present("AI_GATEWAY_API_KEY"),
  }
}

function extrairJson(texto: string) {
  const semCerca = texto.replace(/```json/gi, "").replace(/```/g, "").trim()
  const inicio = semCerca.indexOf("{")
  const fim = semCerca.lastIndexOf("}")
  if (inicio === -1 || fim === -1) throw new Error("Sem JSON na resposta")
  return JSON.parse(semCerca.slice(inicio, fim + 1))
}

async function traduzirLote(items: { id: string; name: string }[]) {
  const { text } = await generateText({
    model: MODEL,
    temperature: 0.2,
    system: SYSTEM,
    prompt: JSON.stringify({ items: items.map((it, i) => ({ i, name: it.name })) }),
  })
  const parsed = extrairJson(text)
  const arr = parsed.items ?? parsed.translations ?? []
  const map = new Map<number, string>()
  for (const row of arr) {
    if (typeof row.i === "number" && row.pt) map.set(row.i, String(row.pt).trim())
  }
  return items.map((it, i) => ({ id: it.id, pt: map.get(i) || null }))
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  if (searchParams.get("secret") !== SECRET) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
  }

  // Modo diagnostico: retorna quais variaveis o runtime tem (sem expor valores).
  if (searchParams.get("diag") === "1") {
    return NextResponse.json({ diag: diag() })
  }

  const cs = dbConnString()
  if (!cs) {
    return NextResponse.json(
      { error: "Sem connection string do Postgres no runtime.", diag: diag() },
      { status: 500 },
    )
  }

  const limit = Math.min(Number(searchParams.get("limit") ?? 200), 400)
  const client = new pg.Client({ connectionString: cs, ssl: { rejectUnauthorized: false } })
  await client.connect()

  try {
    // 1) Garante a coluna
    await client.query("alter table public.biblioteca_exercicios add column if not exists name_pt text")

    // 2) Busca pendentes
    const { rows: pendentes } = await client.query<{ id: string; name: string }>(
      "select id, name from public.biblioteca_exercicios where name_pt is null or name_pt = '' order by id limit $1",
      [limit],
    )

    let processed = 0
    for (let i = 0; i < pendentes.length; i += BATCH) {
      const chunk = pendentes.slice(i, i + BATCH)
      let results
      try {
        results = await traduzirLote(chunk)
      } catch {
        await new Promise((r) => setTimeout(r, 1500))
        results = await traduzirLote(chunk)
      }
      await client.query("begin")
      for (const r of results) {
        if (r.pt) {
          await client.query("update public.biblioteca_exercicios set name_pt = $1 where id = $2", [r.pt, r.id])
        }
      }
      await client.query("commit")
      processed += chunk.length
    }

    const { rows: stat } = await client.query<{ remaining: number }>(
      "select count(*)::int as remaining from public.biblioteca_exercicios where name_pt is null or name_pt = ''",
    )

    return NextResponse.json({ processed, remaining: stat[0]?.remaining ?? 0 })
  } finally {
    await client.end()
  }
}
