import { PageHeader } from "../../components/ui"
import BibliotecaExercicios from "../../components/BibliotecaExercicios"

export default function BibliotecaAlunoPage() {
  return (
    <div>
      <PageHeader
        title="Biblioteca de Exercícios"
        subtitle="Explore exercícios com animação e instruções passo a passo"
      />
      <BibliotecaExercicios mode="browse" />
    </div>
  )
}
