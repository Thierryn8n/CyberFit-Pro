import type React from "react"

import InstrutorMobileShell from "../components/InstrutorMobileShell"

export default function InstrutorLayout({ children }: { children: React.ReactNode }) {
  return <InstrutorMobileShell>{children}</InstrutorMobileShell>
}
