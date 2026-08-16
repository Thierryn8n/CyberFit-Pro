import type React from "react"

import AlunoMobileShell from "../components/AlunoMobileShell"
import OnboardingGate from "../components/OnboardingGate"

export default function AlunoLayout({ children }: { children: React.ReactNode }) {
  return (
    <OnboardingGate>
      <AlunoMobileShell>{children}</AlunoMobileShell>
    </OnboardingGate>
  )
}
