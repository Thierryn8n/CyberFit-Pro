"use client"

import type React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { House, Barbell, ChartLineUp, User } from "@phosphor-icons/react"

const TABS = [
  { name: "Início", icon: House, path: "/aluno" },
  { name: "Treinos", icon: Barbell, path: "/aluno/treinos" },
  { name: "Progresso", icon: ChartLineUp, path: "/aluno/progresso" },
  { name: "Perfil", icon: User, path: "/aluno/perfil" },
]

function isActive(pathname: string, path: string) {
  if (path === "/aluno") return pathname === "/aluno"
  return pathname === path || pathname.startsWith(`${path}/`)
}

export default function AlunoMobileShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    // Fundo neutro fora do "telefone"; container central limita a largura para
    // manter a experiencia mobile mesmo quando aberto no desktop.
    <div className="flex min-h-screen justify-center bg-black/40">
      <div className="relative flex min-h-screen w-full max-w-md flex-col bg-background shadow-2xl shadow-black/50">
        {/* Conteudo rolavel; padding-bottom reserva espaco para a nav fixa */}
        <main className="flex-1 overflow-x-hidden pb-24">{children}</main>

        {/* Bottom navigation */}
        <nav
          aria-label="Navegação principal"
          className="fixed bottom-0 z-40 w-full max-w-md border-t border-border bg-surface/95 backdrop-blur"
        >
          <ul className="flex items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)] pt-2">
            {TABS.map((tab) => {
              const active = isActive(pathname, tab.path)
              const Icon = tab.icon
              return (
                <li key={tab.path} className="flex-1">
                  <Link
                    href={tab.path}
                    className={`flex flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-medium transition-colors ${
                      active ? "text-primary" : "text-muted hover:text-foreground"
                    }`}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon size={24} weight={active ? "fill" : "regular"} />
                    {tab.name}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>
    </div>
  )
}
