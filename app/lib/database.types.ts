export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Role = "academia" | "instrutor" | "aluno"

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: Role
          full_name: string | null
          email: string | null
          phone: string | null
          avatar_url: string | null
          theme_preference: "dark" | "light" | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          role: Role
          full_name?: string | null
          email?: string | null
          phone?: string | null
          avatar_url?: string | null
          theme_preference?: "dark" | "light" | null
        }
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>
      }
      academias: {
        Row: {
          id: string
          cnpj: string | null
          address: string | null
          description: string | null
          created_at: string
        }
        Insert: { id: string; cnpj?: string | null; address?: string | null; description?: string | null }
        Update: Partial<Database["public"]["Tables"]["academias"]["Insert"]>
      }
      instrutores: {
        Row: {
          id: string
          academia_id: string | null
          cref: string | null
          cpf: string | null
          specialty: string | null
          bio: string | null
          created_at: string
        }
        Insert: {
          id: string
          academia_id?: string | null
          cref?: string | null
          cpf?: string | null
          specialty?: string | null
          bio?: string | null
        }
        Update: Partial<Database["public"]["Tables"]["instrutores"]["Insert"]>
      }
      alunos: {
        Row: {
          id: string
          instrutor_id: string | null
          academia_id: string | null
          cpf: string | null
          birth_date: string | null
          weight_kg: number | null
          height_cm: number | null
          goal: string | null
          plan_status: "ativo" | "inativo" | "pendente"
          gender: "masculino" | "feminino" | "outro" | null
          activity_level: string | null
          waist_cm: number | null
          hip_cm: number | null
          arm_cm: number | null
          thigh_cm: number | null
          chest_cm: number | null
          onboarding_completed: boolean
          created_at: string
        }
        Insert: {
          id: string
          instrutor_id?: string | null
          academia_id?: string | null
          cpf?: string | null
          birth_date?: string | null
          weight_kg?: number | null
          height_cm?: number | null
          goal?: string | null
          plan_status?: "ativo" | "inativo" | "pendente"
          gender?: "masculino" | "feminino" | "outro" | null
          activity_level?: string | null
          waist_cm?: number | null
          hip_cm?: number | null
          arm_cm?: number | null
          thigh_cm?: number | null
          chest_cm?: number | null
          onboarding_completed?: boolean
        }
        Update: Partial<Database["public"]["Tables"]["alunos"]["Insert"]>
      }
      invites: {
        Row: {
          id: string
          code: string
          role: "instrutor" | "aluno"
          academia_id: string | null
          instrutor_id: string | null
          created_by: string | null
          used_by: string | null
          used_at: string | null
          expires_at: string | null
          created_at: string
        }
        Insert: Partial<Database["public"]["Tables"]["invites"]["Row"]>
        Update: Partial<Database["public"]["Tables"]["invites"]["Row"]>
      }
      treinos: {
        Row: {
          id: string
          aluno_id: string | null
          instrutor_id: string | null
          name: string
          description: string | null
          day_of_week: number | null
          status: "ativo" | "arquivado"
          created_at: string
        }
        Insert: {
          aluno_id?: string | null
          instrutor_id?: string | null
          name: string
          description?: string | null
          day_of_week?: number | null
          status?: "ativo" | "arquivado"
        }
        Update: Partial<Database["public"]["Tables"]["treinos"]["Insert"]>
      }
      exercicios: {
        Row: {
          id: string
          treino_id: string
          name: string
          sets: number | null
          reps: string | null
          rest_seconds: number | null
          weight: string | null
          notes: string | null
          order_index: number
          biblioteca_id: string | null
          gif_url: string | null
          image_url: string | null
          target: string | null
          equipment: string | null
        }
        Insert: {
          treino_id: string
          name: string
          sets?: number | null
          reps?: string | null
          rest_seconds?: number | null
          weight?: string | null
          notes?: string | null
          order_index?: number
          biblioteca_id?: string | null
          gif_url?: string | null
          image_url?: string | null
          target?: string | null
          equipment?: string | null
        }
        Update: Partial<Database["public"]["Tables"]["exercicios"]["Insert"]>
      }
      agenda: {
        Row: {
          id: string
          aluno_id: string | null
          instrutor_id: string | null
          academia_id: string | null
          title: string
          scheduled_at: string
          duration_min: number
          status: "agendado" | "concluido" | "cancelado"
          notes: string | null
          created_at: string
        }
        Insert: {
          aluno_id?: string | null
          instrutor_id?: string | null
          academia_id?: string | null
          title: string
          scheduled_at: string
          duration_min?: number
          status?: "agendado" | "concluido" | "cancelado"
          notes?: string | null
        }
        Update: Partial<Database["public"]["Tables"]["agenda"]["Insert"]>
      }
      avaliacoes: {
        Row: {
          id: string
          aluno_id: string
          instrutor_id: string | null
          assessed_on: string
          weight_kg: number | null
          height_cm: number | null
          body_fat: number | null
          muscle_mass: number | null
          notes: string | null
          created_at: string
        }
        Insert: {
          aluno_id: string
          instrutor_id?: string | null
          assessed_on?: string
          weight_kg?: number | null
          height_cm?: number | null
          body_fat?: number | null
          muscle_mass?: number | null
          notes?: string | null
        }
        Update: Partial<Database["public"]["Tables"]["avaliacoes"]["Insert"]>
      }
      pagamentos: {
        Row: {
          id: string
          aluno_id: string | null
          academia_id: string | null
          amount: number
          description: string | null
          due_date: string | null
          paid_at: string | null
          status: "pendente" | "pago" | "atrasado" | "cancelado"
          created_at: string
        }
        Insert: {
          aluno_id?: string | null
          academia_id?: string | null
          amount: number
          description?: string | null
          due_date?: string | null
          paid_at?: string | null
          status?: "pendente" | "pago" | "atrasado" | "cancelado"
        }
        Update: Partial<Database["public"]["Tables"]["pagamentos"]["Insert"]>
      }
      series_registros: {
        Row: {
          id: string
          aluno_id: string
          exercicio_id: string
          treino_id: string | null
          set_index: number
          reps: number | null
          weight: number | null
          performed_at: string
          session_date: string
        }
        Insert: {
          id?: string
          aluno_id: string
          exercicio_id: string
          treino_id?: string | null
          set_index: number
          reps?: number | null
          weight?: number | null
          performed_at?: string
          session_date?: string
        }
        Update: Partial<Database["public"]["Tables"]["series_registros"]["Insert"]>
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      create_invite: { Args: { target_role: string }; Returns: string }
      validate_invite: {
        Args: { p_code: string }
        Returns: { valid: boolean; role: string; academia_name: string }[]
      }
    }
    Enums: { [_ in never]: never }
  }
}
