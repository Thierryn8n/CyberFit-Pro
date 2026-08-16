import Link from "next/link"
import { WarningCircle } from "@phosphor-icons/react/dist/ssr"

import AuthShell from "../../components/AuthShell"

export default function AuthErrorPage() {
  return (
    <AuthShell title="Ops, algo deu errado" subtitle="Não foi possível concluir a autenticação.">
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <WarningCircle size={56} weight="fill" className="text-danger" />
        <p className="text-sm text-muted text-pretty">O link pode ter expirado ou já ter sido usado.</p>
        <Link href="/login" className="cf-btn-primary w-full">
          Voltar para o login
        </Link>
      </div>
    </AuthShell>
  )
}
