"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Lock, Eye, EyeSlash, Spinner } from "@phosphor-icons/react"

import { updatePassword } from "../lib/auth"
import AuthShell from "../components/AuthShell"

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.")
      return
    }
    if (password !== confirm) {
      setError("As senhas não coincidem.")
      return
    }

    setLoading(true)
    const result = await updatePassword(password)
    setLoading(false)
    if (!result.success) {
      setError(result.error?.message ?? "Erro ao redefinir a senha. O link pode ter expirado.")
      return
    }
    router.push("/login")
  }

  return (
    <AuthShell title="Redefinir senha" subtitle="Escolha uma nova senha para sua conta">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <Lock size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type={showPw ? "text" : "password"}
            required
            placeholder="Nova senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="cf-input pr-10"
            autoComplete="new-password"
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

        <div className="relative">
          <Lock size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type={showPw ? "text" : "password"}
            required
            placeholder="Confirmar nova senha"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="cf-input"
            autoComplete="new-password"
          />
        </div>

        {error && (
          <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
        )}

        <button type="submit" disabled={loading} className="cf-btn-primary w-full">
          {loading ? <Spinner size={20} className="animate-spin" /> : "Redefinir senha"}
        </button>
      </form>
    </AuthShell>
  )
}
