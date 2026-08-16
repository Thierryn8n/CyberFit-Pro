import type React from "react"
import type { Metadata, Viewport } from "next"
import { GeistSans } from "geist/font/sans"
import "./styles/globals.css"

export const metadata: Metadata = {
  title: "CyberFit Pro — Gestão de Academias",
  description: "Plataforma de gestão para academias, instrutores e alunos. Treinos, agenda, avaliações e financeiro em um só lugar.",
}

export const viewport: Viewport = {
  themeColor: "#0a0e1a",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={`${GeistSans.variable} bg-background`}>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">{children}</body>
    </html>
  )
}
