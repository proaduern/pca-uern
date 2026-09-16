import { prisma } from "@/lib/prisma";
import { exigirUnidade } from "@/lib/auth";
import DadosUnidadeForm from "./DadosUnidadeForm";
import SetoresInternosSection from "./SetoresInternosSection";

export default async function DadosUnidadePage() {
  const sessao = await exigirUnidade();
  const [unidade, setores] = await Promise.all([
    prisma.unidade.findUniqueOrThrow({ where: { id: sessao.id } }),
    prisma.setorInterno.findMany({
      where: { unidadeId: sessao.id },
      orderBy: { nome: "asc" },
    }),
  ]);

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
      <SetoresInternosSection
        setores={setores.map((s) => ({
          id: s.id,
          nome: s.nome,
          email: s.email,
          cotaOP: Number(s.cotaOP),
          cotaGeral: Number(s.cotaGeral),
          ativo: s.ativo,
        }))}
      />
    </div>
  );
}
