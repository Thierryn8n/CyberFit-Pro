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
      {/* fundo */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(125% 125% at 50% 0%, transparent 40%, hsl(258 90% 66% / 0.18) 100%)" }}
      />
      <div className="relative w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center justify-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15">
            <Barbell size={26} weight="duotone" className="text-primary" />
          </div>
          <span className="text-xl font-semibold">CyberFit Pro</span>
        </Link>

        <div className="cf-card p-6 sm:p-8">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-semibold text-balance">{title}</h1>
            {subtitle && <p className="mt-2 text-sm text-muted text-pretty">{subtitle}</p>}
          </div>
          {children}
        </div>

        {footer && <div className="mt-6 text-center text-sm text-muted">{footer}</div>}
      </div>
    </div>
  )
}
