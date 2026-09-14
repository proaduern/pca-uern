import { prisma } from "@/lib/prisma";
import { formatarDataHora } from "@/lib/formato";
import SolicitarExecucaoAtaBotao from "./gestor-ata/SolicitarExecucaoAtaBotao";

export default async function GestorAtaHomePage() {
  const todosProcessosAta = await prisma.consolidacaoTecnica.findMany({
    where: { tipoContratacao: "ATA" },
    include: { categoria: true, statusLicitacao: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
  });
  const processos = todosProcessosAta.filter((c) => c.statusLicitacao[0]?.status === "REMETIDO_GESTOR_ATA");

  const emAndamento = processos.filter((c) => !c.solicitacaoExecucaoAtaEm);
  const aguardandoProad = processos.filter((c) => c.solicitacaoExecucaoAtaEm && !c.ataAutorizadaEm);

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-slate-900">Painel da Unidade Gestora de Ata</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
          <p className="text-xs text-slate-500">Atas recebidas da Licitação</p>
          <p className="text-xl font-semibold text-slate-900">{processos.length}</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-white p-4">
          <p className="text-xs text-slate-500">Aguardando autorização da PROAD</p>
          <p className="text-xl font-semibold text-amber-700">{aguardandoProad.length}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
        <h2 className="mb-1 text-sm font-semibold text-slate-900">
          Atas Recebidas — Solicitar Autorização de Execução ({emAndamento.length})
        </h2>
        <p className="mb-3 text-xs text-slate-500">
          Estes processos foram remetidos pela Licitação por serem Ata de Registro de Preços. Solicite à
          PROAD a autorização para iniciar a execução — assim que autorizada, o processo é encaminhado
          automaticamente para a Unidade de Compras.
        </p>
        {emAndamento.length === 0 ? (
          <p className="text-sm text-slate-400">Nenhuma ata pendente de solicitação no momento.</p>
        ) : (
          <div className="space-y-3">
            {emAndamento.map((c) => (
              <div key={c.id} className="flex items-start justify-between gap-3 rounded-md border border-slate-200 p-3">
                <div>
                  <p className="font-medium text-slate-900">{c.categoria.nome}</p>
                  <p className="text-xs text-slate-500">Processo SEI: {c.processoSEI}</p>
                </div>
                <SolicitarExecucaoAtaBotao consolidacaoId={c.id} />
              </div>
            ))}
          </div>
        )}
      </div>

      {aguardandoProad.length > 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Aguardando Autorização da PROAD ({aguardandoProad.length})</h2>
          <div className="space-y-2">
            {aguardandoProad.map((c) => (
              <div key={c.id} className="rounded-md border border-slate-200 p-3">
                <p className="font-medium text-slate-900">{c.categoria.nome}</p>
                <p className="text-xs text-slate-500">
                  Processo SEI: {c.processoSEI} · Solicitado em {formatarDataHora(c.solicitacaoExecucaoAtaEm)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
