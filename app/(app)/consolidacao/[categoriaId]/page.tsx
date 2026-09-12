import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { obterSessao } from "@/lib/auth";
import PainelConsolidacao from "./PainelConsolidacao";

export default async function ConsolidacaoCategoriaPage({
  params,
}: {
  params: Promise<{ categoriaId: string }>;
}) {
  const { categoriaId } = await params;
  const sessao = await obterSessao();
  if (!sessao || sessao.tipo !== "SETOR_TECNICO") return null;

  const categoria = await prisma.categoria.findUnique({ where: { id: categoriaId } });
  if (!categoria || categoria.setorTecnicoId !== sessao.id) notFound();

  const pcaAtivo = await prisma.pca.findFirst({ where: { ativo: true } });

  const [pendentes, consolidados] = await Promise.all([
    pcaAtivo
      ? prisma.itemDfd.count({
          where: {
            categoriaId,
            itemConsolidadoId: null,
            dfd: { ano: pcaAtivo.ano, status: "APROVADO" },
          },
        })
      : Promise.resolve(0),
    pcaAtivo
      ? prisma.itemConsolidado.findMany({
          where: { categoriaId, pcaAno: pcaAtivo.ano },
          include: {
            aprovadoPor: true,
            origens: { include: { dfd: { include: { unidade: true } } } },
          },
          orderBy: { nomeItem: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const itens = consolidados.map((c) => ({
    id: c.id,
    nomeItem: c.nomeItem,
    quantidadeTotal: Number(c.quantidadeTotal),
    valorTotal: Number(c.valorTotal),
    status: c.status,
    aprovadoPorNome: c.aprovadoPor?.nome ?? null,
    origens: c.origens.map((o) => ({
      unidadeNome: o.dfd.unidade.nome,
      enquadramento: o.enquadramento,
      quantidade: Number(o.quantidade ?? 0),
      valorTotal: Number(o.valorTotal),
    })),
  }));

  return (
    <PainelConsolidacao
      categoriaId={categoriaId}
      categoriaNome={categoria.nome}
      pcaAno={pcaAtivo?.ano ?? null}
      pendentes={pendentes}
      itens={itens}
    />
  );
}
