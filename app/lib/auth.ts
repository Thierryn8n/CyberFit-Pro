import { createClient } from "@/lib/supabase/client"
import type { Role } from "./database.types"

export interface RegisterData {
  email: string
  password: string
  fullName: string
  phone?: string
  profileType: Role
  // aluno / instrutor
  cpf?: string
  birthDate?: string
  cref?: string
  inviteCode?: string
  // academia
  cnpj?: string
  address?: string
}

function redirectUrl() {
  return (
    process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ??
    (typeof window !== "undefined" ? `${window.location.origin}/auth/callback` : undefined)
  )
}

export function homeForRole(role?: string) {
  switch (role) {
    case "academia":
      return "/academia"
    case "instrutor":
      return "/instrutor"
    default:
      return "/aluno"
  }
}

/**
 * Cadastro. Toda a criacao de perfil/vinculo acontece no trigger
 * handle_new_user() do banco (security definer), evitando erros de RLS
 * enquanto o e-mail ainda nao foi confirmado.
 */
export async function signUp(data: RegisterData) {
  const supabase = createClient()
  try {
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: redirectUrl(),
        data: {
          role: data.profileType,
          full_name: data.fullName,
          phone: data.phone ?? null,
          cpf: data.cpf ?? null,
          cref: data.cref ?? null,
          cnpj: data.cnpj ?? null,
          address: data.address ?? null,
          birth_date: data.birthDate ?? null,
          invite_code: data.inviteCode ?? null,
        },
      },
    })

    if (error) {
      return { success: false, error: { message: error.message } }
    }

    return {
      success: true,
      data: authData,
      needsConfirmation: !authData.session,
      message: authData.session
        ? "Cadastro realizado com sucesso!"
        : "Cadastro realizado! Confirme seu e-mail para ativar a conta.",
    }
  } catch (err) {
    return {
      success: false,
      error: { message: err instanceof Error ? err.message : "Erro inesperado ao cadastrar." },
    }
  }
}

export async function signIn(email: string, password: string) {
  const supabase = createClient()
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      let message = "Não foi possível entrar. Tente novamente."
      if (error.message === "Invalid login credentials") message = "E-mail ou senha inválidos."
      else if (error.message === "Email not confirmed") message = "Confirme seu e-mail antes de entrar."
      else if (error.status === 429) message = "Muitas tentativas. Aguarde um momento e tente de novo."
      return { success: false, error: { message } }
    }

    const role = (data.user?.user_metadata?.role as string) || "aluno"
    return { success: true, data, redirectTo: homeForRole(role) }
  } catch (err) {
    return {
      success: false,
      error: { message: err instanceof Error ? err.message : "Erro inesperado ao entrar." },
    }
  }
}

export async function signOut() {
  const supabase = createClient()
  const { error } = await supabase.auth.signOut()
  return { success: !error, error }
}

export async function resetPassword(email: string) {
  const supabase = createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo:
      process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ??
      (typeof window !== "undefined" ? `${window.location.origin}/reset-password` : undefined),
  })
  if (error) return { success: false, error: { message: error.message } }
  return { success: true }
}

export async function updatePassword(newPassword: string) {
  const supabase = createClient()
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) return { success: false, error: { message: error.message } }
  return { success: true }
}

/** Valida um código de convite antes do cadastro (RPC pública). */
export async function validateInvite(code: string) {
  const supabase = createClient()
  const { data, error } = await supabase.rpc("validate_invite", { p_code: code.trim() })
  if (error) return { success: false, error: { message: error.message } }
  const row = Array.isArray(data) ? data[0] : data
  if (!row?.valid) return { success: false, error: { message: "Convite inválido ou expirado." } }
  return { success: true, data: row }
}

/** Gera um novo convite (academia -> instrutor, instrutor -> aluno). */
export async function createInvite(targetRole: "instrutor" | "aluno") {
  const supabase = createClient()
  const { data, error } = await supabase.rpc("create_invite", { target_role: targetRole })
  if (error) return { success: false, error: { message: error.message } }
  return { success: true, code: data as string }
}
