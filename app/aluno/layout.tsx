import type React from "react"

import DashboardShell from "../components/DashboardShell"

export default function AlunoLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>
}
