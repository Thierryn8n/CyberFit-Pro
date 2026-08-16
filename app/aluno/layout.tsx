import type React from "react"

import AlunoMobileShell from "../components/AlunoMobileShell"

export default function AlunoLayout({ children }: { children: React.ReactNode }) {
  return <AlunoMobileShell>{children}</AlunoMobileShell>
}
