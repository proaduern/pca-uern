import { prisma } from "@/lib/prisma";
import { brl } from "@/lib/formato";
import { itensElegiveisAtendimentoEstoque, trocasOPParaVerificarDisponibilidade } from "@/lib/actions/estoque";
import TrocaOPDisponibilidadeBotoes from "./TrocaOPDisponibilidadeBotoes";
import ProporAtendimentoEstoqueBotao from "./ProporAtendimentoEstoqueBotao";

export default async function PatrimonioAtendimentoEstoque({ acessoEntregaId }: { acessoEntregaId: string }) {
  const [trocasParaVerificar, elegiveis, meusPendentes, rejeitados] = await Promise.all([
    trocasOPParaVerificarDisponibilidade(),
    itensElegiveisAtendimentoEstoque(),
    prisma.atendimentoEstoque.findMany({
      where: { status: "PENDENTE_PROAD", solicitadoPorId: acessoEntregaId },
      include: { itemDfd: { include: { dfd: { include: { unidade: true } } } } },
      orderBy: { solicitadoEm: "asc" },
    }),
    prisma.atendimentoEstoque.findMany({
      where: { status: "REJEITADO" },
      include: { itemDfd: { include: { dfd: { include: { unidade: true } } } } },
      orderBy: { analisadoEm: "desc" },
    }),
  ]);

  return (
    <>
      {trocasParaVerificar.length > 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
          <h2 className="mb-1 text-sm font-semibold text-slate-900">
            Trocas de Item (OP) — Verificar Disponibilidade ({trocasParaVerificar.length})
          </h2>
          <p className="mb-3 text-xs text-slate-500">
            A PROAD encaminhou estas solicitações de troca. Confirme se você tem o item pretendido disponível
            em estoque.
          </p>
          <div className="space-y-3">
            {trocasParaVerificar.map((t) => (
              <div key={t.id} className="flex items-start justify-between gap-3 rounded-md border border-slate-200 p-3">
                <div>
                  <p className="font-medium text-slate-900">{t.itemBNome}</p>
                  <p className="text-xs text-slate-500">
                    Categoria: {t.itemBCategoria.nome} · Em substituição a: {t.itemDfd.itemCatalogoNome ?? t.itemDfd.itemNomeLivre} · Unidade:{" "}
                    {t.itemDfd.dfd.unidade.nome}
                  </p>
                </div>
                <TrocaOPDisponibilidadeBotoes trocaId={t.id} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
        <h2 className="mb-1 text-sm font-semibold text-slate-900">Propor Atendimento Imediato por Estoque (itens OP)</h2>
        <p className="mb-3 text-xs text-slate-500">
          Se você já dispõe em estoque de item equivalente ao que foi consolidado pelo setor técnico para uma
          demanda OP, pode propor o atendimento imediato — sem esperar o fim da licitação. A PROAD analisa e
          autoriza antes de qualquer efeito.
        </p>
        {elegiveis.length === 0 ? (
          <p className="text-sm text-slate-400">Nenhum item OP consolidado, elegível para atendimento por estoque, no momento.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="py-1 pr-2 font-medium">Item</th>
                  <th className="py-1 pr-2 font-medium">Unidade Demandante</th>
                  <th className="py-1 pr-2 font-medium">Categoria</th>
                  <th className="py-1 pr-2 font-medium">Qtd</th>
                  <th className="py-1 pr-2 font-medium">Valor</th>
                  <th className="py-1 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {elegiveis.map((it) => (
                  <tr key={it.id}>
                    <td className="py-1.5 pr-2 text-slate-900">{it.itemCatalogoNome ?? it.itemNomeLivre}</td>
                    <td className="py-1.5 pr-2 text-xs text-slate-500">{it.dfd.unidade.nome}</td>
                    <td className="py-1.5 pr-2 text-xs text-slate-600">{it.categoria.nome}</td>
                    <td className="py-1.5 pr-2 text-slate-600">{Number(it.quantidade ?? 1)}</td>
                    <td className="py-1.5 pr-2 text-slate-600">{brl(it.valorTotal)}</td>
                    <td className="py-1.5">
                      <ProporAtendimentoEstoqueBotao itemDfdId={it.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {meusPendentes.length > 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">
            Minhas Propostas — Aguardando Análise da PROAD ({meusPendentes.length})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="py-1 pr-2 font-medium">Item</th>
                  <th className="py-1 pr-2 font-medium">Unidade Demandante</th>
                  <th className="py-1 font-medium">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {meusPendentes.map((p) => (
                  <tr key={p.id}>
                    <td className="py-1.5 pr-2 text-slate-900">{p.itemDfd.itemCatalogoNome ?? p.itemDfd.itemNomeLivre}</td>
                    <td className="py-1.5 pr-2 text-xs text-slate-500">{p.itemDfd.dfd.unidade.nome}</td>
                    <td className="py-1.5 text-slate-600">{brl(p.itemDfd.valorTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {rejeitados.length > 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Propostas Rejeitadas pela PROAD ({rejeitados.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="py-1 pr-2 font-medium">Item</th>
                  <th className="py-1 pr-2 font-medium">Unidade Demandante</th>
                  <th className="py-1 font-medium">Motivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rejeitados.map((p) => (
                  <tr key={p.id}>
                    <td className="py-1.5 pr-2 text-slate-900">{p.itemDfd.itemCatalogoNome ?? p.itemDfd.itemNomeLivre}</td>
                    <td className="py-1.5 pr-2 text-xs text-slate-500">{p.itemDfd.dfd.unidade.nome}</td>
                    <td className="py-1.5 text-slate-600">{p.motivoRejeicao || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
