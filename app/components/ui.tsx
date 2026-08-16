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
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-balance text-foreground">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
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
    primary: "bg-primary/15 text-primary",
    accent: "bg-accent/15 text-accent",
    success: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning",
  }
  return (
    <div className="cf-card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted">{label}</p>
          <p className="mt-2 text-3xl font-semibold text-foreground">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
        </div>
        <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl", accentMap[accent])}>
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
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-2 text-muted">
        <IconCmp size={28} weight="duotone" />
      </div>
      <h3 className="mt-4 text-lg font-medium text-foreground">{title}</h3>
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
    muted: "bg-surface-2 text-muted",
    success: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning",
    danger: "bg-danger/15 text-danger",
    primary: "bg-primary/15 text-primary",
  }
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium", map[tone])}>
      {children}
    </span>
  )
}

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("cf-card p-5", className)}>{children}</div>
}
