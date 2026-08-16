// Persistência local do estado de conclusão da triagem (onboarding).
// Serve de "cache" para o app não reexibir o onboarding enquanto a leitura
// do banco carrega ou caso ela falhe momentaneamente. A fonte de verdade
// continua sendo a coluna alunos.onboarding_completed.

const KEY = "cf-onboarding-done"

export function markOnboardingDone(userId: string) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(`${KEY}:${userId}`, "1")
  } catch {
    /* ignora indisponibilidade do localStorage */
  }
}

export function isOnboardingDoneLocal(userId: string) {
  if (typeof window === "undefined") return false
  try {
    return localStorage.getItem(`${KEY}:${userId}`) === "1"
  } catch {
    return false
  }
}

export function clearOnboardingDone(userId: string) {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(`${KEY}:${userId}`)
  } catch {
    /* ignora */
  }
}
