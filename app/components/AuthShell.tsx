import type React from "react"
import Link from "next/link"
import { Barbell } from "@phosphor-icons/react/dist/ssr"

export default function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="relative w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center justify-center gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-2xl shadow-neon"
            style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent-2)))" }}
          >
            <Barbell size={26} weight="duotone" className="text-primary-foreground" />
          </div>
          <span className="font-heading text-xl font-semibold">CyberFit Pro</span>
        </Link>

        <div className="cf-card p-6 sm:p-8">
          <div className="mb-6 text-center">
            <h1 className="font-heading text-2xl font-semibold text-balance">{title}</h1>
            {subtitle && <p className="mt-2 text-sm text-muted text-pretty">{subtitle}</p>}
          </div>
          {children}
        </div>

        {footer && <div className="mt-6 text-center text-sm text-muted">{footer}</div>}
      </div>
    </div>
  )
}
