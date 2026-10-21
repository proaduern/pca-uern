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

  const [pendentesDfd, pendentesTecnicos, consolidacoesPorCategoria] = await Promise.all([
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
  const tecnicosPorId = somarPorCategoria(pendentesTecnicos);
  const consolidacoesPorId = somarPorCategoria(consolidacoesPorCategoria);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">
          Consolidação Técnica, ETP e Mapa de Riscos — Setor Técnico
        </h1>
        <p className="text-sm text-slate-500">
          Consolidação final da lista de itens por competência (STI, Patrimônio, SOBE, DAS,
          Almoxarifado, Transportes e Comitês) e elaboração do Estudo Técnico Preliminar (ETP) e
          Mapa de Riscos.
        </p>
      </div>

      {!pcaAtivo && (
        <div className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Nenhum PCA ativo no momento.
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
                <th className="px-4 py-2 font-medium">Itens pendentes de consolidação</th>
                <th className="px-4 py-2 font-medium">Processos consolidados (ETP / Riscos)</th>
                <th className="px-4 py-2 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categorias.map((c) => {
                const pendentes = (dfdPorId.get(c.id) ?? 0) + (tecnicosPorId.get(c.id) ?? 0);
                return (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 text-slate-900 font-medium">{c.nome}</td>
                    {!setorTecnicoId && (
                      <td className="px-4 py-2 text-slate-600">
                        {c.setorTecnico?.nome ?? (
                          <span className="text-xs text-amber-600">Sem setor vinculado</span>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-2 text-slate-600">{pendentes}</td>
                    <td className="px-4 py-2 text-slate-600">
                      {consolidacoesPorId.get(c.id) ?? 0}
                    </td>
                    <td className="px-4 py-2">
                      <Link
                        href={`/consolidacao/${c.id}`}
                        className="rounded-lg bg-[#003366] px-3 py-1 text-xs font-semibold text-white hover:bg-[#002244]"
                      >
                        Abrir ETP / Riscos
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {categorias.length === 0 && (
                <tr>
                  <td
                    colSpan={setorTecnicoId ? 4 : 5}
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
