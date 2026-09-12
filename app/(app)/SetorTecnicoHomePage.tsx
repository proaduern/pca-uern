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

  const pendentesPorCategoria = pcaAtivo
    ? await prisma.itemDfd.groupBy({
        by: ["categoriaId"],
        where: {
          categoriaId: { in: categorias.map((c) => c.id) },
          itemConsolidadoId: null,
          dfd: { ano: pcaAtivo.ano, status: "APROVADO" },
        },
        _count: { _all: true },
      })
    : [];
  const pendentesPorId = new Map(pendentesPorCategoria.map((p) => [p.categoriaId, p._count._all]));

  const consolidadosPorCategoria = pcaAtivo
    ? await prisma.itemConsolidado.groupBy({
        by: ["categoriaId", "status"],
        where: { categoriaId: { in: categorias.map((c) => c.id) }, pcaAno: pcaAtivo.ano },
        _count: { _all: true },
      })
    : [];

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-slate-900">Consolidação — Setor Técnico</h1>

      {!pcaAtivo && (
        <div className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Nenhum PCA ativo no momento.
        </div>
      )}

      {pcaAtivo && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Categoria</th>
                <th className="px-4 py-2 font-medium">Itens pendentes de consolidação</th>
                <th className="px-4 py-2 font-medium">Rascunhos</th>
                <th className="px-4 py-2 font-medium">Aprovados</th>
                <th className="px-4 py-2 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categorias.map((c) => {
                const rascunhos =
                  consolidadosPorCategoria.find((x) => x.categoriaId === c.id && x.status === "RASCUNHO")
                    ?._count._all ?? 0;
                const aprovados =
                  consolidadosPorCategoria.find((x) => x.categoriaId === c.id && x.status === "APROVADO")
                    ?._count._all ?? 0;
                return (
                  <tr key={c.id}>
                    <td className="px-4 py-2 text-slate-900">{c.nome}</td>
                    <td className="px-4 py-2 text-slate-600">{pendentesPorId.get(c.id) ?? 0}</td>
                    <td className="px-4 py-2 text-slate-600">{rascunhos}</td>
                    <td className="px-4 py-2 text-slate-600">{aprovados}</td>
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
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
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
