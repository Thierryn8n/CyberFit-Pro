// Importa TODOS os exercicios do dataset do GitHub para a tabela
// public.biblioteca_exercicios no Supabase (Postgres), com URLs completas de
// GIF e imagem apontando para o CDN jsDelivr.
//
// Uso:
//   node --env-file-if-exists=.env.development.local scripts/import-biblioteca.mjs
//
// Requer: DATABASE_URL (ou DIRECT_URL) no ambiente.

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import pg from "pg"

const { Client } = pg

const CDN = "https://cdn.jsdelivr.net/gh/Thierryn8n/exercises-dataset@main"
const JSON_URL = `${CDN}/data/exercises.json`

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SQL_PATH = path.join(__dirname, "004_biblioteca_exercicios.sql")

function mediaUrl(relOrAbs) {
  if (!relOrAbs) return null
  if (/^https?:\/\//i.test(relOrAbs)) return relOrAbs
  return `${CDN}/${relOrAbs.replace(/^\/+/, "")}`
}

function getConnString() {
  // Preferimos a conexao direta (5432) para rodar DDL.
  const cs = process.env.DIRECT_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL
  if (!cs) {
    throw new Error("Nenhuma connection string encontrada (DIRECT_URL / DATABASE_URL / POSTGRES_URL).")
  }
  // A senha embutida na string pode estar desatualizada; POSTGRES_PASSWORD e a fonte de verdade.
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

async function main() {
  console.log("[import] Baixando dataset:", JSON_URL)
  const res = await fetch(JSON_URL)
  if (!res.ok) throw new Error(`Falha ao baixar dataset (${res.status})`)
  const raw = await res.json()
  console.log(`[import] ${raw.length} exercicios carregados.`)

  const client = new Client({
    connectionString: getConnString(),
    ssl: { rejectUnauthorized: false },
  })
  await client.connect()
  console.log("[import] Conectado ao Postgres.")

  // 1) Cria a tabela + indices + RLS
  const ddl = fs.readFileSync(SQL_PATH, "utf8")
  await client.query(ddl)
  console.log("[import] Tabela biblioteca_exercicios pronta (DDL aplicado).")

  // 2) Insercao em lote com upsert
  const cols = [
    "id",
    "name",
    "category",
    "body_part",
    "equipment",
    "target",
    "muscle_group",
    "secondary_muscles",
    "gif_url",
    "image_url",
    "media_id",
    "instructions",
    "instruction_steps",
    "attribution",
  ]

  const BATCH = 200
  let inserted = 0

  for (let i = 0; i < raw.length; i += BATCH) {
    const chunk = raw.slice(i, i + BATCH)
    const values = []
    const placeholders = []

    chunk.forEach((e, idx) => {
      const base = idx * cols.length
      placeholders.push(`(${cols.map((_, k) => `$${base + k + 1}`).join(",")})`)
      values.push(
        e.id,
        e.name,
        e.category ?? null,
        e.body_part ?? null,
        e.equipment ?? null,
        e.target ?? null,
        e.muscle_group ?? null,
        Array.isArray(e.secondary_muscles) ? e.secondary_muscles : [],
        mediaUrl(e.gif_url),
        mediaUrl(e.image),
        e.media_id ?? null,
        JSON.stringify(e.instructions ?? {}),
        JSON.stringify(e.instruction_steps ?? {}),
        e.attribution ?? "© Gym visual — https://gymvisual.com/",
      )
    })

    const sql = `
      insert into public.biblioteca_exercicios (${cols.join(",")})
      values ${placeholders.join(",")}
      on conflict (id) do update set
        name = excluded.name,
        category = excluded.category,
        body_part = excluded.body_part,
        equipment = excluded.equipment,
        target = excluded.target,
        muscle_group = excluded.muscle_group,
        secondary_muscles = excluded.secondary_muscles,
        gif_url = excluded.gif_url,
        image_url = excluded.image_url,
        media_id = excluded.media_id,
        instructions = excluded.instructions,
        instruction_steps = excluded.instruction_steps,
        attribution = excluded.attribution
    `
    await client.query(sql, values)
    inserted += chunk.length
    console.log(`[import] ${inserted}/${raw.length} inseridos...`)
  }

  const { rows } = await client.query(
    "select count(*)::int as total, count(gif_url)::int as com_gif, count(image_url)::int as com_img from public.biblioteca_exercicios",
  )
  console.log("[import] Concluido:", rows[0])

  await client.end()
}

main().catch((err) => {
  console.error("[import] ERRO:", err.message)
  process.exit(1)
})
