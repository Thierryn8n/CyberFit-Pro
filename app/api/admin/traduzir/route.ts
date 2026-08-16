import { NextResponse } from "next/server"

import pg from "pg"

export const runtime = "nodejs"
export const maxDuration = 300

// Rota administrativa TEMPORARIA para traduzir os nomes dos exercicios da
// biblioteca para pt-BR usando a API gratuita da NVIDIA NIM (compativel com o
// formato OpenAI). Faz tudo via conexao Postgres direta (DDL + UPDATE), sem
// depender das variaveis NEXT_PUBLIC. Protegida por segredo. Pode ser chamada
// repetidamente ate "remaining" chegar a zero.

const NVIDIA_URL = "https://integrate.api.nvidia.com/v1/chat/completions"
const MODEL = "meta/llama-3.1-8b-instruct"
const BATCH = 25
const BATCH_INSTR = 5
const SECRET = "cyberfit-traduzir-2026"

const SYSTEM = `Voce e um tradutor especialista em musculacao e fitness do Brasil.
Traduza cada nome de exercicio do ingles para o portugues do Brasil usando a
terminologia REAL usada nas academias brasileiras.

GLOSSARIO OBRIGATORIO (use exatamente estes termos):
- squat -> agachamento | front squat -> agachamento frontal | back squat -> agachamento
- deadlift -> levantamento terra | romanian deadlift / RDL -> stiff
- bench press -> supino | incline -> inclinado | decline -> declinado
- press (ombro) -> desenvolvimento | overhead press -> desenvolvimento
- row -> remada | bent over -> curvado | pulldown -> puxada | pull-up -> barra fixa
- curl -> rosca | biceps curl -> rosca de biceps | hammer curl -> rosca martelo
- triceps extension -> extensao de triceps | pushdown -> triceps na polia
- lateral raise -> elevacao lateral | front raise -> elevacao frontal
- lunge -> afundo | calf raise -> panturrilha | leg curl -> mesa flexora
- leg extension -> cadeira extensora | hip thrust -> elevacao pelvica
- fly / flye -> crucifixo | dip -> paralelas/mergulho | shrug -> encolhimento
- clean -> clean (levantamento olimpico, NUNCA "limpeza")
- clean and press -> clean and press | snatch -> arranco | crunch -> abdominal
- barbell -> com barra | dumbbell -> com halteres | cable -> na polia/cabo
- machine -> na maquina | smith machine -> no smith | kettlebell -> com kettlebell
- assisted -> assistido | prone -> em pronacao/deitado de bruços | supine -> deitado

Exemplos:
- "Barbell Bench Press" -> "Supino reto com barra"
- "Incline Dumbbell Press" -> "Supino inclinado com halteres"
- "Barbell Bench Front Squat" -> "Agachamento frontal com barra"
- "Barbell Clean and Press" -> "Clean and press com barra"
- "Lat Pulldown" -> "Puxada na frente"

Regras:
- Mantenha termos consagrados que academias brasileiras usam em ingles (leg press, crossover, drag curl, clean, snatch).
- Seja conciso e natural, como um professor de academia escreveria.
- NAO invente exercicios; apenas traduza.
- Responda APENAS com um JSON valido no formato {"items":[{"i":0,"pt":"..."}]}.`

const SYSTEM_INSTR = `Voce e um tradutor especialista em musculacao e fitness do Brasil.
Traduza para o portugues do Brasil o passo a passo de execucao de exercicios de
academia, usando a terminologia REAL usada nas academias brasileiras.

Regras:
- Use imperativo direto e natural, como um professor de academia escreveria ("Segure a barra", "Desca o peso controlando").
- Mantenha EXATAMENTE o mesmo numero de passos e a mesma ordem que voce recebeu.
- Traduza tambem o campo "text" (descricao corrida) se houver.
- Mantenha termos consagrados que academias brasileiras usam em ingles (leg press, crossover, drag curl, clean, snatch, drop set).
- NAO invente passos nem adicione observacoes suas.
- Responda APENAS com um JSON valido no formato:
  {"items":[{"i":0,"text":"...","steps":["passo 1","passo 2"]}]}`

// Escolhe a melhor fonte de traducao (ingles de preferencia) a partir dos
// mapas de instrucao vindos do banco.
function fonteInstrucao(instructions: Record<string, string> | null, steps: Record<string, string[]> | null) {
  const pref = ["en", "es", "it", "fr"]
  const stepsMap = steps ?? {}
  const textMap = instructions ?? {}

  let src: string[] = []
  for (const l of pref) {
    if (stepsMap[l]?.length) {
      src = stepsMap[l]
      break
    }
  }
  if (src.length === 0) {
    for (const k of Object.keys(stepsMap)) {
      if (stepsMap[k]?.length) {
        src = stepsMap[k]
        break
      }
    }
  }

  let txt = ""
  for (const l of pref) {
    if (textMap[l]) {
      txt = textMap[l]
      break
    }
  }
  if (!txt) {
    const vals = Object.values(textMap)
    txt = vals[0] ?? ""
  }

  return { steps: src, text: txt }
}

interface InstrucaoPendente {
  id: string
  steps: string[]
  text: string
}

async function traduzirInstrucoesLote(items: InstrucaoPendente[]) {
  const key = nvidiaKey()
  if (!key) throw new Error("NVIDIA_API_KEY ausente no runtime")

  const payload = { items: items.map((it, i) => ({ i, text: it.text, steps: it.steps })) }

  const res = await fetch(NVIDIA_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.2,
      max_tokens: 4096,
      messages: [
        { role: "system", content: SYSTEM_INSTR },
        { role: "user", content: JSON.stringify(payload) },
      ],
    }),
  })

  if (!res.ok) {
    const t = await res.text()
    throw new Error(`NVIDIA ${res.status}: ${t.slice(0, 300)}`)
  }

  const data = await res.json()
  const text: string = data.choices?.[0]?.message?.content ?? "{}"
  const parsed = extrairJson(text)
  const arr = parsed.items ?? []
  const map = new Map<number, { text: string; steps: string[] }>()
  for (const row of arr) {
    if (typeof row.i === "number") {
      const steps = Array.isArray(row.steps) ? row.steps.map((s: unknown) => String(s).trim()).filter(Boolean) : []
      map.set(row.i, { text: row.text ? String(row.text).trim() : "", steps })
    }
  }

  return items.map((it, i) => {
    const r = map.get(i)
    if (!r) return { id: it.id, text: null as string | null, steps: null as string[] | null }
    // Seguranca: so aceita a traducao dos passos se manteve a mesma contagem.
    const steps = r.steps.length === it.steps.length && it.steps.length > 0 ? r.steps : null
    return { id: it.id, text: r.text || null, steps }
  })
}

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

function nvidiaKey(): string | null {
  return process.env.NVIDIA_API_KEY || process.env.NVIDIA_NIM_API_KEY || process.env.NVAPI_KEY || null
}

async function traduzirLote(items: { id: string; name: string }[]) {
  const key = nvidiaKey()
  if (!key) throw new Error("NVIDIA_API_KEY ausente no runtime")

  const res = await fetch(NVIDIA_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.2,
      max_tokens: 2048,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: JSON.stringify({ items: items.map((it, i) => ({ i, name: it.name })) }) },
      ],
    }),
  })

  if (!res.ok) {
    const t = await res.text()
    throw new Error(`NVIDIA ${res.status}: ${t.slice(0, 300)}`)
  }

  const data = await res.json()
  const text: string = data.choices?.[0]?.message?.content ?? "{}"
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

  // ------------------------------------------------------------------------
  // MODO INSTRUCOES: traduz o passo a passo de execucao para pt-BR.
  // ------------------------------------------------------------------------
  if (modo === "instrucoes") {
    try {
      await client.query("alter table public.biblioteca_exercicios add column if not exists instructions_pt text")
      await client.query("alter table public.biblioteca_exercicios add column if not exists instruction_steps_pt jsonb")

      const { rows: pendentes } = await client.query<{
        id: string
        instructions: Record<string, string> | null
        instruction_steps: Record<string, string[]> | null
      }>(
        `select id, instructions, instruction_steps
           from public.biblioteca_exercicios
          where (instructions_pt is null or instructions_pt = '')
            and (instructions is not null or instruction_steps is not null)
          order by id
          limit $1`,
        [limit],
      )

      const fila: InstrucaoPendente[] = pendentes
        .map((r) => {
          const fonte = fonteInstrucao(r.instructions, r.instruction_steps)
          return { id: r.id, steps: fonte.steps, text: fonte.text }
        })
        .filter((it) => it.steps.length > 0 || it.text)

      let processed = 0
      for (let i = 0; i < fila.length; i += BATCH_INSTR) {
        const chunk = fila.slice(i, i + BATCH_INSTR)
        let results
        try {
          results = await traduzirInstrucoesLote(chunk)
        } catch {
          await new Promise((r) => setTimeout(r, 1500))
          results = await traduzirInstrucoesLote(chunk)
        }
        await client.query("begin")
        for (const r of results) {
          if (r.text || r.steps) {
            await client.query(
              "update public.biblioteca_exercicios set instructions_pt = $1, instruction_steps_pt = $2::jsonb where id = $3",
              [r.text, r.steps ? JSON.stringify(r.steps) : null, r.id],
            )
          }
        }
        await client.query("commit")
        processed += chunk.length
      }

      const { rows: stat } = await client.query<{ remaining: number }>(
        `select count(*)::int as remaining
           from public.biblioteca_exercicios
          where (instructions_pt is null or instructions_pt = '')
            and (instructions is not null or instruction_steps is not null)`,
      )

      return NextResponse.json({ modo, processed, remaining: stat[0]?.remaining ?? 0 })
    } catch (e) {
      return NextResponse.json({ error: "Falha na traducao das instrucoes", detalhe: (e as Error).message }, { status: 500 })
    } finally {
      await client.end()
    }
  }

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
  } catch (e) {
    return NextResponse.json({ error: "Falha na traducao", detalhe: (e as Error).message }, { status: 500 })
  } finally {
    await client.end()
  }
}
