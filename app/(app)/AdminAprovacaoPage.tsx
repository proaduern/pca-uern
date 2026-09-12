import { prisma } from "@/lib/prisma";
import { brl, formatarDataHora } from "@/lib/formato";
import AprovacaoAcoes from "./AprovacaoAcoes";

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

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Descrição</th>
              <th className="px-4 py-2 font-medium">Unidade</th>
              <th className="px-4 py-2 font-medium">Prioridade</th>
              <th className="px-4 py-2 font-medium">Itens</th>
              <th className="px-4 py-2 font-medium">Valor</th>
              <th className="px-4 py-2 font-medium">Enviado em</th>
              <th className="px-4 py-2 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pendentes.map((d) => {
              const total = d.itens.reduce((s, it) => s + Number(it.valorTotal), 0);
              return (
                <tr key={d.id}>
                  <td className="px-4 py-2 text-slate-900">{d.descricaoSumaria}</td>
                  <td className="px-4 py-2 text-slate-600">{d.unidade.nome}</td>
                  <td className="px-4 py-2 text-slate-600">{d.prioridade.frase}</td>
                  <td className="px-4 py-2 text-slate-600">{d.itens.length}</td>
                  <td className="px-4 py-2 text-slate-600">{brl(total)}</td>
                  <td className="px-4 py-2 text-slate-600">
                    {formatarDataHora(d.enviadoParaAprovacaoEm)}
                  </td>
                  <td className="px-4 py-2">
                    <AprovacaoAcoes dfdId={d.id} />
                  </td>
                </tr>
              );
            })}
            {pendentes.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                  Nenhum DFD aguardando aprovação.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {historico.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
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
