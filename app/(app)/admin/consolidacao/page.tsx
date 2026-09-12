import { prisma } from "@/lib/prisma";
import { exigirAdminNaPagina } from "@/lib/auth";
import { brl } from "@/lib/formato";
import ExportarCsvBotao from "./ExportarCsvBotao";

const STATUS_COMPROMETEM_ORCAMENTO = ["AGUARDANDO_APROVACAO", "APROVADO"] as const;

export default async function ConsolidacaoGeralPage() {
  await exigirAdminNaPagina();

  const pca = await prisma.pca.findFirst({ where: { ativo: true } });

  if (!pca) {
    return (
      <div className="space-y-6">
        <h1 className="text-lg font-semibold text-slate-900">Consolidação Geral do PCA</h1>
        <div className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Nenhum PCA ativo — cadastre e ative um Plano de Contratações Anual na aba PCA para ver os
          valores globais aqui.
        </div>
      </div>
    );
  }

  const itens = await prisma.itemDfd.findMany({
    where: { dfd: { ano: pca.ano, status: { in: [...STATUS_COMPROMETEM_ORCAMENTO] } } },
    include: { categoria: true },
  });

  const naoConvenio = itens.filter((it) => it.enquadramento !== "CONVENIO");
  const totalConsolidado = naoConvenio.reduce((s, it) => s + Number(it.valorTotal), 0);
  const saldoDisponivel = Number(pca.cotaGeral) - totalConsolidado;

  function agruparPorCategoria(tipo: "MATERIAL" | "SERVICO") {
    const mapa = new Map<string, number>();
    for (const it of naoConvenio) {
      if (it.categoria.tipo !== tipo) continue;
      mapa.set(it.categoria.nome, (mapa.get(it.categoria.nome) ?? 0) + Number(it.valorTotal));
    }
    return [...mapa.entries()].sort((a, b) => b[1] - a[1]);
  }

  const materiaisPorCategoria = agruparPorCategoria("MATERIAL");
  const servicosPorCategoria = agruparPorCategoria("SERVICO");

  const linhasCsv: string[][] = [
    ["Categoria", "Tipo", "Valor Total Consolidado"],
    ...materiaisPorCategoria.map(([cat, v]) => [cat, "Material", v.toFixed(2)]),
    ...servicosPorCategoria.map(([cat, v]) => [cat, "Serviço", v.toFixed(2)]),
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-slate-900">
        Consolidação Geral do PCA — Ano {pca.ano}
      </h1>
      <p className="text-sm text-slate-500">
        Calculada a partir de todos os DFDs já enviados ou aprovados (itens de convênio são
        recurso externo e não entram nestes totais).
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Valor Global Cadastrado (Cota PCA Geral)</p>
          <p className="text-xl font-semibold text-slate-900">{brl(pca.cotaGeral)}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Total Já Consolidado</p>
          <p className="text-xl font-semibold text-slate-900">{brl(totalConsolidado)}</p>
          <p className="text-xs text-slate-400">
            {((totalConsolidado / Math.max(1, Number(pca.cotaGeral))) * 100).toFixed(1)}% da cota
            geral
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="text-xs text-slate-500">Saldo Disponível</p>
          <p
            className={`text-xl font-semibold ${saldoDisponivel < 0 ? "text-red-600" : "text-slate-900"}`}
          >
            {brl(saldoDisponivel)}
          </p>
        </div>
      </div>

      <div>
        <ExportarCsvBotao nomeArquivo={`consolidacao-pca-${pca.ano}.csv`} linhas={linhasCsv} />
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-900">Materiais por Categoria</h2>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Categoria</th>
                <th className="px-4 py-2 font-medium">Valor Total Consolidado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {materiaisPorCategoria.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-4 py-6 text-center text-slate-400">
                    Nenhum material consolidado.
                  </td>
                </tr>
              ) : (
                materiaisPorCategoria.map(([cat, v]) => (
                  <tr key={cat}>
                    <td className="px-4 py-2 text-slate-900">{cat}</td>
                    <td className="px-4 py-2 text-slate-600">{brl(v)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-900">Serviços por Categoria</h2>
        <p className="mb-2 text-xs text-slate-500">
          Inclui Diárias, Passagens e Hospedagens, além das demais categorias de serviço.
        </p>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Categoria</th>
                <th className="px-4 py-2 font-medium">Valor Total Consolidado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {servicosPorCategoria.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-4 py-6 text-center text-slate-400">
                    Nenhum serviço consolidado.
                  </td>
                </tr>
              ) : (
                servicosPorCategoria.map(([cat, v]) => (
                  <tr key={cat}>
                    <td className="px-4 py-2 text-slate-900">{cat}</td>
                    <td className="px-4 py-2 text-slate-600">{brl(v)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
