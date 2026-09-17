import { prisma } from "@/lib/prisma";
import { exigirAdminNaPagina } from "@/lib/auth";
import { brl } from "@/lib/formato";
import RevisaoSolicitacaoCotaGeralForm from "./RevisaoSolicitacaoCotaGeralForm";

export default async function SolicitacoesCotaGeralPage() {
  await exigirAdminNaPagina();

  const [pendentes, historico] = await Promise.all([
    prisma.solicitacaoAutorizacaoCotaGeral.findMany({
      where: { status: "PENDENTE" },
      include: {
        unidade: true,
        categoria: true,
        itemCatalogo: true,
        dfd: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.solicitacaoAutorizacaoCotaGeral.findMany({
      where: { status: { not: "PENDENTE" } },
      include: { unidade: true, categoria: true, itemCatalogo: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-slate-900">
        Solicitações de Cota Geral (unidades OP)
      </h1>
      <p className="text-sm text-slate-500">
        Pedidos de autorização para lançar, em Cota Geral, itens fora da
        liberação padrão de unidades elegíveis à Cota OP (ver toggles em
        Categorias/Catálogo). Ao aceitar, o item é incluído diretamente no DFD
        de origem.
      </p>

      <div className="space-y-3 rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
        <h2 className="text-sm font-semibold text-slate-900">
          Pendentes de Análise ({pendentes.length})
        </h2>
        {pendentes.length === 0 ? (
          <p className="text-sm text-slate-400">
            Nenhuma solicitação pendente no momento.
          </p>
        ) : (
          pendentes.map((s) => (
            <RevisaoSolicitacaoCotaGeralForm
              key={s.id}
              solicitacao={{
                id: s.id,
                categoriaNome: s.categoria.nome,
                itemNome: s.itemCatalogo?.item ?? s.itemNomeLivre ?? "—",
                quantidade: s.quantidade ? Number(s.quantidade) : null,
                valorTotal: Number(s.valorTotal),
                correlacao: s.correlacao,
                justificativa: s.justificativa,
                createdAt: s.createdAt.toISOString(),
              }}
              unidade={s.unidade ? { nome: s.unidade.nome } : null}
              dfdDescricao={s.dfd?.descricaoSumaria ?? null}
            />
          ))
        )}
      </div>

      {historico.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4">
            <h2 className="text-sm font-semibold text-slate-900">
              Histórico de Solicitações ({historico.length})
            </h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Item</th>
                <th className="px-4 py-2 font-medium">Unidade</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Detalhe</th>
                <th className="px-4 py-2 font-medium">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {historico.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-2 text-slate-900">
                    {s.itemCatalogo?.item ?? s.itemNomeLivre ?? "—"}
                    <div className="text-[11px] text-slate-400">
                      {s.categoria.nome}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {s.unidade?.nome ?? "—"}
                  </td>
                  <td className="px-4 py-2">
                    {s.status === "ACEITO" ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs text-emerald-700">
                        Aceita
                      </span>
                    ) : (
                      <span className="rounded-full bg-red-100 px-2 py-1 text-xs text-red-700">
                        Rejeitada
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {s.status === "REJEITADO"
                      ? s.motivoRejeicao || "—"
                      : "Incluído no DFD"}
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {brl(s.valorTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
