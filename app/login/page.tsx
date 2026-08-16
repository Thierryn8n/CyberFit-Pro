"use client"

import { useState } from "react"
import Link from "next/link"
import { Envelope, Lock, Eye, EyeSlash, Spinner } from "@phosphor-icons/react"

import { signIn } from "../lib/auth"
import AuthShell from "../components/AuthShell"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const result = await signIn(email.trim(), password)
    if (!result.success) {
      setError(result.error?.message ?? "Não foi possível entrar.")
      setLoading(false)
      return
    }
    window.location.href = result.redirectTo ?? "/aluno"
  }

  return (
    <AuthShell
      title="Bem-vindo de volta"
      subtitle="Entre com sua conta para acessar o painel"
      footer={
        <span>
          Não tem conta?{" "}
          <Link href="/cadastro" className="font-medium text-primary hover:underline">
            Criar conta
          </Link>
        </span>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <Envelope size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="email"
            required
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="cf-input"
            autoComplete="email"
          />
        </div>

        <div className="relative">
          <Lock size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type={showPw ? "text" : "password"}
            required
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="cf-input pr-10"
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            aria-label={showPw ? "Ocultar senha" : "Mostrar senha"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
          >
            {showPw ? <EyeSlash size={20} /> : <Eye size={20} />}
          </button>
        </div>

        <div className="flex justify-end">
          <Link href="/recuperar-senha" className="text-sm text-muted hover:text-foreground">
            Esqueceu a senha?
          </Link>
        </div>

        {error && (
          <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
        )}

        <button type="submit" disabled={loading} className="cf-btn-primary w-full">
          {loading ? <Spinner size={20} className="animate-spin" /> : "Entrar"}
        </button>
      </form>
    </AuthShell>
  )
}
