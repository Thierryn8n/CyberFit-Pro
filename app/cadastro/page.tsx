"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Envelope,
  Lock,
  User,
  Buildings,
  ChalkboardTeacher,
  IdentificationCard,
  Phone,
  Ticket,
  Barbell,
  Spinner,
  CheckCircle,
  type Icon,
} from "@phosphor-icons/react"

import { signUp, validateInvite, type RegisterData } from "../lib/auth"
import type { Role } from "../lib/database.types"
import { cn } from "../lib/utils"
import AuthShell from "../components/AuthShell"

const PROFILES: { role: Role; label: string; desc: string; icon: Icon }[] = [
  { role: "aluno", label: "Aluno", desc: "Acompanhe seus treinos", icon: User },
  { role: "instrutor", label: "Instrutor", desc: "Gerencie seus alunos", icon: ChalkboardTeacher },
  { role: "academia", label: "Academia", desc: "Gerencie sua equipe", icon: Buildings },
]

export default function CadastroPage() {
  const [role, setRole] = useState<Role | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [form, setForm] = useState<Record<string, string>>({})

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!role) return
    setLoading(true)
    setError(null)

    // Valida convite para instrutor/aluno antes de criar a conta
    if (role !== "academia") {
      const code = (form.inviteCode ?? "").trim()
      if (!code) {
        setError("Informe o código de convite.")
        setLoading(false)
        return
      }
      const check = await validateInvite(code)
      if (!check.success) {
        setError(check.error?.message ?? "Convite inválido.")
        setLoading(false)
        return
      }
    }

    const payload: RegisterData = {
      email: (form.email ?? "").trim(),
      password: form.password ?? "",
      fullName: (form.fullName ?? "").trim(),
      phone: form.phone,
      profileType: role,
      cpf: form.cpf,
      cref: form.cref,
      cnpj: form.cnpj,
      address: form.address,
      birthDate: form.birthDate,
      inviteCode: form.inviteCode?.trim(),
    }

    const result = await signUp(payload)
    setLoading(false)
    if (!result.success) {
      setError(result.error?.message ?? "Erro ao criar conta.")
      return
    }
    setDone(true)
  }

  if (done) {
    return (
      <AuthShell title="Conta criada!" subtitle="Enviamos um link de confirmação para o seu e-mail.">
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <CheckCircle size={56} weight="fill" className="text-success" />
          <p className="text-sm text-muted text-pretty">
            Confirme seu e-mail para ativar a conta e depois faça login.
          </p>
          <Link href="/login" className="cf-btn-primary w-full">
            Ir para o login
          </Link>
        </div>
      </AuthShell>
    )
  }

  if (!role) {
    return (
      <AuthShell
        title="Criar conta"
        subtitle="Selecione o tipo de perfil"
        footer={
          <span>
            Já tem conta?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Entrar
            </Link>
          </span>
        }
      >
        <div className="space-y-3">
          {PROFILES.map((p) => (
            <button
              key={p.role}
              onClick={() => {
                setRole(p.role)
                setError(null)
              }}
              className="cf-glass flex w-full items-center gap-4 p-4 text-left transition-all hover:border-primary/50 hover:brightness-110"
            >
              <div className="cf-emboss flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/30 to-accent-2/30 text-primary">
                <p.icon size={22} weight="duotone" />
              </div>
              <div>
                <p className="font-medium">{p.label}</p>
                <p className="text-sm text-muted">{p.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </AuthShell>
    )
  }

  const current = PROFILES.find((p) => p.role === role)!

  return (
    <AuthShell
      title={`Cadastro de ${current.label}`}
      subtitle={
        role === "aluno"
          ? "Use o código enviado pelo seu instrutor"
          : role === "instrutor"
            ? "Use o código enviado pela sua academia"
            : "Preencha os dados da sua academia"
      }
      footer={
        <button onClick={() => setRole(null)} className="text-muted hover:text-foreground">
          ← Escolher outro perfil
        </button>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field icon={role === "academia" ? Buildings : User}>
          <input
            required
            placeholder={role === "academia" ? "Nome da academia" : "Nome completo"}
            value={form.fullName ?? ""}
            onChange={set("fullName")}
            className="cf-input"
          />
        </Field>

        <Field icon={Envelope}>
          <input required type="email" placeholder="E-mail" value={form.email ?? ""} onChange={set("email")} className="cf-input" autoComplete="email" />
        </Field>

        <Field icon={Phone}>
          <input placeholder="Telefone" value={form.phone ?? ""} onChange={set("phone")} className="cf-input" />
        </Field>

        {role === "academia" ? (
          <>
            <Field icon={IdentificationCard}>
              <input placeholder="CNPJ" value={form.cnpj ?? ""} onChange={set("cnpj")} className="cf-input" />
            </Field>
            <Field icon={Buildings}>
              <input placeholder="Endereço" value={form.address ?? ""} onChange={set("address")} className="cf-input" />
            </Field>
          </>
        ) : (
          <>
            <Field icon={IdentificationCard}>
              <input placeholder="CPF" value={form.cpf ?? ""} onChange={set("cpf")} className="cf-input" />
            </Field>
            {role === "instrutor" && (
              <Field icon={ChalkboardTeacher}>
                <input placeholder="CREF" value={form.cref ?? ""} onChange={set("cref")} className="cf-input" />
              </Field>
            )}
            {role === "aluno" && (
              <Field icon={Barbell}>
                <input type="date" placeholder="Nascimento" value={form.birthDate ?? ""} onChange={set("birthDate")} className="cf-input" />
              </Field>
            )}
            <Field icon={Ticket}>
              <input
                required
                placeholder="Código de convite"
                value={form.inviteCode ?? ""}
                onChange={set("inviteCode")}
                className="cf-input uppercase"
              />
            </Field>
          </>
        )}

        <Field icon={Lock}>
          <input
            required
            type="password"
            placeholder="Senha (mín. 6 caracteres)"
            minLength={6}
            value={form.password ?? ""}
            onChange={set("password")}
            className="cf-input"
            autoComplete="new-password"
          />
        </Field>

        {error && (
          <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
        )}

        <button type="submit" disabled={loading} className="cf-btn-primary w-full">
          {loading ? <Spinner size={20} className="animate-spin" /> : "Criar conta"}
        </button>
      </form>
    </AuthShell>
  )
}

function Field({ icon: IconCmp, children }: { icon: Icon; children: React.ReactNode }) {
  return (
    <div className="relative">
      <IconCmp size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
      {children}
    </div>
  )
}
