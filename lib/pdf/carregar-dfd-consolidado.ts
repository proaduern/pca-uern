import { prisma } from "@/lib/prisma";
import { obterSessao } from "@/lib/auth";
import type {
  DfdConsolidadoParaPdf,
  ItemConsolidadoPdf,
  DemandaOrigemPdf,
} from "./dfd-consolidado-dados";

export type ResultadoCarregarDfdConsolidadoPdf =
  | { erro: string; status: 401 | 403 | 404 }
  | { dados: DfdConsolidadoParaPdf };

const ROTULOS_PRIORIDADE: Record<string, string> = {
  ALTA: "Alta",
  MEDIA: "Média",
  BAIXA: "Baixa",
};

const JUSTIFICATIVA_PRIORIDADE: Record<string, string> = {
  ALTA: "Prioridade Alta estabelecida pelo Setor Técnico competente diante da criticidade das demandas apresentadas pelas unidades, impacto direto nas atividades acadêmicas e administrativas essenciais da UERN e necessidade de atendimento prioritário no cronograma institucional.",
  MEDIA:
    "Prioridade Média estabelecida pelo Setor Técnico competente para assegurar o funcionamento continuado, regular e programado das unidades demandantes da UERN dentro do exercício financeiro do PCA.",
  BAIXA:
    "Prioridade Baixa estabelecida pelo Setor Técnico competente para demandas complementares ou de aprimoramento gradual, sujeitas à disponibilidade orçamentária e cronograma ordinário.",
};

/**
 * Carrega e autoriza os dados de uma Consolidação Técnica para geração do DFD Consolidado em PDF
 * (com agrupamento quantitativo de itens e Anexo Analítico bebendo da fonte dos DFDs originais).
 */
export async function carregarDfdConsolidadoParaPdf(
  consolidacaoTecnicaId: string,
): Promise<ResultadoCarregarDfdConsolidadoPdf> {
  const sessao = await obterSessao();
  if (!sessao) return { erro: "Não autenticado.", status: 401 };

  const consolidacao = await prisma.consolidacaoTecnica.findUnique({
    where: { id: consolidacaoTecnicaId },
    include: {
      categoria: true,
      setorTecnico: { include: { unidade: true } },
      estudoTecnicoPreliminar: true,
      itensDfd: {
        include: {
          categoria: true,
          dfd: { include: { unidade: true, prioridade: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      itensTecnicos: {
        include: { categoria: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!consolidacao) {
    return { erro: "Consolidação técnica não encontrada.", status: 404 };
  }

  const autorizado =
    sessao.tipo === "ADMIN" ||
    sessao.tipo === "LICITACOES" ||
    sessao.tipo === "EXECUCAO" ||
    (sessao.tipo === "SETOR_TECNICO" && consolidacao.setorTecnicoId === sessao.id);

  if (!autorizado) {
    return { erro: "Acesso negado a esta consolidação técnica.", status: 403 };
  }

  // 1. Construir a lista analítica de demandas de origem (Anexo)
  const demandasOrigem: DemandaOrigemPdf[] = [
    ...consolidacao.itensDfd.map((it) => ({
      itemNome: it.itemCatalogoNome ?? it.itemNomeLivre ?? "(sem nome)",
      unidadeDemandante: it.dfd.unidade.nome,
      dfdNumero: String(it.dfd.numero).padStart(4, "0"),
      dfdAno: it.dfd.ano,
      quantidade: it.quantidade != null ? Number(it.quantidade) : null,
      valorUnit: it.valorUnit != null ? Number(it.valorUnit) : null,
      valorTotal: Number(it.valorTotal),
      enquadramento: it.enquadramento,
      justificativaOriginal:
        it.dfd.justificativa || "Justificativa constante no processo originário da unidade.",
      substituido: it.itemSubstituidoNome != null,
      itemOriginalNome: it.itemSubstituidoNome,
      substituicaoJustificativa: it.substituicaoJustificativa,
    })),
    ...consolidacao.itensTecnicos.map((it) => ({
      itemNome: it.item,
      unidadeDemandante: `${consolidacao.setorTecnico.nome} (Inclusão Técnica)`,
      dfdNumero: "TÉC",
      dfdAno: consolidacao.pcaAno,
      quantidade: Number(it.quantidade),
      valorUnit: Number(it.valorUnit),
      valorTotal: Number(it.valorTotal),
      enquadramento: "GERAL",
      justificativaOriginal:
        it.correlacao || "Inclusão técnica para dimensionamento e padronização da contratação.",
      substituido: it.itemSubstituidoNome != null,
      itemOriginalNome: it.itemSubstituidoNome,
      substituicaoJustificativa: it.substituicaoJustificativa,
    })),
  ];

  // 2. Agrupar itens idênticos para a tabela consolidada (Seção 5)
  const mapaConsolidado = new Map<string, ItemConsolidadoPdf>();

  for (const it of consolidacao.itensDfd) {
    const nome = (it.itemCatalogoNome ?? it.itemNomeLivre ?? "(sem nome)").trim();
    const chave = `${it.enquadramento}|${nome.toLowerCase()}`;
    const qtd = it.quantidade != null ? Number(it.quantidade) : 1;
    const vUnit = it.valorUnit != null ? Number(it.valorUnit) : null;
    const vTotal = Number(it.valorTotal);

    const existente = mapaConsolidado.get(chave);
    if (existente) {
      existente.quantidadeTotal += qtd;
      existente.valorTotal += vTotal;
      if (existente.valorUnit == null && vUnit != null) {
        existente.valorUnit = vUnit;
      }
    } else {
      mapaConsolidado.set(chave, {
        enquadramento: it.enquadramento,
        nome,
        categoriaNome: it.categoria.nome,
        und: "UN",
        valorUnit: vUnit,
        quantidadeTotal: qtd,
        valorTotal: vTotal,
      });
    }
  }

  for (const it of consolidacao.itensTecnicos) {
    const nome = it.item.trim();
    const chave = `GERAL|${nome.toLowerCase()}`;
    const qtd = Number(it.quantidade);
    const vUnit = Number(it.valorUnit);
    const vTotal = Number(it.valorTotal);

    const existente = mapaConsolidado.get(chave);
    if (existente) {
      existente.quantidadeTotal += qtd;
      existente.valorTotal += vTotal;
    } else {
      mapaConsolidado.set(chave, {
        enquadramento: "GERAL",
        nome,
        categoriaNome: it.categoria.nome,
        und: "UN",
        valorUnit: vUnit,
        quantidadeTotal: qtd,
        valorTotal: vTotal,
      });
    }
  }

  const itensConsolidados = [...mapaConsolidado.values()];
  const totalEstimadoGeral = itensConsolidados.reduce((acc, it) => acc + it.valorTotal, 0);

  const unidadeVinculada = consolidacao.setorTecnico.unidade;
  const etp = consolidacao.estudoTecnicoPreliminar;

  const responsavelNome =
    etp?.responsavelNome ||
    unidadeVinculada?.responsavelNome ||
    `Responsável Técnico — ${consolidacao.setorTecnico.nome}`;
  const responsavelMatricula =
    etp?.responsavelMatricula || unidadeVinculada?.responsavelMatricula || "—";
  const responsavelEmail =
    consolidacao.setorTecnico.email || unidadeVinculada?.email || "proad@uern.br";
  const responsavelTelefone = unidadeVinculada?.responsavelTelefone || "—";

  const unidadesParticipantes = [
    ...new Set(consolidacao.itensDfd.map((i) => i.dfd.unidade.nome)),
  ];

  const descricaoSumaria = `Consolidação institucional das demandas da categoria "${consolidacao.categoria.nome}", reunindo ${demandasOrigem.length} solicitação(ões) originárias de ${
    unidadesParticipantes.length || 1
  } unidade(s) demandante(s) da Fundação Universidade do Estado do Rio Grande do Norte (FUERN) para o Plano de Contratações Anual (PCA ${consolidacao.pcaAno}).`;

  const justificativaConsolidacao =
    etp?.necessidadeContratacao ||
    `A consolidação centralizada das demandas da categoria "${consolidacao.categoria.nome}" pelo Setor Técnico (${consolidacao.setorTecnico.nome}) visa assegurar padronização técnica, ganho de economia de escala, racionalização administrativa e eficiência nos procedimentos licitatórios da UERN, em estrita observância ao art. 12 e art. 18 da Lei Federal nº 14.133/2021. As justificativas individuais de cada unidade demandante encontram-se integralmente detalhadas no Anexo Analítico deste documento.`;

  return {
    dados: {
      id: consolidacao.id,
      processoSEI: consolidacao.processoSEI,
      numeroConsolidacao: `${consolidacao.processoSEI} (PCA ${consolidacao.pcaAno})`,
      pcaAno: consolidacao.pcaAno,
      setorTecnicoNome: consolidacao.setorTecnico.nome,
      categoriaNome: consolidacao.categoria.nome,
      tipoContratacao: consolidacao.tipoContratacao,
      responsavelNome,
      responsavelMatricula,
      responsavelEmail,
      responsavelTelefone,
      descricaoSumaria,
      tipificacao: `Consolidação Institucional de Demandas por Categoria (${
        consolidacao.categoria.tipo === "MATERIAL" ? "Aquisição de Materiais / Bens" : "Prestação de Serviços"
      })`,
      prioridadeNivel: consolidacao.prioridade,
      prioridadeRotulo: ROTULOS_PRIORIDADE[consolidacao.prioridade] ?? consolidacao.prioridade,
      prioridadeJustificativa:
        JUSTIFICATIVA_PRIORIDADE[consolidacao.prioridade] ??
        "Prioridade técnica definida pelo Setor Técnico consolidador.",
      justificativaConsolidacao,
      dataEntregaConsolidada: consolidacao.dataEsperadaConclusao,
      dataEmissao: consolidacao.createdAt,
      itensConsolidados,
      totalEstimadoGeral,
      demandasOrigem,
    },
  };
}
