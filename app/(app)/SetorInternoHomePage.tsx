import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { brl } from "@/lib/formato";
import { calcularGastos, dfdComprometeOrcamento } from "@/lib/cota";
import { resolverPcaEmAtuacao } from "@/lib/pca-contexto";
import NovaDemandaBotao from "./NovaDemandaBotao";

const STATUS_LABEL: Record<string, string> = {
  RASCUNHO: "Rascunho",
  AGUARDANDO_APROVACAO: "Aguardando aprovação",
  APROVADO: "Aprovado",
  REPROVADO: "Reprovado",
};

export default async function SetorInternoHomePage({ setorInternoId }: { setorInternoId: string }) {
  const [setor, contextoPca, dfds] = await Promise.all([
    prisma.setorInterno.findUniqueOrThrow({ where: { id: setorInternoId }, include: { unidade: true } }),
    resolverPcaEmAtuacao({ id: setorInternoId, tipo: "SETOR_INTERNO" }),
    prisma.dfd.findMany({
      where: { setorInternoId },
      include: { itens: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const pcaAtivo = contextoPca.status === "resolvido" ? contextoPca.pca : null;

  const itensComprometidos = dfds
    .filter((d) => dfdComprometeOrcamento(d.status))
    .flatMap((d) => d.itens)
    .map((it) => ({ enquadramento: it.enquadramento, valorTotal: Number(it.valorTotal) }));
  const gastos = calcularGastos(itensComprometidos);

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-slate-900">
        {setor.nome} — {setor.unidade.nome}
      </h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Number(setor.cotaOP) > 0 && (
          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
            <p className="text-xs text-slate-500">Cota OP disponível (do setor)</p>
            <p className="text-xl font-semibold text-slate-900">{brl(Number(setor.cotaOP) - gastos.op)}</p>
            <p className="text-xs text-slate-400">de {brl(setor.cotaOP)}</p>
          </div>
        )}
        {Number(setor.cotaGeral) > 0 && (
          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
            <p className="text-xs text-slate-500">Cota Geral disponível (do setor)</p>
            <p className="text-xl font-semibold text-slate-900">{brl(Number(setor.cotaGeral) - gastos.geral)}</p>
            <p className="text-xs text-slate-400">de {brl(setor.cotaGeral)}</p>
          </div>
        )}
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
            Documentos de Formalização de Demanda (DFD) deste setor
          </h2>
          {pcaAtivo && <NovaDemandaBotao />}
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Descrição</th>
              <th className="px-4 py-2 font-medium">PCA</th>
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
                    {d.status === "RASCUNHO" && d.enviadoParaUnidadeEm && (
                      <div className="text-xs text-amber-600">Aguardando revisão da unidade</div>
                    )}
                  </td>
                  <td className="px-4 py-2 text-slate-600">{d.ano}</td>
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
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  Nenhum DFD lançado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
