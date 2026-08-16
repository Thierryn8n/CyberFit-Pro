"use client"

import { useState } from "react"
import { Plus, Copy, Check, X } from "@phosphor-icons/react"

import { createInvite } from "../lib/auth"

export default function InviteButton({
  targetRole,
  label,
}: {
  targetRole: "instrutor" | "aluno"
  label: string
}) {
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const generate = async () => {
    setLoading(true)
    setError(null)
    const res = await createInvite(targetRole)
    if (res.success) setCode(res.code ?? null)
    else setError(res.error?.message ?? "Erro ao gerar convite.")
    setLoading(false)
  }

  const openModal = () => {
    setOpen(true)
    setCode(null)
    setError(null)
    setCopied(false)
    generate()
  }

  const copy = async () => {
    if (!code) return
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <button
        onClick={openModal}
        className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-neon transition hover:bg-primary/90"
      >
        <Plus size={18} weight="bold" />
        {label}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button aria-label="Fechar" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="animate-fade-in relative w-full max-w-md cf-card p-6">
            <button
              onClick={() => setOpen(false)}
              aria-label="Fechar"
              className="absolute right-4 top-4 text-muted hover:text-foreground"
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-semibold">Código de convite</h3>
            <p className="mt-1 text-sm text-muted">
              Compartilhe este código. A pessoa usa no cadastro para se vincular à sua conta.
            </p>

            <div className="mt-5">
              {loading && <p className="text-sm text-muted">Gerando código...</p>}
              {error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
              {code && (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-3">
                  <span className="font-mono text-xl font-semibold tracking-widest text-primary">{code}</span>
                  <button
                    onClick={copy}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-surface-2 px-3 py-2 text-sm text-foreground hover:bg-surface-2/70"
                  >
                    {copied ? <Check size={16} className="text-success" /> : <Copy size={16} />}
                    {copied ? "Copiado" : "Copiar"}
                  </button>
                </div>
              )}
            </div>

            <p className="mt-4 text-xs text-muted">O código expira em 30 dias e só pode ser usado uma vez.</p>
          </div>
        </div>
      )}
    </>
  )
}
