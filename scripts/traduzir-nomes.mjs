// Traduz os nomes dos exercicios da tabela biblioteca_exercicios para
// portugues do Brasil, usando terminologia de academia (supino reto, stiff,
// rosca direta, etc.), via Vercel AI Gateway. Grava o resultado em name_pt.
//
// Uso:
//   node --env-file-if-exists=.env.development.local scripts/traduzir-nomes.mjs
//
// Requer: DIRECT_URL/DATABASE_URL + POSTGRES_PASSWORD e AI_GATEWAY_API_KEY.

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import pg from "pg"
import { generateText } from "ai"

const { Client } = pg
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SQL_PATH = path.join(__dirname, "005_biblioteca_name_pt.sql")

const MODEL = "openai/gpt-4o-mini"
const BATCH = 40

function getConnString() {
  const cs = process.env.DIRECT_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL
  if (!cs) throw new Error("Nenhuma connection string encontrada.")
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
Regras:
- Mantenha nomes de equipamentos e termos consagrados (leg press, crossover, drag curl).
- Seja conciso e natural, como um professor de academia escreveria.
- NAO invente exercicios; apenas traduza.
- Responda APENAS com um JSON valido no formato {"items":[{"i":0,"pt":"..."}]}.`

function extrairJson(texto) {
  // Remove cercas de codigo e pega o primeiro objeto JSON.
  const semCerca = texto.replace(/```json/gi, "").replace(/```/g, "").trim()
  const inicio = semCerca.indexOf("{")
  const fim = semCerca.lastIndexOf("}")
  if (inicio === -1 || fim === -1) throw new Error("Sem JSON na resposta")
  return JSON.parse(semCerca.slice(inicio, fim + 1))
}

async function traduzirLote(items) {
  const userContent = JSON.stringify({ items: items.map((it, i) => ({ i, name: it.name })) })
  const { text } = await generateText({
    model: MODEL,
    temperature: 0.2,
    system: SYSTEM,
    prompt: userContent,
  })
  const parsed = extrairJson(text)
  const arr = parsed.items ?? parsed.translations ?? []
  const map = new Map()
  for (const row of arr) {
    if (typeof row.i === "number" && row.pt) map.set(row.i, String(row.pt).trim())
  }
  return items.map((it, i) => ({ id: it.id, pt: map.get(i) || null }))
}

async function main() {
  const client = new Client({ connectionString: getConnString(), ssl: { rejectUnauthorized: false } })
  await client.connect()
  console.log("[traduzir] Conectado ao Postgres.")

  await client.query(fs.readFileSync(SQL_PATH, "utf8"))
  console.log("[traduzir] Coluna name_pt pronta.")

  // Traduz apenas os que ainda nao tem name_pt
  const { rows } = await client.query(
    "select id, name from public.biblioteca_exercicios where name_pt is null or name_pt = '' order by id",
  )
  console.log(`[traduzir] ${rows.length} exercicios a traduzir.`)

  let done = 0
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH)
    let results
    try {
      results = await traduzirLote(chunk)
    } catch (err) {
      console.error(`[traduzir] Falha no lote ${i}-${i + chunk.length}:`, err.message)
      // tenta novamente uma vez
      await new Promise((r) => setTimeout(r, 2000))
      results = await traduzirLote(chunk)
    }

    // Atualiza em uma transacao por lote
    await client.query("begin")
    for (const r of results) {
      if (r.pt) {
        await client.query("update public.biblioteca_exercicios set name_pt = $1 where id = $2", [r.pt, r.id])
      }
    }
    await client.query("commit")

    done += chunk.length
    console.log(`[traduzir] ${done}/${rows.length} processados...`)
  }

  const { rows: stat } = await client.query(
    "select count(*)::int as total, count(name_pt)::int as com_pt from public.biblioteca_exercicios",
  )
  console.log("[traduzir] Concluido:", stat[0])
  await client.end()
}

main().catch((err) => {
  console.error("[traduzir] ERRO:", err.message)
  process.exit(1)
})
