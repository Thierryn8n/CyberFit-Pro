// Camada de dados da Biblioteca de Exercicios.
// Fonte: github.com/Thierryn8n/exercises-dataset (1.324 exercicios).
// As midias (GIF + thumbnail) sao servidas via CDN jsDelivr.

export const EXERCISES_CDN = "https://cdn.jsdelivr.net/gh/Thierryn8n/exercises-dataset@main"
export const EXERCISES_JSON_URL = `${EXERCISES_CDN}/data/exercises.json`

export type Idioma = "en" | "es" | "it" | "tr" | "ru" | "zh" | "hi" | "pl" | "ko" | "fr"

// Registro cru vindo do dataset
export interface RawExercise {
  id: string
  name: string
  category: string
  body_part: string
  equipment: string
  instructions?: Partial<Record<Idioma, string>>
  instruction_steps?: Partial<Record<Idioma, string[]>>
  muscle_group?: string
  secondary_muscles?: string[]
  target?: string
  media_id?: string
  image?: string
  gif_url?: string
  attribution?: string
}

// Item leve usado nas listagens
export interface ExercicioLite {
  id: string
  name: string
  category: string
  body_part: string
  equipment: string
  target: string
  secondary_muscles: string[]
  image: string
  gif: string
}

// Item completo (com instrucoes) usado no detalhe
export interface ExercicioFull extends ExercicioLite {
  muscle_group: string
  instructions: Partial<Record<Idioma, string>>
  instruction_steps: Partial<Record<Idioma, string[]>>
  attribution: string
}

export interface BibliotecaResponse {
  items: ExercicioLite[]
  total: number
  page: number
  pageSize: number
  facets: {
    categories: { value: string; label: string; count: number }[]
    equipments: { value: string; label: string; count: number }[]
  }
}

// ---------------------------------------------------------------------------
// Traducoes PT-BR (o dataset nao traz portugues)
// ---------------------------------------------------------------------------

export const CATEGORIA_PT: Record<string, string> = {
  "upper arms": "Braços",
  "lower arms": "Antebraços",
  "upper legs": "Coxas",
  "lower legs": "Panturrilhas",
  back: "Costas",
  waist: "Abdômen",
  chest: "Peito",
  shoulders: "Ombros",
  cardio: "Cardio",
  neck: "Pescoço",
}

export const EQUIPAMENTO_PT: Record<string, string> = {
  "body weight": "Peso do corpo",
  dumbbell: "Halteres",
  barbell: "Barra",
  cable: "Cabo/Polia",
  "leverage machine": "Máquina",
  band: "Elástico",
  "smith machine": "Smith",
  kettlebell: "Kettlebell",
  weighted: "Com peso",
  "stability ball": "Bola suíça",
  "ez barbell": "Barra W",
  "medicine ball": "Bola medicinal",
  rope: "Corda",
  "roller wheel": "Roda abdominal",
  "resistance band": "Faixa elástica",
  "olympic barbell": "Barra olímpica",
  "sled machine": "Trenó",
  "assisted": "Assistido",
  "bosu ball": "Bosu",
  hammer: "Martelo",
  "skierg machine": "SkiErg",
  "stationary bike": "Bicicleta",
  "stepmill machine": "Escada",
  "trap bar": "Barra hexagonal",
  "upper body ergometer": "Ergômetro",
  "elliptical machine": "Elíptico",
  tire: "Pneu",
  wheel: "Roda",
}

export const MUSCULO_PT: Record<string, string> = {
  abs: "Abdômen",
  biceps: "Bíceps",
  triceps: "Tríceps",
  forearms: "Antebraços",
  "pectorals": "Peitoral",
  "serratus anterior": "Serrátil",
  lats: "Dorsais",
  "upper back": "Costas (superior)",
  "traps": "Trapézio",
  spine: "Coluna",
  glutes: "Glúteos",
  quads: "Quadríceps",
  hamstrings: "Posteriores de coxa",
  adductors: "Adutores",
  abductors: "Abdutores",
  calves: "Panturrilhas",
  delts: "Deltoides",
  "levator scapulae": "Levantador da escápula",
  "cardiovascular system": "Sistema cardiovascular",
}

const IDIOMA_LABEL: Record<Idioma, string> = {
  en: "Inglês",
  es: "Espanhol",
  it: "Italiano",
  tr: "Turco",
  ru: "Russo",
  zh: "Chinês",
  hi: "Hindi",
  pl: "Polonês",
  ko: "Coreano",
  fr: "Francês",
}

export function catLabel(v: string) {
  return CATEGORIA_PT[v] ?? title(v)
}
export function equipLabel(v: string) {
  return EQUIPAMENTO_PT[v] ?? title(v)
}
export function muscleLabel(v: string) {
  if (!v) return ""
  return MUSCULO_PT[v] ?? title(v)
}
export function idiomaLabel(v: Idioma) {
  return IDIOMA_LABEL[v] ?? v
}

function title(s: string) {
  return s.replace(/\b\w/g, (c) => c.toUpperCase())
}

// Monta a URL absoluta de uma midia local do dataset
export function mediaUrl(path?: string | null) {
  if (!path) return ""
  if (path.startsWith("http")) return path
  return `${EXERCISES_CDN}/${path.replace(/^\/+/, "")}`
}

// Client helpers (browser) -------------------------------------------------

export async function fetchBiblioteca(params: {
  q?: string
  category?: string
  equipment?: string
  page?: number
  pageSize?: number
  signal?: AbortSignal
}): Promise<BibliotecaResponse> {
  const sp = new URLSearchParams()
  if (params.q) sp.set("q", params.q)
  if (params.category) sp.set("category", params.category)
  if (params.equipment) sp.set("equipment", params.equipment)
  sp.set("page", String(params.page ?? 1))
  sp.set("pageSize", String(params.pageSize ?? 24))
  const res = await fetch(`/api/biblioteca/?${sp.toString()}`, { signal: params.signal })
  if (!res.ok) throw new Error("Falha ao carregar a biblioteca")
  return res.json()
}

export async function fetchExercicio(id: string): Promise<ExercicioFull> {
  const res = await fetch(`/api/biblioteca/${id}/`)
  if (!res.ok) throw new Error("Exercício não encontrado")
  return res.json()
}

// ---------------------------------------------------------------------------
// Recuperacao de midia a partir da biblioteca (fallback do painel do aluno)
// ---------------------------------------------------------------------------
// Quando um exercicio salvo nao tem gif/imagem no banco (colunas ausentes ou
// treino gravado sem midia), recuperamos a midia da biblioteca usando o
// biblioteca_id e, em ultimo caso, o proprio nome do exercicio.

export interface MidiaExercicio {
  gif: string
  image: string
  target: string
  equipment: string
  instructions: string
}

function primeiraInstrucao(ex: ExercicioFull): string {
  const i = ex.instructions ?? {}
  const texto = i.en ?? i.es ?? Object.values(i)[0] ?? ""
  return texto || ""
}

export async function midiaPorBibliotecaId(id: string): Promise<MidiaExercicio | null> {
  try {
    const ex = await fetchExercicio(id)
    return {
      gif: ex.gif || "",
      image: ex.image || "",
      target: ex.target || "",
      equipment: ex.equipment || "",
      instructions: primeiraInstrucao(ex),
    }
  } catch {
    return null
  }
}

export async function midiaPorNome(name: string): Promise<MidiaExercicio | null> {
  const alvo = name.trim().toLowerCase()
  if (!alvo) return null
  try {
    const res = await fetchBiblioteca({ q: name, pageSize: 8 })
    const match = res.items.find((i) => i.name.trim().toLowerCase() === alvo) ?? res.items[0]
    if (!match) return null
    return {
      gif: match.gif || "",
      image: match.image || "",
      target: match.target || "",
      equipment: match.equipment || "",
      instructions: "",
    }
  } catch {
    return null
  }
}
