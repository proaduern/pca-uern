import { prisma } from "@/lib/prisma";

export default async function PlanejamentoHomePage({ planejamentoId }: { planejamentoId: string }) {
  const acesso = await prisma.planejamento.findUniqueOrThrow({ where: { id: planejamentoId } });

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-slate-900">Planejamento</h1>
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
        <p className="text-sm text-slate-600">
          <span className="font-medium text-slate-900">{acesso.nome}</span> — matrícula {acesso.matricula},{" "}
          {acesso.funcao}
        </p>
        <p className="mt-3 rounded-md bg-slate-100 px-4 py-3 text-sm text-slate-700">
          Login do subsetor de Planejamento pronto. A tela de elaboração do Termo de Referência,
          a partir do ETP e da Pesquisa de Preços, será adicionada em seguida.
        </p>
      </div>
    </div>
  );
}
