import { prisma } from "@/lib/prisma";
import { obterSessao } from "@/lib/auth";
import type { DfdParaPdf } from "./dfd-dados";

export type ResultadoCarregarDfdPdf = { erro: string; status: 401 | 403 | 404 } | { dfd: DfdParaPdf };

const ROTULOS_NIVEL_PRIORIDADE: Record<string, string> = {
  ALTISSIMA: "Altíssima",
  ALTA: "Alta",
  MEDIA: "Média",
  BAIXA: "Baixa",
};

/** Carrega e autoriza os dados de um DFD para geração de PDF/XLSX — Unidade
 * dona do DFD ou Admin (PROAD). Usado pelos Route Handlers de download. */
export async function carregarDfdParaPdf(dfdId: string): Promise<ResultadoCarregarDfdPdf> {
  const sessao = await obterSessao();
  if (!sessao) return { erro: "Não autenticado.", status: 401 };

  const dfd = await prisma.dfd.findUnique({
    where: { id: dfdId },
    include: {
      unidade: true,
      itens: { include: { categoria: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!dfd) return { erro: "DFD não encontrado.", status: 404 };
  if (sessao.tipo !== "ADMIN" && !(sessao.tipo === "UNIDADE" && dfd.unidadeId === sessao.id)) {
    return { erro: "Acesso negado.", status: 403 };
  }

  const [tipificacao, prioridade] = await Promise.all([
    dfd.tipificacaoId ? prisma.tipificacao.findUnique({ where: { id: dfd.tipificacaoId } }) : null,
    prisma.prioridade.findUniqueOrThrow({ where: { id: dfd.prioridadeId } }),
  ]);

  const prioridadeNivelRotulo = prioridade ? (ROTULOS_NIVEL_PRIORIDADE[prioridade.nivel] ?? prioridade.nivel) : null;

  return {
    dfd: {
      numero: dfd.numero,
      ano: dfd.ano,
      unidadeNome: dfd.unidade.nome,
      unidadeEmail: dfd.unidade.email,
      responsavelNome: dfd.unidade.responsavelNome,
      responsavelMatricula: dfd.unidade.responsavelMatricula,
      responsavelTelefone: dfd.unidade.responsavelTelefone,
      descricaoSumaria: dfd.descricaoSumaria,
      tipificacaoNome: tipificacao?.nome ?? null,
      justificativa: dfd.justificativa,
      tipoDemanda: dfd.tipoDemanda,
      data: dfd.tipoDemanda === "RENOVACAO" ? dfd.dataRenovacao : dfd.dataEntrega,
      prioridadeNivel: prioridade.nivel,
      prioridadeNivelRotulo,
      prioridadeFrase: prioridade.frase,
      criadoEm: dfd.createdAt,
      itens: dfd.itens.map((it) => ({
        enquadramento: it.enquadramento,
        convenioNumero: it.convenioNumero,
        convenioAno: it.convenioAno,
        parlamentarNome: it.parlamentarNome,
        recursoExtraAgencia: it.recursoExtraAgencia,
        recursoExtraConta: it.recursoExtraConta,
        categoriaNome: it.categoria.nome,
        nome: it.itemCatalogoNome ?? it.itemNomeLivre ?? "(sem nome)",
        quantidade: it.quantidade != null ? Number(it.quantidade) : null,
        valorUnit: it.valorUnit != null ? Number(it.valorUnit) : null,
        valorTotal: Number(it.valorTotal),
      })),
    },
  };
}
