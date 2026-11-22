import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { resolverPcaEmAtuacao } from "@/lib/pca-contexto";

export default async function SetorTecnicoHomePage({
  setorTecnicoId,
}: {
  setorTecnicoId: string | null;
}) {
  const [contextoPca, categorias] = await Promise.all([
    setorTecnicoId
      ? resolverPcaEmAtuacao({ id: setorTecnicoId, tipo: "SETOR_TECNICO" })
      : prisma.pca
          .findFirst({ where: { ativo: true }, orderBy: { ano: "desc" } })
          .then((pca) => (pca ? ({ status: "resolvido" as const, pca, totalAtivos: 1 }) : ({ status: "nenhum" as const }))),
    prisma.categoria.findMany({
      where: setorTecnicoId ? { setorTecnicoId } : { ativa: true },
      include: { setorTecnico: { select: { nome: true } } },
      orderBy: { nome: "asc" },
    }),
  ]);

  const pcaAtivo = contextoPca.status === "resolvido" ? contextoPca.pca : null;

  const categoriaIds = categorias.map((c) => c.id);

  const [pendentesDfd, aguardandoAprovacaoDfd, pendentesTecnicos, consolidacoesPorCategoria] = await Promise.all([
    pcaAtivo
      ? prisma.itemDfd.groupBy({
          by: ["categoriaId"],
          where: {
            categoriaId: { in: categoriaIds },
            consolidacaoTecnicaId: null,
            dfd: { ano: pcaAtivo.ano, status: "APROVADO" },
          },
          _count: { _all: true },
        })
      : Promise.resolve([]),
    pcaAtivo
      ? prisma.itemDfd.groupBy({
          by: ["categoriaId"],
          where: {
            categoriaId: { in: categoriaIds },
            consolidacaoTecnicaId: null,
            dfd: { ano: pcaAtivo.ano, status: "AGUARDANDO_APROVACAO" },
          },
          _count: { _all: true },
        })
      : Promise.resolve([]),
    prisma.itemTecnico.groupBy({
      by: ["categoriaId"],
      where: { categoriaId: { in: categoriaIds }, consolidacaoTecnicaId: null },
      _count: { _all: true },
    }),
    pcaAtivo
      ? prisma.consolidacaoTecnica.groupBy({
          by: ["categoriaId"],
          where: { categoriaId: { in: categoriaIds }, pcaAno: pcaAtivo.ano },
          _count: { _all: true },
        })
      : Promise.resolve([]),
  ]);

  const somarPorCategoria = (lista: { categoriaId: string; _count: { _all: number } }[]) =>
    new Map(lista.map((p) => [p.categoriaId, p._count._all]));
  const dfdPorId = somarPorCategoria(pendentesDfd);
  const aguardandoPorId = somarPorCategoria(aguardandoAprovacaoDfd);
  const tecnicosPorId = somarPorCategoria(pendentesTecnicos);
  const consolidacoesPorId = somarPorCategoria(consolidacoesPorCategoria);

  const categoriasSemPncp = categorias.filter(
    (c) =>
      !c.fluxoContinuo &&
      !c.ignoraPCA &&
      !c.codigoPcaPadrao?.trim() &&
      ((dfdPorId.get(c.id) ?? 0) > 0 || (aguardandoPorId.get(c.id) ?? 0) > 0),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">
          Consolidação Técnica, DFD Consolidado, ETP, Mapa de Riscos e IMR — Setor Técnico
        </h1>
        <p className="text-sm text-slate-500">
          Consolidação final da lista de itens por competência (STI, Patrimônio, SOBE, DAS,
          Almoxarifado, Transportes, DSIB, PROAD e Comitês), emissão do DFD Consolidado e elaboração
          do Estudo Técnico Preliminar (ETP), Mapa de Riscos e IMR.
        </p>
      </div>

      {!pcaAtivo && (
        <div className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Nenhum PCA ativo no momento.
        </div>
      )}

      {pcaAtivo && categoriasSemPncp.length > 0 && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50/80 p-4 text-xs text-amber-950">
          <p className="font-bold">
            ⚠️ Atenção — {categoriasSemPncp.length} categoria(s) ainda sem ID do PNCP lançado no PCA {pcaAtivo.ano}
          </p>
          <p className="mt-1 leading-relaxed">
            O PCA {pcaAtivo.ano} só pode seguir para a emissão do DFD Consolidado, ETP, Mapa de Riscos e IMR
            depois que <strong>todos os IDs do PNCP (ex.: 925543-XX/{pcaAtivo.ano})</strong> estiverem devidamente
            lançados no sistema. Clique em <strong>&quot;Abrir DFD / ETP / Riscos&quot;</strong> nas categorias
            sinalizadas abaixo (ou acesse <strong>Admin → PCA</strong>) para incluir o ID do PNCP faltante.
          </p>
        </div>
      )}

      {pcaAtivo && (
        <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Categoria</th>
                {!setorTecnicoId && (
                  <th className="px-4 py-2 font-medium">Setor Técnico Competente</th>
                )}
                <th className="px-4 py-2 font-medium">ID Contratação PNCP</th>
                <th className="px-4 py-2 font-medium">Itens (Aprovados / Em aprovação PROAD)</th>
                <th className="px-4 py-2 font-medium">Processos consolidados</th>
                <th className="px-4 py-2 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categorias.map((c) => {
                const pendentes = (dfdPorId.get(c.id) ?? 0) + (tecnicosPorId.get(c.id) ?? 0);
                const emAprovacao = aguardandoPorId.get(c.id) ?? 0;
                const semPncp = !c.fluxoContinuo && !c.ignoraPCA && !c.codigoPcaPadrao?.trim();
                return (
                  <tr key={c.id} className={semPncp && (pendentes + emAprovacao > 0) ? "bg-amber-50/40" : "hover:bg-slate-50"}>
                    <td className="px-4 py-2 text-slate-900 font-medium">
                      {c.nome}
                      {c.consolidarPorObjeto && (
                        <span className="ml-1.5 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                          Por Objeto
                        </span>
                      )}
                    </td>
                    {!setorTecnicoId && (
                      <td className="px-4 py-2 text-slate-600">
                        {c.setorTecnico?.nome ?? (
                          <span className="text-xs text-amber-600">Sem setor vinculado</span>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-2">
                      {c.fluxoContinuo || c.ignoraPCA ? (
                        <span className="text-xs text-slate-400">Fluxo Contínuo</span>
                      ) : c.codigoPcaPadrao?.trim() ? (
                        <span className="inline-block rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-mono text-xs font-semibold text-emerald-800">
                          {c.codigoPcaPadrao}
                        </span>
                      ) : (
                        <span className="inline-block rounded-md border border-amber-300 bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
                          ⚠️ Sem ID PNCP (Incluir)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-slate-600">
                      <span className="font-semibold text-slate-900">{pendentes}</span> aprovados
                      {emAprovacao > 0 && (
                        <span className="ml-1.5 rounded bg-amber-50 border border-amber-200 px-1.5 py-0.5 text-[11px] font-medium text-amber-800">
                          +{emAprovacao} aguardando aprovação PROAD
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-slate-600">
                      {consolidacoesPorId.get(c.id) ?? 0}
                    </td>
                    <td className="px-4 py-2">
                      <Link
                        href={`/consolidacao/${c.id}`}
                        className="rounded-lg bg-[#003366] px-3 py-1 text-xs font-semibold text-white hover:bg-[#002244]"
                      >
                        Abrir DFD / ETP / Riscos
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {categorias.length === 0 && (
                <tr>
                  <td
                    colSpan={setorTecnicoId ? 5 : 6}
                    className="px-4 py-6 text-center text-slate-400"
                  >
                    Nenhuma categoria atribuída ao seu setor ainda. Peça à PROAD para atribuir.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
