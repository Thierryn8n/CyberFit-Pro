import Link from "next/link"
import {
  Barbell,
  Users,
  Calendar,
  ChartLineUp,
  ChalkboardTeacher,
  Money,
  ArrowRight,
} from "@phosphor-icons/react/dist/ssr"

const FEATURES = [
  { icon: Users, title: "Gestão de alunos", desc: "Cadastre e acompanhe cada aluno com histórico completo." },
  { icon: Barbell, title: "Treinos personalizados", desc: "Monte fichas de treino com exercícios, séries e cargas." },
  { icon: Calendar, title: "Agenda integrada", desc: "Organize aulas e avaliações em um calendário único." },
  { icon: ChartLineUp, title: "Progresso e avaliações", desc: "Meça evolução física com avaliações periódicas." },
  { icon: ChalkboardTeacher, title: "Equipe de instrutores", desc: "Convide instrutores e distribua os alunos." },
  { icon: Money, title: "Financeiro", desc: "Controle mensalidades, pagamentos e inadimplência." },
]

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Nav */}
      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div
            className="cf-emboss flex h-9 w-9 items-center justify-center rounded-xl"
            style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent-2)))" }}
          >
            <Barbell size={22} weight="duotone" className="text-primary-foreground" />
          </div>
          <span className="font-heading text-lg font-semibold">CyberFit Pro</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/login" className="rounded-xl px-4 py-2 text-sm font-medium text-muted hover:text-foreground">
            Entrar
          </Link>
          <Link href="/cadastro" className="cf-btn-primary text-sm">
            Criar conta
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative mx-auto max-w-6xl px-4 pb-16 pt-16 text-center sm:px-6 sm:pt-24">
        <span className="cf-glass inline-flex items-center rounded-full px-3 py-1 text-xs font-medium text-muted">
          Plataforma de gestão para academias
        </span>
        <h1 className="mx-auto mt-6 max-w-3xl font-heading text-4xl font-semibold leading-tight text-balance sm:text-5xl md:text-6xl">
          Sua academia <span className="text-gradient">inteira</span> em um só lugar
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base text-muted text-pretty sm:text-lg">
          Treinos, agenda, avaliações e financeiro para academias, instrutores e alunos. Simples, moderno e conectado.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/cadastro" className="cf-btn-primary w-full sm:w-auto">
            Começar agora <ArrowRight size={18} />
          </Link>
          <Link
            href="/login"
            className="cf-glass inline-flex w-full items-center justify-center gap-2 px-4 py-3 font-medium text-foreground transition-colors hover:bg-surface-2 sm:w-auto"
          >
            Já tenho conta
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="relative mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="cf-card">
              <div className="cf-emboss flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/30 to-accent-2/30 text-primary">
                <f.icon size={22} weight="duotone" />
              </div>
              <h3 className="mt-4 font-heading text-lg font-medium">{f.title}</h3>
              <p className="mt-1 text-sm text-muted text-pretty">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
