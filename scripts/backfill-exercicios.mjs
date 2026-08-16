// Preenche a midia faltante dos exercicios ja atribuidos aos alunos
// (public.exercicios) a partir da biblioteca (public.biblioteca_exercicios).
//
// Cruza por biblioteca_id (preferencial) e, como fallback, por nome (case-insensitive).
//
// Uso:
//   node --env-file-if-exists=.env.development.local scripts/backfill-exercicios.mjs

import pg from "pg"

const { Client } = pg

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

async function main() {
  const client = new Client({ connectionString: getConnString(), ssl: { rejectUnauthorized: false } })
  await client.connect()
  console.log("[backfill] Conectado ao Postgres.")

  // 1) Cruzamento por biblioteca_id
  const porId = await client.query(`
    update public.exercicios e
    set gif_url    = coalesce(e.gif_url, b.gif_url),
        image_url  = coalesce(e.image_url, b.image_url),
        target     = coalesce(nullif(e.target, ''), b.target),
        equipment  = coalesce(nullif(e.equipment, ''), b.equipment)
    from public.biblioteca_exercicios b
    where e.biblioteca_id = b.id
      and (e.gif_url is null or e.image_url is null)
  `)
  console.log(`[backfill] Atualizados por biblioteca_id: ${porId.rowCount}`)

  // 2) Fallback por nome (para exercicios sem biblioteca_id)
  const porNome = await client.query(`
    update public.exercicios e
    set gif_url    = coalesce(e.gif_url, b.gif_url),
        image_url  = coalesce(e.image_url, b.image_url),
        target     = coalesce(nullif(e.target, ''), b.target),
        equipment  = coalesce(nullif(e.equipment, ''), b.equipment),
        biblioteca_id = coalesce(e.biblioteca_id, b.id)
    from public.biblioteca_exercicios b
    where lower(trim(e.name)) = lower(trim(b.name))
      and (e.gif_url is null or e.image_url is null)
  `)
  console.log(`[backfill] Atualizados por nome: ${porNome.rowCount}`)

  const { rows } = await client.query(`
    select count(*)::int as total,
           count(gif_url)::int as com_gif,
           count(image_url)::int as com_img
    from public.exercicios
  `)
  console.log("[backfill] Estado final da tabela exercicios:", rows[0])

  await client.end()
}

main().catch((err) => {
  console.error("[backfill] ERRO:", err.message)
  process.exit(1)
})
