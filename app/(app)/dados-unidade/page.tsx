import { prisma } from "@/lib/prisma";
import { exigirUnidade } from "@/lib/auth";
import SetoresInternosSection from "./SetoresInternosSection";

export default async function DadosUnidadePage() {
  const sessao = await exigirUnidade();
  const setores = await prisma.setorInterno.findMany({
    where: { unidadeId: sessao.id },
    orderBy: { nome: "asc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-slate-900">Dados da unidade</h1>
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
