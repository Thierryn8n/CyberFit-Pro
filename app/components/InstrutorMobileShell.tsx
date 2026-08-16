"use client"

import type React from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import {
  House,
  Users,
  Barbell,
  Calendar,
  ChartLineUp,
  BookOpenText,
  Gear,
  SignOut,
  type Icon,
} from "@phosphor-icons/react"

import { signOut } from "../lib/auth"
import { useUserProfile } from "../hooks/useUserProfile"

interface Tab {
  name: string
  icon: Icon
  path: string
}

// Navegacao principal do instrutor no celular. Cinco abas cobrem o fluxo
// de trabalho diario; Biblioteca, Configuracoes e Sair ficam na barra
// superior flutuante.
const TABS: Tab[] = [
  { name: "Início", icon: House, path: "/instrutor" },
  { name: "Alunos", icon: Users, path: "/instrutor/alunos" },
  { name: "Treinos", icon: Barbell, path: "/instrutor/treinos" },
  { name: "Agenda", icon: Calendar, path: "/instrutor/agenda" },
  { name: "Avaliações", icon: ChartLineUp, path: "/instrutor/avaliacoes" },
]

function isActive(pathname: string, path: string) {
  const clean = pathname.replace(/\/+$/, "") || "/"
  if (path === "/instrutor") return clean === "/instrutor"
  return clean === path || clean.startsWith(`${path}/`)
}

export default function InstrutorMobileShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { profile } = useUserProfile()

  const handleSignOut = async () => {
    await signOut()
    router.push("/login")
  }

  const nome = profile?.academiaName || "CyberFit Pro"

  return (
    // Enquadramento mobile: container central de largura de celular mesmo
    // no desktop, pois o instrutor usa pelo telefone.
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pb-28 pt-4">
      {/* Barra superior flutuante e arredondada */}
      <header className="cf-card sticky top-4 z-30 flex items-center justify-between gap-3 !rounded-3xl !p-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div
            className="cf-emboss flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
            style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent-2)))" }}
          >
            <Barbell size={20} weight="duotone" className="text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-heading text-sm font-semibold leading-tight text-foreground">{nome}</p>
            <p className="text-[11px] text-muted">Painel do instrutor</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Link
            href="/instrutor/biblioteca"
            aria-label="Biblioteca"
            className="cf-inset flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface-2 text-foreground transition-colors hover:text-primary"
          >
            <BookOpenText size={18} weight="duotone" />
          </Link>
          <Link
            href="/instrutor/configuracoes"
            aria-label="Configurações"
            className="cf-inset flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface-2 text-foreground transition-colors hover:text-primary"
          >
            <Gear size={18} weight="duotone" />
          </Link>
          <button
            onClick={handleSignOut}
            aria-label="Sair"
            className="cf-inset flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface-2 text-danger transition-colors hover:brightness-110"
          >
            <SignOut size={18} weight="duotone" />
          </button>
        </div>
      </header>

      {/* Conteudo */}
      <main className="flex-1 pt-5">{children}</main>

      {/* Navegacao inferior flutuante e arredondada */}
      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-4 z-40 mx-auto w-[calc(100%-2rem)] max-w-md px-0"
      >
        <div className="cf-card flex items-center justify-around gap-1 !rounded-3xl !p-2">
          {TABS.map((tab) => {
            const active = isActive(pathname, tab.path)
            const Icon = tab.icon
            return (
              <Link
                key={tab.path}
                href={tab.path}
                aria-current={active ? "page" : undefined}
                className={`flex flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-2 text-[10px] font-medium transition-all ${
                  active ? "cf-emboss text-primary-foreground" : "text-muted hover:text-foreground"
                }`}
                style={
                  active
                    ? { backgroundImage: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent-2)))" }
                    : undefined
                }
              >
                <Icon size={22} weight={active ? "fill" : "regular"} />
                <span className="leading-none">{tab.name}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
