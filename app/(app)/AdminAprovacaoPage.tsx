import { prisma } from "@/lib/prisma";
import PendentesTabela from "./PendentesTabela";

export default async function AdminAprovacaoPage() {
  const [pendentes, historico] = await Promise.all([
    prisma.dfd.findMany({
      where: { status: "AGUARDANDO_APROVACAO" },
      include: { unidade: true, itens: true, prioridade: true },
      orderBy: { enviadoParaAprovacaoEm: "asc" },
    }),
    prisma.dfd.findMany({
      where: { status: { in: ["APROVADO", "REPROVADO"] } },
      include: { unidade: true, itens: true },
      orderBy: { updatedAt: "desc" },
      take: 30,
    }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-slate-900">
        Aprovação de DFDs ({pendentes.length} pendentes)
      </h1>
      <p className="text-sm text-slate-500">
        A cota orçamentária já é reservada assim que o DFD é enviado, mesmo antes da aprovação.
      </p>

      <PendentesTabela
        pendentes={pendentes.map((d) => ({
          id: d.id,
          descricaoSumaria: d.descricaoSumaria,
          unidadeNome: d.unidade.nome,
          prioridadeFrase: d.prioridade.frase,
          totalItens: d.itens.length,
          totalValor: d.itens.reduce((s, it) => s + Number(it.valorTotal), 0),
          enviadoParaAprovacaoEm: d.enviadoParaAprovacaoEm,
        }))}
      />

      {historico.length > 0 && (
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
          <h2 className="mb-2 text-sm font-semibold text-slate-900">Histórico recente</h2>
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr>
                <th className="py-1 font-medium">Descrição</th>
                <th className="py-1 font-medium">Unidade</th>
                <th className="py-1 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {historico.map((d) => (
                <tr key={d.id}>
                  <td className="py-1 text-slate-900">{d.descricaoSumaria}</td>
                  <td className="py-1 text-slate-600">{d.unidade.nome}</td>
                  <td className="py-1 text-slate-600">
                    {d.status === "APROVADO" ? "Aprovado" : `Reprovado — ${d.motivoReprovacao}`}
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
