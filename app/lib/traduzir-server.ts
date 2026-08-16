import "server-only"

import pg from "pg"

// Nucleo compartilhado de traducao (nomes + instrucoes) via NVIDIA NIM.
// Usado tanto pela rota administrativa (lote completo, protegida por
// segredo) quanto pelas rotas de traducao "on-demand" (um exercicio por vez,
// disparadas automaticamente quando o instrutor/aluno abre um exercicio
// ainda nao traduzido) e pelo botao "Traduzir tudo".

export const NVIDIA_URL = "https://integrate.api.nvidia.com/v1/chat/completions"
export const MODEL = "meta/llama-3.1-8b-instruct"
export const BATCH = 25
export const BATCH_INSTR = 3

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

export function nvidiaKey(): string | null {
  return process.env.NVIDIA_API_KEY || process.env.NVIDIA_NIM_API_KEY || process.env.NVAPI_KEY || null
}

export function dbConnString(): string | null {
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

export function diag() {
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

export function extrairJson(texto: string) {
  const semCerca = texto.replace(/```json/gi, "").replace(/```/g, "").trim()
  const inicio = semCerca.indexOf("{")
  const fim = semCerca.lastIndexOf("}")
  if (inicio === -1 || fim === -1) throw new Error("Sem JSON na resposta")
  return JSON.parse(semCerca.slice(inicio, fim + 1))
}

// Parser tolerante para a resposta de instrucoes: quando o modelo trunca a
// resposta (instrucoes longas + varios itens no lote), o JSON fecha errado.
// Em vez de descartar o lote inteiro, extrai cada objeto `{"i":N,...}`
// individualmente e ignora apenas o ultimo, se estiver incompleto.
export function extrairJsonInstrucoes(texto: string): { items: { i: number; text?: string; steps?: string[] }[] } {
  try {
    return extrairJson(texto)
  } catch {
    // ignora e tenta o reparo abaixo
  }

  const semCerca = texto.replace(/```json/gi, "").replace(/```/g, "").trim()
  const items: { i: number; text?: string; steps?: string[] }[] = []
  // Localiza cada bloco "i":N,... ate a proxima ocorrencia de "i":N ou o fim.
  const re = /\{\s*"i"\s*:\s*(\d+)\s*,/g
  const starts: number[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(semCerca))) starts.push(m.index)

  for (let k = 0; k < starts.length; k++) {
    const from = starts[k]
    const to = k + 1 < starts.length ? starts[k + 1] : semCerca.length
    let bloco = semCerca.slice(from, to).replace(/,\s*$/, "")
    // Garante que o bloco fecha corretamente; se nao fechar, e o ultimo
    // item truncado - descarta.
    const abre = (bloco.match(/\{/g) ?? []).length
    const fecha = (bloco.match(/\}/g) ?? []).length
    if (abre !== fecha) continue
    try {
      const obj = JSON.parse(bloco)
      if (typeof obj.i === "number") items.push(obj)
    } catch {
      // bloco corrompido - ignora so este item
    }
  }

  if (items.length === 0) throw new Error("Sem JSON na resposta")
  return { items }
}

// Escolhe a melhor fonte de traducao (ingles de preferencia) a partir dos
// mapas de instrucao vindos do banco.
export function fonteInstrucao(instructions: Record<string, string> | null, steps: Record<string, string[]> | null) {
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

export async function traduzirLote(items: { id: string; name: string }[]) {
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

export async function traduzirInstrucoesLote(items: InstrucaoPendente[]) {
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
      max_tokens: 8192,
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
  const parsed = extrairJsonInstrucoes(text)
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

export interface LoteResultado {
  processed: number
  remaining: number
}

// Traduz um lote de nomes pendentes direto no banco (usado pela rota admin
// e pelo botao "Traduzir tudo").
export async function traduzirNomesPendentes(client: pg.Client, limit: number): Promise<LoteResultado> {
  await client.query("alter table public.biblioteca_exercicios add column if not exists name_pt text")

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

  return { processed, remaining: stat[0]?.remaining ?? 0 }
}

// Traduz um lote de instrucoes pendentes direto no banco.
export async function traduzirInstrucoesPendentes(client: pg.Client, limit: number): Promise<LoteResultado> {
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
      // Retry 1: mesmo lote apos uma pausa (pode ter sido rate limit).
      try {
        await new Promise((r) => setTimeout(r, 1500))
        results = await traduzirInstrucoesLote(chunk)
      } catch {
        // Retry 2: cai para traducao item-a-item - lotes menores tem bem
        // menos chance de o modelo truncar o JSON no meio.
        results = []
        for (const item of chunk) {
          try {
            const [r] = await traduzirInstrucoesLote([item])
            results.push(r)
          } catch {
            results.push({ id: item.id, text: null, steps: null })
          }
        }
      }
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

  return { processed, remaining: stat[0]?.remaining ?? 0 }
}

export interface TraducaoUnica {
  name_pt: string | null
  instructions_pt: string | null
  instruction_steps_pt: string[] | null
}

// Traduz UM exercicio especifico "on demand" (nome + instrucao), usado quando
// o instrutor ou o aluno abre um exercicio que ainda nao tem traducao pt-BR.
// Idempotente: se ja estiver tudo traduzido, so devolve o que ja existe sem
// chamar a NVIDIA de novo.
export async function traduzirExercicioUnico(client: pg.Client, id: string): Promise<TraducaoUnica | null> {
  await client.query("alter table public.biblioteca_exercicios add column if not exists name_pt text")
  await client.query("alter table public.biblioteca_exercicios add column if not exists instructions_pt text")
  await client.query("alter table public.biblioteca_exercicios add column if not exists instruction_steps_pt jsonb")

  const { rows } = await client.query<{
    id: string
    name: string
    name_pt: string | null
    instructions: Record<string, string> | null
    instruction_steps: Record<string, string[]> | null
    instructions_pt: string | null
    instruction_steps_pt: string[] | null
  }>(
    `select id, name, name_pt, instructions, instruction_steps, instructions_pt, instruction_steps_pt
       from public.biblioteca_exercicios where id = $1`,
    [id],
  )
  const row = rows[0]
  if (!row) return null

  let name_pt = row.name_pt?.trim() || null
  let instructions_pt = row.instructions_pt?.trim() || null
  let instruction_steps_pt = row.instruction_steps_pt ?? null

  const precisaNome = !name_pt
  const fonte = fonteInstrucao(row.instructions, row.instruction_steps)
  const precisaInstrucao = !instructions_pt && (fonte.steps.length > 0 || Boolean(fonte.text))

  if (!precisaNome && !precisaInstrucao) {
    return { name_pt, instructions_pt, instruction_steps_pt }
  }

  if (precisaNome) {
    const [r] = await traduzirLote([{ id: row.id, name: row.name }])
    if (r?.pt) name_pt = r.pt
  }

  if (precisaInstrucao) {
    const [r] = await traduzirInstrucoesLote([{ id: row.id, steps: fonte.steps, text: fonte.text }])
    if (r?.text) instructions_pt = r.text
    if (r?.steps) instruction_steps_pt = r.steps
  }

  await client.query(
    "update public.biblioteca_exercicios set name_pt = coalesce($1, name_pt), instructions_pt = coalesce($2, instructions_pt), instruction_steps_pt = coalesce($3::jsonb, instruction_steps_pt) where id = $4",
    [name_pt, instructions_pt, instruction_steps_pt ? JSON.stringify(instruction_steps_pt) : null, row.id],
  )

  return { name_pt, instructions_pt, instruction_steps_pt }
}
