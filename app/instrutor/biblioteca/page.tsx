import { PageHeader } from "../../components/ui"
import BibliotecaExercicios from "../../components/BibliotecaExercicios"

export default function BibliotecaInstrutorPage() {
  return (
    <div>
      <PageHeader
        title="Biblioteca de Exercícios"
        subtitle="1.324 exercícios com animação, músculos e passo a passo"
      />
      <BibliotecaExercicios mode="browse" />
    </div>
  )
}
