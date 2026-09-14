import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { brl } from "@/lib/formato";
import { calcularGastos, dfdComprometeOrcamento } from "@/lib/cota";
import { criarRascunhoDfdAction } from "@/lib/actions/dfd";

const STATUS_LABEL: Record<string, string> = {
  RASCUNHO: "Rascunho",
  AGUARDANDO_APROVACAO: "Aguardando aprovação",
  APROVADO: "Aprovado",
  REPROVADO: "Reprovado",
};

const STATUS_SOLICITACAO_LABEL: Record<string, string> = {
  PENDENTE: "Em análise",
  ACEITO: "Aceita — no catálogo",
  REJEITADO: "Rejeitada",
};

export default async function UnidadeDfdListPage({ unidadeId }: { unidadeId: string }) {
  const [unidade, pcaAtivo, dfds, solicitacoesCatalogo] = await Promise.all([
    prisma.unidade.findUniqueOrThrow({ where: { id: unidadeId } }),
    prisma.pca.findFirst({ where: { ativo: true } }),
    prisma.dfd.findMany({
      where: { unidadeId },
      include: { itens: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.solicitacaoCatalogo.findMany({
      where: { unidadeId },
      include: { categoriaFinal: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const itensComprometidos = dfds
    .filter((d) => dfdComprometeOrcamento(d.status))
    .flatMap((d) => d.itens)
    .map((it) => ({ enquadramento: it.enquadramento, valorTotal: Number(it.valorTotal) }));
  const gastos = calcularGastos(itensComprometidos);

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-slate-900">Painel da Unidade — {unidade.nome}</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {unidade.elegivelCotaOP && (
          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
            <p className="text-xs text-slate-500">Cota OP disponível</p>
            <p className="text-xl font-semibold text-slate-900">
              {brl(Number(unidade.cotaOP) - gastos.op)}
            </p>
            <p className="text-xs text-slate-400">de {brl(unidade.cotaOP)}</p>
          </div>
        )}
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
          <p className="text-xs text-slate-500">Cota Geral disponível</p>
          <p className="text-xl font-semibold text-slate-900">
            {brl(Number(unidade.cotaGeral) - gastos.geral)}
          </p>
          <p className="text-xs text-slate-400">de {brl(unidade.cotaGeral)}</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
          <p className="text-xs text-slate-500">PCA ativo</p>
          <p className="text-xl font-semibold text-slate-900">{pcaAtivo?.ano ?? "—"}</p>
        </div>
      </div>

      {!pcaAtivo && (
        <div className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Nenhum PCA ativo no momento. Aguarde a liberação da PROAD.
        </div>
      )}

      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 p-4">
          <h2 className="text-sm font-semibold text-slate-900">
            Meus Documentos de Formalização de Demanda (DFD)
          </h2>
          {pcaAtivo && (
            <form action={criarRascunhoDfdAction}>
              <button className="rounded-xl bg-[#003366] px-3 py-2 text-sm font-medium text-white hover:bg-[#002244]">
                + Nova Demanda (DFD)
              </button>
            </form>
          )}
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Descrição</th>
              <th className="px-4 py-2 font-medium">Itens</th>
              <th className="px-4 py-2 font-medium">Valor</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {dfds.map((d) => {
              const total = d.itens.reduce((s, it) => s + Number(it.valorTotal), 0);
              return (
                <tr key={d.id}>
                  <td className="px-4 py-2 text-slate-900">
                    {d.descricaoSumaria || <span className="text-slate-400">(sem descrição)</span>}
                    {d.status === "REPROVADO" && (
                      <div className="text-xs text-red-600">Motivo: {d.motivoReprovacao}</div>
                    )}
                  </td>
                  <td className="px-4 py-2 text-slate-600">{d.itens.length}</td>
                  <td className="px-4 py-2 text-slate-600">{brl(total)}</td>
                  <td className="px-4 py-2">
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                      {STATUS_LABEL[d.status]}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <Link href={`/dfd/${d.id}`} className="text-xs text-slate-700 underline">
                      {d.status === "RASCUNHO" || d.status === "REPROVADO" ? "Continuar" : "Ver"}
                    </Link>
                  </td>
                </tr>
              );
            })}
            {dfds.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                  Nenhum DFD lançado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {solicitacoesCatalogo.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-4">
            <h2 className="text-sm font-semibold text-slate-900">
              Minhas Solicitações de Novo Item de Catálogo
            </h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Item solicitado</th>
                <th className="px-4 py-2 font-medium">Valor estimado</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Observação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {solicitacoesCatalogo.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-2 text-slate-900">{s.nomeResumido}</td>
                  <td className="px-4 py-2 text-slate-600">{brl(s.valorEstimado)}</td>
                  <td className="px-4 py-2">
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                      {STATUS_SOLICITACAO_LABEL[s.status]}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {s.status === "ACEITO"
                      ? `Incluído como "${s.itemFinal}" em ${s.categoriaFinal?.nome ?? "—"}`
                      : s.status === "REJEITADO"
                        ? s.motivoRejeicao || "—"
                        : "—"}
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
