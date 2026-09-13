import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { statusEntregaLabel, subperfilBensPorTipo } from "@/lib/entrega";
import { itensAguardandoAutorizacaoEntrega } from "@/lib/actions/entrega";
import AnaliseContestacaoForm from "./entrega/AnaliseContestacaoForm";

export default async function EntregaHomePage({ acessoEntregaId }: { acessoEntregaId: string }) {
  const acesso = await prisma.acessoEntrega.findUniqueOrThrow({ where: { id: acessoEntregaId } });

  const [aguardandoProad, minhasEntregas] = await Promise.all([
    itensAguardandoAutorizacaoEntrega(),
    prisma.entrega.findMany({
      where: { subperfilBens: acesso.subperfil },
      include: { unidade: true, statusEntrega: { orderBy: { createdAt: "desc" }, take: 1 }, confirmacoes: { orderBy: { createdAt: "desc" }, take: 1 } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const aguardandoProadDoSubperfil = aguardandoProad.filter((it) => subperfilBensPorTipo(it.tipoBem) === acesso.subperfil);
  const entregues = minhasEntregas.filter((e) => e.statusEntrega[0]?.status === "ENTREGUE").length;
  const contestacoesPendentes = minhasEntregas.filter((e) => e.confirmacoes[0]?.status === "CONTESTACAO_PENDENTE_ENTREGA");

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-slate-900">Painel da Unidade de Entrega de Bens</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Itens recebidos, aguardando autorização da PROAD</p>
          <p className="text-xl font-semibold text-slate-900">{aguardandoProadDoSubperfil.length}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Entregas em acompanhamento</p>
          <p className="text-xl font-semibold text-slate-900">{minhasEntregas.length}</p>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-white p-4">
          <p className="text-xs text-slate-500">Já entregues ao destinatário</p>
          <p className="text-xl font-semibold text-emerald-700">{entregues}</p>
        </div>
      </div>

      {contestacoesPendentes.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">
            Contestações Recebidas — Aguardando Sua Análise ({contestacoesPendentes.length})
          </h2>
          <p className="mb-3 text-xs text-slate-500">
            O demandante contestou a entrega marcada como &quot;Entregue ao Destinatário&quot;. Analise o
            motivo e decida se a contestação procede.
          </p>
          <div className="space-y-3">
            {contestacoesPendentes.map((e) => (
              <div key={e.id} className="rounded-md border border-slate-200 p-3">
                <p className="font-medium text-slate-900">{e.itemNome}</p>
                <p className="text-xs text-slate-500">Unidade: {e.unidade?.nome ?? "—"}</p>
                <p className="mt-1 text-xs italic text-slate-600">
                  Motivo da contestação: {e.confirmacoes[0]?.contestacaoMotivo}
                </p>
                <AnaliseContestacaoForm entregaId={e.id} />
              </div>
            ))}
          </div>
        </div>
      )}

      {aguardandoProadDoSubperfil.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-100 p-4">
            <h2 className="text-sm font-semibold text-slate-900">
              Itens Recebidos — Aguardando Autorização da PROAD ({aguardandoProadDoSubperfil.length})
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Estes itens já foram recebidos em definitivo pela Execução, mas a entrega só pode começar depois
              que a PROAD autorizar.
            </p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Item</th>
                <th className="px-4 py-2 font-medium">Destinatário</th>
                <th className="px-4 py-2 font-medium">Enquadramento</th>
                <th className="px-4 py-2 font-medium">Processo SEI Execução</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {aguardandoProadDoSubperfil.map((it) => (
                <tr key={it.id}>
                  <td className="px-4 py-2 text-slate-900">{it.itemCatalogoNome ?? it.itemNomeLivre}</td>
                  <td className="px-4 py-2 text-xs text-slate-500">{it.dfd.unidade.nome}</td>
                  <td className="px-4 py-2 text-xs text-slate-600">{it.enquadramento}</td>
                  <td className="px-4 py-2 text-xs text-slate-600">{it.processoExecucao?.processoSEIExecucao ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-100 p-4">
          <h2 className="text-sm font-semibold text-slate-900">Minhas Entregas ({minhasEntregas.length})</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Item</th>
              <th className="px-4 py-2 font-medium">Unidade Demandante</th>
              <th className="px-4 py-2 font-medium">Enquadramento</th>
              <th className="px-4 py-2 font-medium">Status Atual</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {minhasEntregas.map((e) => (
              <tr key={e.id} className="cursor-pointer hover:bg-slate-50">
                <td className="px-4 py-2 text-slate-900">
                  <Link href={`/entrega/${e.id}`} className="block font-medium">
                    {e.itemNome}
                    {e.viaEstoque && (
                      <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-normal text-slate-600">
                        Estoque
                      </span>
                    )}
                  </Link>
                </td>
                <td className="px-4 py-2 text-xs text-slate-500">{e.unidade?.nome ?? "—"}</td>
                <td className="px-4 py-2 text-xs text-slate-600">{e.enquadramento}</td>
                <td className="px-4 py-2">
                  <span
                    className={`rounded-full px-2 py-1 text-xs ${e.statusEntrega[0]?.status === "ENTREGUE" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
                  >
                    {statusEntregaLabel(e.statusEntrega[0]?.status ?? null)}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <Link href={`/entrega/${e.id}`} className="text-xs text-slate-700 underline">
                    Abrir
                  </Link>
                </td>
              </tr>
            ))}
            {minhasEntregas.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  Nenhuma entrega em acompanhamento ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
