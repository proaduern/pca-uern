import { prisma } from "@/lib/prisma";
import { exigirUnidade } from "@/lib/auth";
import DadosUnidadeForm from "./DadosUnidadeForm";

export default async function DadosUnidadePage() {
  const sessao = await exigirUnidade();
  const unidade = await prisma.unidade.findUniqueOrThrow({ where: { id: sessao.id } });

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-slate-900">Dados da unidade</h1>
      <p className="text-sm text-slate-500">
        Responsável pela unidade — usado na emissão do DFD e para contato da PROAD.
      </p>
      <DadosUnidadeForm
        responsavelNome={unidade.responsavelNome}
        responsavelMatricula={unidade.responsavelMatricula}
        responsavelTelefone={unidade.responsavelTelefone}
      />
    </div>
  );
}
