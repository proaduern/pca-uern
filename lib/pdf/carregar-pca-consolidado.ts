import { prisma } from "@/lib/prisma";
import { obterSessao } from "@/lib/auth";
import { montarLinhaConsolidado, type LinhaConsolidado } from "@/lib/pca-consolidado";

export type ResultadoCarregarPcaConsolidado =
  | { erro: string; status: 401 | 403 | 404 }
  | { ano: number; linhas: LinhaConsolidado[] };

export async function carregarPcaConsolidado(ano: number): Promise<ResultadoCarregarPcaConsolidado> {
  const sessao = await obterSessao();
  if (!sessao) return { erro: "Não autenticado.", status: 401 };
  if (sessao.tipo !== "ADMIN") return { erro: "Acesso restrito à PROAD.", status: 403 };

  const pca = await prisma.pca.findUnique({ where: { ano } });
  if (!pca) return { erro: "PCA não encontrado.", status: 404 };

  const consolidacoes = await prisma.consolidacaoTecnica.findMany({
    where: { pcaAno: ano },
    include: {
      categoria: true,
      itensDfd: { include: { dfd: true } },
      itensTecnicos: true,
    },
  });

  const linhas = consolidacoes.map((c) =>
    montarLinhaConsolidado({
      categoriaNome: c.categoria.nome,
      classificacaoRubrica: c.categoria.classificacaoRubrica,
      codigoPncp: c.codigoPca,
      itensDfd: c.itensDfd.map((it) => ({
        enquadramento: it.enquadramento,
        valorTotal: Number(it.valorTotal),
        tipoDemanda: it.dfd.tipoDemanda,
      })),
      valorItensTecnicos: c.itensTecnicos.reduce((s, it) => s + Number(it.valorTotal), 0),
    }),
  );

  return { ano, linhas };
}
