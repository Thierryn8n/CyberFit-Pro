"use client"

import type React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  House,
  Barbell,
  ChartLineUp,
  User,
  BookOpenText,
  Calendar,
  ClockCounterClockwise,
  SignOut,
  type Icon,
} from "@phosphor-icons/react"

import { signOut } from "../lib/auth"
import { useUserProfile } from "../hooks/useUserProfile"
import ThemeToggle from "./ThemeToggle"

interface Tab {
  name: string
  icon: Icon
  path: string
}

// Navegacao principal do aluno no celular. Quatro abas cobrem o fluxo diario;
// Biblioteca, Agenda e Histórico ficam na barra superior flutuante — mesmo
// padrão visual usado no InstrutorMobileShell (cf-card flutuante + nav
// inferior com destaque em gradiente no item ativo).
const TABS: Tab[] = [
  { name: "Início", icon: House, path: "/aluno" },
  { name: "Treinos", icon: Barbell, path: "/aluno/treinos" },
  { name: "Progresso", icon: ChartLineUp, path: "/aluno/progresso" },
  { name: "Perfil", icon: User, path: "/aluno/perfil" },
]

function isActive(pathname: string, path: string) {
  const clean = pathname.replace(/\/+$/, "") || "/"
  if (path === "/aluno") return clean === "/aluno"
  return clean === path || clean.startsWith(`${path}/`)
}

export default function AlunoMobileShell({ children }: { children: React.ReactNode }) {
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
    // no desktop, espelhando o InstrutorMobileShell.
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
            <p className="text-[11px] text-muted">Painel do aluno</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <ThemeToggle className="!h-9 !w-9 !rounded-xl border border-border" />
          <Link
            href="/aluno/biblioteca"
            aria-label="Biblioteca"
            className="cf-inset flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface-2 text-foreground transition-colors hover:text-primary"
          >
            <BookOpenText size={18} weight="duotone" />
          </Link>
          <Link
            href="/aluno/agenda"
            aria-label="Agenda"
            className="cf-inset flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface-2 text-foreground transition-colors hover:text-primary"
          >
            <Calendar size={18} weight="duotone" />
          </Link>
          <Link
            href="/aluno/historico"
            aria-label="Histórico"
            className="cf-inset flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface-2 text-foreground transition-colors hover:text-primary"
          >
            <ClockCounterClockwise size={18} weight="duotone" />
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
