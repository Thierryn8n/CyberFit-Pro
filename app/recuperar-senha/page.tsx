"use client"

import { useState } from "react"
import Link from "next/link"
import { Envelope, Spinner, CheckCircle } from "@phosphor-icons/react"

import { resetPassword } from "../lib/auth"
import AuthShell from "../components/AuthShell"

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const result = await resetPassword(email.trim())
    setLoading(false)
    if (!result.success) {
      setError(result.error?.message ?? "Erro ao enviar e-mail.")
      return
    }
    setSent(true)
  }

  if (sent) {
    return (
      <AuthShell title="Verifique seu e-mail" subtitle="Se existir uma conta, enviamos um link de recuperação.">
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <CheckCircle size={56} weight="fill" className="text-success" />
          <Link href="/login" className="cf-btn-primary w-full">
            Voltar para o login
          </Link>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Recuperar senha"
      subtitle="Enviaremos um link para redefinir sua senha"
      footer={
        <Link href="/login" className="text-muted hover:text-foreground">
          ← Voltar para o login
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <Envelope size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="email"
            required
            placeholder="Seu e-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="cf-input"
            autoComplete="email"
          />
        </div>

        {error && (
          <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
        )}

        <button type="submit" disabled={loading} className="cf-btn-primary w-full">
          {loading ? <Spinner size={20} className="animate-spin" /> : "Enviar link"}
        </button>
      </form>
    </AuthShell>
  )
}
