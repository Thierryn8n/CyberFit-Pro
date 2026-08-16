// Helpers puros para o fluxo de treino do aluno.

export const DIAS_SEMANA = [
  { short: "Dom", long: "Domingo" },
  { short: "Seg", long: "Segunda" },
  { short: "Ter", long: "Terça" },
  { short: "Qua", long: "Quarta" },
  { short: "Qui", long: "Quinta" },
  { short: "Sex", long: "Sexta" },
  { short: "Sáb", long: "Sábado" },
] as const

// 0 = domingo ... 6 = sabado (mesmo padrao de Date.getDay e da coluna day_of_week)
export function hojeDiaSemana(): number {
  return new Date().getDay()
}

export function nomeDia(dow: number | null | undefined, formato: "short" | "long" = "long"): string {
  if (dow == null) return "Sem dia fixo"
  const d = DIAS_SEMANA[dow]
  if (!d) return "Sem dia fixo"
  return formato === "short" ? d.short : d.long
}

// Data local no formato YYYY-MM-DD (evita problema de fuso do toISOString)
export function dataLocalISO(d: Date = new Date()): string {
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10)
}

export interface SerieExecutada {
  set_index: number
  reps: number | null
  weight: number | null
}

// Volume = soma de (reps x carga) de todas as series preenchidas.
export function calcularVolume(series: SerieExecutada[]): number {
  return series.reduce((acc, s) => acc + (s.reps ?? 0) * (s.weight ?? 0), 0)
}

// Formata numero como carga (kg), sem casas desnecessarias.
export function fmtCarga(n: number | null | undefined): string {
  if (n == null) return "–"
  return Number.isInteger(n) ? `${n} kg` : `${n.toFixed(1)} kg`
}

export function fmtVolume(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(".", ",")} t`
  return `${Math.round(n)} kg`
}
