import { prisma } from "@/lib/prisma";
import { obterSessao } from "@/lib/auth";
import {
  compilarLinhasPcaAno,
  montarLinhaConsolidado,
  type LinhaConsolidado,
} from "@/lib/pca-consolidado";

export type ResultadoCarregarPcaConsolidado =
  | { erro: string; status: 401 | 403 | 404 }
  | { ano: number; linhas: LinhaConsolidado[] };

export async function carregarPcaConsolidado(ano: number): Promise<ResultadoCarregarPcaConsolidado> {
  const sessao = await obterSessao();
  if (!sessao) return { erro: "Não autenticado.", status: 401 };
  if (sessao.tipo !== "ADMIN") return { erro: "Acesso restrito à PROAD.", status: 403 };

  const pca = await prisma.pca.findUnique({ where: { ano } });
  if (!pca) return { erro: "PCA não encontrado.", status: 404 };

  // Busca todos os itens de DFDs do ano (priorizando APROVADO; se ainda estiver em prévia sem aprovados, inclui AGUARDANDO_APROVACAO)
  const itensAprovados = await prisma.itemDfd.findMany({
    where: {
      dfd: { ano, status: "APROVADO" },
      categoria: { fluxoContinuo: false, ignoraPCA: false },
    },
    include: {
      categoria: { include: { setorTecnico: { select: { nome: true } } } },
      dfd: { include: { unidade: { select: { nome: true } } } },
      consolidacaoTecnica: true,
    },
  });

  const itensBase =
    itensAprovados.length > 0
      ? itensAprovados
      : await prisma.itemDfd.findMany({
          where: {
            dfd: { ano, status: { in: ["APROVADO", "AGUARDANDO_APROVACAO"] } },
            categoria: { fluxoContinuo: false, ignoraPCA: false },
          },
          include: {
            categoria: { include: { setorTecnico: { select: { nome: true } } } },
            dfd: { include: { unidade: { select: { nome: true } } } },
            consolidacaoTecnica: true,
          },
        });

  if (itensBase.length > 0) {
    const linhas = compilarLinhasPcaAno(
      itensBase.map((it) => ({
        id: it.id,
        dfdId: it.dfdId,
        dfdDescricaoSumaria: it.dfd.descricaoSumaria,
        dfdIdSeiOrigem: it.idSeiDfdOrigem ?? it.dfd.idSeiDfdOrigem,
        dfdProcessoSeiOrigem: it.processoSeiOrigem ?? it.dfd.processoSeiOrigem,
        dfdTipoDemanda: it.dfd.tipoDemanda,
        dfdStatus: it.dfd.status,
        unidadeNome: it.dfd.unidade.nome,
        categoriaId: it.categoriaId,
        categoriaNome: it.categoria.nome,
        categoriaTipo: it.categoria.tipo,
        categoriaClassificacaoRubrica: it.categoria.classificacaoRubrica,
        categoriaConsolidarPorObjeto: it.categoria.consolidarPorObjeto,
        categoriaCodigoPcaPadrao: it.categoria.codigoPcaPadrao,
        setorTecnicoId: it.categoria.setorTecnicoId,
        setorTecnicoNome: it.categoria.setorTecnico?.nome ?? "Sem setor vinculado",
        enquadramento: it.enquadramento,
        valorTotal: Number(it.valorTotal),
        codigoPncpReferencia: it.codigoPncpReferencia,
        consolidacaoCodigoPca: it.consolidacaoTecnica?.codigoPca ?? null,
      })),
    );
    return { ano, linhas };
  }

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
