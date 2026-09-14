import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function SetorTecnicoHomePage({ setorTecnicoId }: { setorTecnicoId: string }) {
  const [pcaAtivo, categorias] = await Promise.all([
    prisma.pca.findFirst({ where: { ativo: true } }),
    prisma.categoria.findMany({
      where: { setorTecnicoId },
      orderBy: { nome: "asc" },
    }),
  ]);

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
      <h1 className="text-lg font-semibold text-slate-900">Consolidação — Setor Técnico</h1>

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
                <th className="px-4 py-2 font-medium">Itens pendentes de consolidação</th>
                <th className="px-4 py-2 font-medium">Processos consolidados</th>
                <th className="px-4 py-2 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categorias.map((c) => {
                const pendentes = (dfdPorId.get(c.id) ?? 0) + (tecnicosPorId.get(c.id) ?? 0);
                return (
                  <tr key={c.id}>
                    <td className="px-4 py-2 text-slate-900">{c.nome}</td>
                    <td className="px-4 py-2 text-slate-600">{pendentes}</td>
                    <td className="px-4 py-2 text-slate-600">{consolidacoesPorId.get(c.id) ?? 0}</td>
                    <td className="px-4 py-2">
                      <Link href={`/consolidacao/${c.id}`} className="text-xs text-slate-700 underline">
                        Abrir
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {categorias.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
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
