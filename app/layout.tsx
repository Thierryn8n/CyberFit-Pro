import type React from "react"
import type { Metadata, Viewport } from "next"
import { GeistSans } from "geist/font/sans"
import { Space_Grotesk } from "next/font/google"
import "./styles/globals.css"
import { ThemeProvider } from "./components/ThemeProvider"

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
  themeColor: "#0a0713",
  width: "device-width",
  initialScale: 1,
}

// Aplica o tema salvo antes da hidratação para evitar flash de cor.
const themeScript = `(function(){try{var t=localStorage.getItem('cf-theme')||'dark';if(t==='light'){document.documentElement.classList.add('light');}}catch(e){}})();`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${spaceGrotesk.variable} bg-background`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="relative min-h-screen bg-background font-sans text-foreground antialiased">
        <ThemeProvider>
          <div className="cf-mesh-bg" aria-hidden="true" />
          <div className="cf-noise" aria-hidden="true" />
          <div className="relative">{children}</div>
        </ThemeProvider>
      </body>
    </html>
  )
}
