import type React from "react"
import type { Icon } from "@phosphor-icons/react"

import { cn } from "../lib/utils"

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
}) {
  return (
    <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-balance text-foreground sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

export function StatCard({
  label,
  value,
  icon: IconCmp,
  hint,
  accent = "primary",
}: {
  label: string
  value: string | number
  icon: Icon
  hint?: string
  accent?: "primary" | "accent" | "success" | "warning"
}) {
  const accentMap = {
    primary: "bg-primary/20 text-primary shadow-neon",
    accent: "bg-accent/20 text-accent cf-glow-ring",
    success: "bg-success/20 text-success",
    warning: "bg-warning/20 text-warning",
  }
  return (
    <div className="cf-card group overflow-hidden">
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-20 blur-2xl transition-opacity duration-300 group-hover:opacity-35"
        style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent-2)))" }}
        aria-hidden
      />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-sm text-muted">{label}</p>
          <p className="mt-2 font-heading text-3xl font-semibold text-foreground">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
        </div>
        <div className={cn("flex h-11 w-11 items-center justify-center rounded-2xl", accentMap[accent])}>
          <IconCmp size={22} weight="duotone" />
        </div>
      </div>
    </div>
  )
}

export function EmptyState({
  icon: IconCmp,
  title,
  description,
  action,
}: {
  icon: Icon
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="cf-card flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/25 to-accent-2/25 text-primary">
        <IconCmp size={28} weight="duotone" />
      </div>
      <h3 className="mt-4 font-heading text-lg font-medium text-foreground">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function Badge({
  children,
  tone = "muted",
}: {
  children: React.ReactNode
  tone?: "muted" | "success" | "warning" | "danger" | "primary"
}) {
  const map = {
    muted: "bg-white/5 text-muted border border-white/10",
    success: "bg-success/15 text-success border border-success/20",
    warning: "bg-warning/15 text-warning border border-warning/20",
    danger: "bg-danger/15 text-danger border border-danger/20",
    primary: "bg-primary/15 text-primary border border-primary/25",
  }
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium backdrop-blur-sm", map[tone])}>
      {children}
    </span>
  )
}

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("cf-card", className)}>{children}</div>
}
