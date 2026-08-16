import type React from "react"
import type { Metadata, Viewport } from "next"
import { GeistSans } from "geist/font/sans"
import { Space_Grotesk } from "next/font/google"
import "./styles/globals.css"

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["500", "600", "700"],
})

export const metadata: Metadata = {
  title: "CyberFit Pro — Gestão de Academias",
  description: "Plataforma de gestão para academias, instrutores e alunos. Treinos, agenda, avaliações e financeiro em um só lugar.",
}

export const viewport: Viewport = {
  themeColor: "#050318",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${spaceGrotesk.variable} bg-background`}
    >
      <body className="relative min-h-screen bg-background font-sans text-foreground antialiased">
        <div className="cf-mesh-bg" aria-hidden="true" />
        <div className="cf-noise" aria-hidden="true" />
        <div className="relative">{children}</div>
      </body>
    </html>
  )
}
