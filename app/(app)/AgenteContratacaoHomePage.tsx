import { prisma } from "@/lib/prisma";

export default async function AgenteContratacaoHomePage({ agenteContratacaoId }: { agenteContratacaoId: string }) {
  const acesso = await prisma.agenteContratacao.findUniqueOrThrow({ where: { id: agenteContratacaoId } });

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-slate-900">Agente de Contratação</h1>
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
        <p className="text-sm text-slate-600">
          <span className="font-medium text-slate-900">{acesso.nome}</span> — matrícula {acesso.matricula},{" "}
          {acesso.funcao}
        </p>
        <p className="mt-3 rounded-md bg-slate-100 px-4 py-3 text-sm text-slate-700">
          Login do Agente de Contratação pronto. A tela de elaboração da Minuta de Edital, a
          partir do ETP e do Termo de Referência, e a condução dos certames designados, serão
          adicionadas em seguida.
        </p>
      </div>
    </div>
  );
}
