import type React from "react"

import DashboardShell from "../components/DashboardShell"

export default function AcademiaLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>
}
