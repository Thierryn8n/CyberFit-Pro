"use client"

import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import {
  Barbell,
  House,
  Calendar,
  ChartLineUp,
  Users,
  ClockCounterClockwise,
  Gear,
  SignOut,
  Money,
  ChalkboardTeacher,
  UserCircle,
  List,
  X,
  type Icon,
} from "@phosphor-icons/react"

import { cn } from "../lib/utils"
import { signOut } from "../lib/auth"
import { useUserProfile } from "../hooks/useUserProfile"

interface MenuItem {
  name: string
  icon: Icon
  path: string
}

const MENUS: Record<string, MenuItem[]> = {
  aluno: [
    { name: "Dashboard", icon: House, path: "/aluno" },
    { name: "Meus Treinos", icon: Barbell, path: "/aluno/treinos" },
    { name: "Agenda", icon: Calendar, path: "/aluno/agenda" },
    { name: "Progresso", icon: ChartLineUp, path: "/aluno/progresso" },
    { name: "Histórico", icon: ClockCounterClockwise, path: "/aluno/historico" },
  ],
  instrutor: [
    { name: "Dashboard", icon: House, path: "/instrutor" },
    { name: "Alunos", icon: Users, path: "/instrutor/alunos" },
    { name: "Treinos", icon: Barbell, path: "/instrutor/treinos" },
    { name: "Agenda", icon: Calendar, path: "/instrutor/agenda" },
    { name: "Avaliações", icon: ChartLineUp, path: "/instrutor/avaliacoes" },
  ],
  academia: [
    { name: "Dashboard", icon: House, path: "/academia" },
    { name: "Instrutores", icon: ChalkboardTeacher, path: "/academia/instrutores" },
    { name: "Alunos", icon: Users, path: "/academia/alunos" },
    { name: "Financeiro", icon: Money, path: "/academia/financeiro" },
    { name: "Relatórios", icon: ChartLineUp, path: "/academia/relatorios" },
  ],
}

const ROLE_LABEL: Record<string, string> = {
  aluno: "Aluno",
  instrutor: "Instrutor",
  academia: "Academia",
}

function toTitle(name: string) {
  return name
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ")
}

export default function Sidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const { profile, loading } = useUserProfile()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    router.push("/login")
  }

  const menuItems = profile ? (MENUS[profile.role] ?? []) : []

  const navContent = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15">
          <Barbell size={22} weight="duotone" className="text-primary" />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold text-foreground">
            {profile?.role === "instrutor" && profile.academiaName ? profile.academiaName : "CyberFit Pro"}
          </h1>
          {profile?.role === "instrutor" && profile.academiaName && (
            <p className="text-xs text-muted">Academia</p>
          )}
        </div>
      </div>

      {/* Perfil do usuário */}
      <div className="px-4 pb-4">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-background/50 p-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15">
            <UserCircle size={24} weight="fill" className="text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {loading ? "Carregando..." : toTitle(profile?.full_name ?? "Usuário")}
            </p>
            <p className="text-xs text-muted">{profile ? ROLE_LABEL[profile.role] : ""}</p>
          </div>
        </div>
      </div>

      {/* Navegação */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-4">
        {menuItems.map((item) => {
          const active = pathname === item.path
          return (
            <button
              key={item.path}
              onClick={() => {
                router.push(item.path)
                setMobileOpen(false)
              }}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all",
                active ? "bg-primary text-primary-foreground shadow-neon" : "text-muted hover:bg-surface-2 hover:text-foreground",
              )}
            >
              <item.icon size={20} weight={active ? "fill" : "regular"} />
              <span>{item.name}</span>
            </button>
          )
        })}
      </nav>

      {/* Ações inferiores */}
      <div className="space-y-1 border-t border-border p-4">
        <button
          onClick={() => {
            router.push(`/${profile?.role}/configuracoes`)
            setMobileOpen(false)
          }}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-muted transition-all hover:bg-surface-2 hover:text-foreground"
        >
          <Gear size={20} />
          <span>Configurações</span>
        </button>
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-danger/80 transition-all hover:bg-danger/10 hover:text-danger"
        >
          <SignOut size={20} />
          <span>Sair</span>
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Topbar mobile */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-surface/80 px-4 py-3 backdrop-blur-md lg:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
            <Barbell size={18} weight="duotone" className="text-primary" />
          </div>
          <span className="font-semibold">CyberFit Pro</span>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menu"
          className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-foreground"
        >
          <List size={22} />
        </button>
      </header>

      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-border bg-surface/80 backdrop-blur-md lg:block">
        {navContent}
      </aside>

      {/* Drawer mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            aria-label="Fechar menu"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <div className="animate-fade-in absolute inset-y-0 left-0 w-72 max-w-[85%] border-r border-border bg-surface">
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Fechar menu"
              className="absolute right-3 top-4 rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-foreground"
            >
              <X size={20} />
            </button>
            {navContent}
          </div>
        </div>
      )}
    </>
  )
}
