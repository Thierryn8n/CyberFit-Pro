"use client"

import { Moon, Sun } from "@phosphor-icons/react"

import { useTheme } from "./ThemeProvider"

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === "dark"

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? "Ativar tema claro" : "Ativar tema escuro"}
      title={isDark ? "Tema claro" : "Tema escuro"}
      className={`cf-emboss flex h-10 w-10 items-center justify-center rounded-2xl bg-surface-2 text-foreground transition-all active:translate-y-0.5 ${className}`}
    >
      {isDark ? <Sun size={18} weight="fill" /> : <Moon size={18} weight="fill" />}
    </button>
  )
}
