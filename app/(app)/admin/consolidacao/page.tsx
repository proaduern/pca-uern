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

  const itensDoPca = itens.filter((it) => !it.categoria.ignoraPCA);

  let totalFonte500Geral = 0;
  let totalFonte500OP = 0;
  let totalConvenios = 0;
  let totalOutrasFontes = 0;

  for (const it of itensDoPca) {
    const val = Number(it.valorTotal);
    if (it.enquadramento === "CONVENIO") totalConvenios += val;
    else if (it.enquadramento === "RECURSOS_EXTRA") totalOutrasFontes += val;
    else if (it.enquadramento === "OP") totalFonte500OP += val;
    else totalFonte500Geral += val;
  }

  const totalFonte500 = totalFonte500Geral + totalFonte500OP;
  const totalConveniosEOutras = totalConvenios + totalOutrasFontes;
  const totalGeralPca = totalFonte500 + totalConveniosEOutras;
  const saldoDisponivel = Number(pca.cotaGeral) - totalFonte500;

  interface ResumoCategoriaPorFonte {
    categoria: string;
    fonte500Geral: number;
    fonte500OP: number;
    fonte500: number;
    convenios: number;
    outrasFontes: number;
    totalGeral: number;
  }

  function agruparPorCategoria(tipo: "MATERIAL" | "SERVICO"): ResumoCategoriaPorFonte[] {
    const mapa = new Map<string, ResumoCategoriaPorFonte>();
    for (const it of itensDoPca) {
      if (it.categoria.tipo !== tipo) continue;
      const nomeCat = it.categoria.nome;
      const atual = mapa.get(nomeCat) ?? {
        categoria: nomeCat,
        fonte500Geral: 0,
        fonte500OP: 0,
        fonte500: 0,
        convenios: 0,
        outrasFontes: 0,
        totalGeral: 0,
      };
      const val = Number(it.valorTotal);
      if (it.enquadramento === "CONVENIO") {
        atual.convenios += val;
      } else if (it.enquadramento === "RECURSOS_EXTRA") {
        atual.outrasFontes += val;
      } else if (it.enquadramento === "OP") {
        atual.fonte500OP += val;
        atual.fonte500 += val;
      } else {
        atual.fonte500Geral += val;
        atual.fonte500 += val;
      }
      atual.totalGeral += val;
      mapa.set(nomeCat, atual);
    }
    return [...mapa.values()].sort((a, b) => b.totalGeral - a.totalGeral);
  }

  const materiaisPorCategoria = agruparPorCategoria("MATERIAL");
  const servicosPorCategoria = agruparPorCategoria("SERVICO");

  const subtotalMateriais = materiaisPorCategoria.reduce(
    (acc, r) => ({
      fonte500: acc.fonte500 + r.fonte500,
      convenios: acc.convenios + r.convenios,
      outrasFontes: acc.outrasFontes + r.outrasFontes,
      totalGeral: acc.totalGeral + r.totalGeral,
    }),
    { fonte500: 0, convenios: 0, outrasFontes: 0, totalGeral: 0 },
  );

  const subtotalServicos = servicosPorCategoria.reduce(
    (acc, r) => ({
      fonte500: acc.fonte500 + r.fonte500,
      convenios: acc.convenios + r.convenios,
      outrasFontes: acc.outrasFontes + r.outrasFontes,
      totalGeral: acc.totalGeral + r.totalGeral,
    }),
    { fonte500: 0, convenios: 0, outrasFontes: 0, totalGeral: 0 },
  );

  const linhasCsv: string[][] = [
    [
      "Categoria",
      "Tipo",
      "Fonte 500 (Geral + OP)",
      "Fonte 500 Geral",
      "Fonte 500 OP",
      "Convênios",
      "Outras Fontes (Unidade)",
      "Total Consolidado (Geral)",
    ],
    ...materiaisPorCategoria.map((r) => [
      r.categoria,
      "Material",
      r.fonte500.toFixed(2),
      r.fonte500Geral.toFixed(2),
      r.fonte500OP.toFixed(2),
      r.convenios.toFixed(2),
      r.outrasFontes.toFixed(2),
      r.totalGeral.toFixed(2),
    ]),
    ...servicosPorCategoria.map((r) => [
      r.categoria,
      "Serviço",
      r.fonte500.toFixed(2),
      r.fonte500Geral.toFixed(2),
      r.fonte500OP.toFixed(2),
      r.convenios.toFixed(2),
      r.outrasFontes.toFixed(2),
      r.totalGeral.toFixed(2),
    ]),
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-slate-900">
        Resumo Orçamentário e Consolidação Geral do PCA — Ano {pca.ano}
      </h1>
      <p className="text-sm text-slate-500">
        Calculada a partir de todos os DFDs enviados ou aprovados, diferenciando os valores da{" "}
        <strong>Fonte 500</strong> (que consomem a cota orçamentária da UERN), de{" "}
        <strong>Convênios</strong> e de <strong>Outras Fontes</strong>, além do{" "}
        <strong>Total Geral Consolidado</strong> que vai para o PCA.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
          <p className="text-xs text-slate-500">Valor Global Cadastrado (Teto Fonte 500)</p>
          <p className="text-lg font-bold text-slate-900">{brl(pca.cotaGeral)}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Geral s/ OP: {brl(Number(pca.cotaGeral) - Number(pca.cotaOP))} • OP: {brl(pca.cotaOP)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
          <p className="text-xs text-slate-500">Consolidado Fonte 500 (Geral + OP)</p>
          <p className="text-lg font-bold text-slate-900">{brl(totalFonte500)}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Geral: <strong>{brl(totalFonte500Geral)}</strong> • OP: <strong>{brl(totalFonte500OP)}</strong>
          </p>
          <p className="text-[11px] text-slate-400">
            {((totalFonte500 / Math.max(1, Number(pca.cotaGeral))) * 100).toFixed(1)}% da cota global da Fonte 500
          </p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
          <p className="text-xs text-slate-500">Saldo Disponível (Fonte 500)</p>
          <p
            className={`text-lg font-bold ${saldoDisponivel < 0 ? "text-red-600" : "text-emerald-700"}`}
          >
            {brl(saldoDisponivel)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Teto Fonte 500 menos Consolidado Fonte 500
          </p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
          <p className="text-xs text-slate-500">Convênios e Outras Fontes</p>
          <p className="text-lg font-bold text-slate-900">{brl(totalConveniosEOutras)}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Convênios: <strong>{brl(totalConvenios)}</strong>
          </p>
          <p className="text-[11px] text-slate-400">
            Outras Fontes (Unidade): {brl(totalOutrasFontes)}
          </p>
        </div>

        <div className="rounded-2xl border border-[#003366]/20 bg-blue-50/50 shadow-sm p-4">
          <p className="text-xs font-semibold text-[#003366]">Total Geral Consolidado (PCA {pca.ano})</p>
          <p className="text-lg font-black text-[#003366]">{brl(totalGeralPca)}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Fonte 500 + Convênios + Outras Fontes
          </p>
        </div>
      </div>

      <div>
        <ExportarCsvBotao nomeArquivo={`consolidacao-pca-${pca.ano}.csv`} linhas={linhasCsv} />
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-900">
          Materiais por Categoria ({materiaisPorCategoria.length})
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-2.5 font-medium">Categoria</th>
                <th className="px-4 py-2.5 text-right font-medium">Fonte 500 (Geral + OP)</th>
                <th className="px-4 py-2.5 text-right font-medium">Convênios</th>
                <th className="px-4 py-2.5 text-right font-medium">Outras Fontes</th>
                <th className="px-4 py-2.5 text-right font-semibold text-slate-800">
                  Total Consolidado (Geral)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {materiaisPorCategoria.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                    Nenhum material consolidado.
                  </td>
                </tr>
              ) : (
                materiaisPorCategoria.map((r) => (
                  <tr key={r.categoria} className="hover:bg-slate-50/80">
                    <td className="px-4 py-2 text-slate-900 font-medium">{r.categoria}</td>
                    <td className="px-4 py-2 text-right text-slate-700 whitespace-nowrap">
                      {brl(r.fonte500)}
                    </td>
                    <td className="px-4 py-2 text-right text-slate-600 whitespace-nowrap">
                      {brl(r.convenios)}
                    </td>
                    <td className="px-4 py-2 text-right text-slate-600 whitespace-nowrap">
                      {brl(r.outrasFontes)}
                    </td>
                    <td className="px-4 py-2 text-right font-semibold text-slate-900 whitespace-nowrap">
                      {brl(r.totalGeral)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {materiaisPorCategoria.length > 0 && (
              <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-semibold text-slate-900">
                <tr>
                  <td className="px-4 py-2.5">Subtotal — Materiais</td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">
                    {brl(subtotalMateriais.fonte500)}
                  </td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">
                    {brl(subtotalMateriais.convenios)}
                  </td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">
                    {brl(subtotalMateriais.outrasFontes)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-bold text-[#003366] whitespace-nowrap">
                    {brl(subtotalMateriais.totalGeral)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-900">
          Serviços por Categoria ({servicosPorCategoria.length})
        </h2>
        <p className="mb-2 text-xs text-slate-500">
          Inclui Passagens, Hospedagens, Obras/Reformas e todas as demais categorias de serviço do PCA, diferenciando Fonte 500, Convênios, Outras Fontes e Total Geral.
        </p>
        <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-2.5 font-medium">Categoria</th>
                <th className="px-4 py-2.5 text-right font-medium">Fonte 500 (Geral + OP)</th>
                <th className="px-4 py-2.5 text-right font-medium">Convênios</th>
                <th className="px-4 py-2.5 text-right font-medium">Outras Fontes</th>
                <th className="px-4 py-2.5 text-right font-semibold text-slate-800">
                  Total Consolidado (Geral)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {servicosPorCategoria.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                    Nenhum serviço consolidado.
                  </td>
                </tr>
              ) : (
                servicosPorCategoria.map((r) => (
                  <tr key={r.categoria} className="hover:bg-slate-50/80">
                    <td className="px-4 py-2 text-slate-900 font-medium">{r.categoria}</td>
                    <td className="px-4 py-2 text-right text-slate-700 whitespace-nowrap">
                      {brl(r.fonte500)}
                    </td>
                    <td className="px-4 py-2 text-right text-slate-600 whitespace-nowrap">
                      {brl(r.convenios)}
                    </td>
                    <td className="px-4 py-2 text-right text-slate-600 whitespace-nowrap">
                      {brl(r.outrasFontes)}
                    </td>
                    <td className="px-4 py-2 text-right font-semibold text-slate-900 whitespace-nowrap">
                      {brl(r.totalGeral)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {servicosPorCategoria.length > 0 && (
              <tfoot className="border-t-2 border-slate-200 bg-slate-50 font-semibold text-slate-900">
                <tr>
                  <td className="px-4 py-2.5">Subtotal — Serviços</td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">
                    {brl(subtotalServicos.fonte500)}
                  </td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">
                    {brl(subtotalServicos.convenios)}
                  </td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">
                    {brl(subtotalServicos.outrasFontes)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-bold text-[#003366] whitespace-nowrap">
                    {brl(subtotalServicos.totalGeral)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
