import type React from "react"

import DashboardShell from "../components/DashboardShell"

export default function InstrutorLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>
}
