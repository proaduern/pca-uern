import { prisma } from "@/lib/prisma";

export interface MetasSlaDias {
  demandanteEtp: number; // 15 dias corridos
  pesquisaPrecos: number; // 14 dias (10 úteis)
  termoReferencia: number; // 14 dias (10 úteis)
  minutasDlc: number; // 10 dias corridos
  pgeReferencial: number; // 20 dias (puramente informativo externo)
  agenteFaseExterna: number; // 35 dias corridos
  conferenciaDefinitivoBens: number; // 10 dias
  entregaDestinatarioBens: number; // 5 dias
}

export interface LimiaresRating {
  diamante: number; // 90
  ouro: number; // 75
  prata: number; // 50
}

export const METAS_SLA_PADRAO: MetasSlaDias = {
  demandanteEtp: 15,
  pesquisaPrecos: 14,
  termoReferencia: 14,
  minutasDlc: 10,
  pgeReferencial: 20,
  agenteFaseExterna: 35,
  conferenciaDefinitivoBens: 10,
  entregaDestinatarioBens: 5,
};

export const LIMIARES_RATING_PADRAO: LimiaresRating = {
  diamante: 90,
  ouro: 75,
  prata: 50,
};

export interface ParametrosCompletosLicitacao {
  metas: MetasSlaDias;
  limiares: LimiaresRating;
  isCustomizado: boolean;
  atualizadoPor?: string | null;
  updatedAt?: string | null;
}

export async function obterParametrosKpiLicitacao(): Promise<ParametrosCompletosLicitacao> {
  try {
    const config = await prisma.parametrosKpiLicitacao.findUnique({
      where: { id: "CONFIG_PADRAO" },
    });

    if (!config) {
      return {
        metas: { ...METAS_SLA_PADRAO },
        limiares: { ...LIMIARES_RATING_PADRAO },
        isCustomizado: false,
      };
    }

    return {
      metas: {
        demandanteEtp: config.demandanteEtpDias,
        pesquisaPrecos: config.pesquisaPrecosDias,
        termoReferencia: config.termoReferenciaDias,
        minutasDlc: config.minutasDlcDias,
        pgeReferencial: config.pgeReferencialDias,
        agenteFaseExterna: config.agenteFaseExternaDias,
        conferenciaDefinitivoBens: config.conferenciaDefinitivoDias,
        entregaDestinatarioBens: config.entregaDestinatarioDias,
      },
      limiares: {
        diamante: config.limiarDiamante,
        ouro: config.limiarOuro,
        prata: config.limiarPrata,
      },
      isCustomizado: true,
      atualizadoPor: config.atualizadoPor,
      updatedAt: config.updatedAt?.toISOString(),
    };
  } catch (err) {
    console.warn("Aviso ao carregar parametros de licitacao, usando padroes:", err);
    return {
      metas: { ...METAS_SLA_PADRAO },
      limiares: { ...LIMIARES_RATING_PADRAO },
      isCustomizado: false,
    };
  }
}

export async function salvarParametrosKpiLicitacao(
  dados: {
    metas: MetasSlaDias;
    limiares: LimiaresRating;
  },
  atualizadoPor?: string
) {
  return await prisma.parametrosKpiLicitacao.upsert({
    where: { id: "CONFIG_PADRAO" },
    create: {
      id: "CONFIG_PADRAO",
      demandanteEtpDias: Math.max(1, Math.round(dados.metas.demandanteEtp)),
      pesquisaPrecosDias: Math.max(1, Math.round(dados.metas.pesquisaPrecos)),
      termoReferenciaDias: Math.max(1, Math.round(dados.metas.termoReferencia)),
      minutasDlcDias: Math.max(1, Math.round(dados.metas.minutasDlc)),
      pgeReferencialDias: Math.max(1, Math.round(dados.metas.pgeReferencial)),
      agenteFaseExternaDias: Math.max(1, Math.round(dados.metas.agenteFaseExterna)),
      conferenciaDefinitivoDias: Math.max(1, Math.round(dados.metas.conferenciaDefinitivoBens)),
      entregaDestinatarioDias: Math.max(1, Math.round(dados.metas.entregaDestinatarioBens)),
      limiarDiamante: Math.max(1, Math.min(100, Math.round(dados.limiares.diamante))),
      limiarOuro: Math.max(1, Math.min(100, Math.round(dados.limiares.ouro))),
      limiarPrata: Math.max(1, Math.min(100, Math.round(dados.limiares.prata))),
      atualizadoPor: atualizadoPor || "Administrador PROAD",
    },
    update: {
      demandanteEtpDias: Math.max(1, Math.round(dados.metas.demandanteEtp)),
      pesquisaPrecosDias: Math.max(1, Math.round(dados.metas.pesquisaPrecos)),
      termoReferenciaDias: Math.max(1, Math.round(dados.metas.termoReferencia)),
      minutasDlcDias: Math.max(1, Math.round(dados.metas.minutasDlc)),
      pgeReferencialDias: Math.max(1, Math.round(dados.metas.pgeReferencial)),
      agenteFaseExternaDias: Math.max(1, Math.round(dados.metas.agenteFaseExterna)),
      conferenciaDefinitivoDias: Math.max(1, Math.round(dados.metas.conferenciaDefinitivoBens)),
      entregaDestinatarioDias: Math.max(1, Math.round(dados.metas.entregaDestinatarioBens)),
      limiarDiamante: Math.max(1, Math.min(100, Math.round(dados.limiares.diamante))),
      limiarOuro: Math.max(1, Math.min(100, Math.round(dados.limiares.ouro))),
      limiarPrata: Math.max(1, Math.min(100, Math.round(dados.limiares.prata))),
      atualizadoPor: atualizadoPor || "Administrador PROAD",
    },
  });
}

export async function restaurarParametrosKpiLicitacaoPadrao(atualizadoPor?: string) {
  try {
    await prisma.parametrosKpiLicitacao.delete({
      where: { id: "CONFIG_PADRAO" },
    });
  } catch {
    // Se não existia, sem problema
  }
  return { sucesso: true };
}

export type FaixaRating = "DIAMANTE" | "OURO" | "PRATA" | "BRONZE_CRITICO";

export interface RatingSetorialInfo {
  setorCodigo: string;
  setorNome: string;
  responsavelPadrao: string;
  metaDias: number;
  diasMediosReais: number;
  processosAvaliados: number;
  razaoEficiencia: number; // diasMedios / meta
  score: number; // 0 a 100
  faixa: FaixaRating;
  isGargaloPrincipal: boolean;
  isExternoNeutro?: boolean; // Se true (PGE), não afeta score geral UERN
}

export interface KpiProcessoLicitacao {
  id: string;
  pcaAno: number;
  categoriaNome: string;
  setorTecnicoNome: string;
  processoSEI: string;
  tipoContratacao: string;
  statusAtual: string;
  responsavelAtual?: string;
  diasDemandanteEtp: number;
  diasPesquisaPrecos: number;
  diasTermoReferencia: number;
  diasMinutasDlc: number;
  diasPgeExterno: number; // Informativo
  diasAgenteExterna: number;
  diasTotalInternoUern: number; // Exclui PGE
  diasTotalGeral: number; // Inclui PGE
  gargaloIdentificado?: string;
  scoreProcesso: number;
  faixaProcesso: FaixaRating;
  itensResumo: {
    total: number;
    sucesso: number;
    fracassado: number;
    deserto: number;
    pendente: number;
    taxaSucessoPercent: number;
  };
}

export interface KpiExecucaoBens {
  totalProcessosExecucao: number;
  processosConcluidos: number;
  processosEmAndamento: number;
  atrasosFornecedor: number;
  diasMediosFornecedor: number;
  diasMediosConferenciaDefinitivo: number;
  diasMediosEntregaDestinatario: number;
  scoreEficienciaExecucao: number;
  faixaExecucao: FaixaRating;
}

export interface KpisLicitacaoConsolidado {
  pcaAnoFiltro: number | null;
  totalProcessos: number;
  processosConcluidos: number;
  processosEmAndamento: number;
  tempoMedioTotalInternoUern: number;
  tempoMedioPgeReferencial: number;
  scoreGeralEficiencia: number;
  faixaGeral: FaixaRating;
  setorGargaloPrincipal: string | null;
  ratingsSetoriais: RatingSetorialInfo[];
  sucessoLicitacoes: {
    totalItensDisputados: number;
    totalHomologadosSucesso: number;
    totalDesertos: number;
    totalFracassados: number;
    taxaSucessoGeral: number; // %
    ratingSucesso: FaixaRating;
    scoreSucesso: number;
  };
  execucaoBens: KpiExecucaoBens;
  processos: KpiProcessoLicitacao[];
  parametrosVigentes: ParametrosCompletosLicitacao;
}

function calcularScoreERating(
  diasReais: number,
  meta: number,
  limiares: LimiaresRating
): { score: number; faixa: FaixaRating; razao: number } {
  if (meta <= 0) return { score: 100, faixa: "DIAMANTE", razao: 1 };
  const razao = Number((diasReais / meta).toFixed(2));
  let score = 100;
  if (razao > 1.0) {
    score = Math.max(0, Math.round(100 - (razao - 1.0) * 100));
  }
  let faixa: FaixaRating = "DIAMANTE";
  if (score >= limiares.diamante) faixa = "DIAMANTE";
  else if (score >= limiares.ouro) faixa = "OURO";
  else if (score >= limiares.prata) faixa = "PRATA";
  else faixa = "BRONZE_CRITICO";

  return { score, faixa, razao };
}

function diffEmDias(inicio: Date, fim: Date): number {
  const diffMs = fim.getTime() - inicio.getTime();
  const dias = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
  return dias;
}

export async function obterKpisLicitacao(pcaAno?: number): Promise<KpisLicitacaoConsolidado> {
  const paramsConfig = await obterParametrosKpiLicitacao();
  const METAS = paramsConfig.metas;
  const LIMIARES = paramsConfig.limiares;

  const whereConsolidacao: any = {};
  if (pcaAno) {
    whereConsolidacao.pcaAno = pcaAno;
  }

  const consolidacoes = await prisma.consolidacaoTecnica.findMany({
    where: whereConsolidacao,
    include: {
      categoria: true,
      setorTecnico: true,
      statusLicitacao: {
        orderBy: { createdAt: "asc" },
      },
      estudoTecnicoPreliminar: true,
      analiseRiscos: true,
      pesquisaDePrecos: true,
      termoReferencia: true,
      minutaEdital: true,
      diligenciasJuridicas: true,
      agenteContratacaoDesignado: true,
      itensDfd: {
        select: {
          id: true,
          resultadoHomologacao: true,
          valorTotal: true,
          valorAdjudicado: true,
        },
      },
      itensTecnicos: {
        select: {
          id: true,
          resultadoHomologacao: true,
          valorTotal: true,
          valorAdjudicado: true,
        },
      },
      processosExecucao: {
        include: {
          statusExecucao: {
            orderBy: { createdAt: "asc" },
          },
          entregas: {
            include: {
              statusEntrega: {
                orderBy: { createdAt: "asc" },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const agora = new Date();

  // Acumuladores setoriais
  let somaDiasDemandante = 0;
  let countDemandante = 0;

  let somaDiasPesquisa = 0;
  let countPesquisa = 0;

  let somaDiasTr = 0;
  let countTr = 0;

  let somaDiasMinutas = 0;
  let countMinutas = 0;

  let somaDiasPge = 0;
  let countPge = 0;

  let somaDiasAgente = 0;
  let countAgente = 0;

  let totalItensDisputados = 0;
  let totalHomologadosSucesso = 0;
  let totalDesertos = 0;
  let totalFracassados = 0;

  const listaProcessosKpi: KpiProcessoLicitacao[] = [];

  for (const c of consolidacoes) {
    // 1. Demandante (ETP e Riscos)
    const dataCriacao = new Date(c.createdAt);
    let dataFimEtp = c.dataETP ? new Date(c.dataETP) : null;
    if (!dataFimEtp && c.estudoTecnicoPreliminar?.updatedAt) {
      dataFimEtp = new Date(c.estudoTecnicoPreliminar.updatedAt);
    }
    const diasDemandante = diffEmDias(dataCriacao, dataFimEtp ?? agora);
    somaDiasDemandante += diasDemandante;
    countDemandante++;

    // Mapeamento dos marcos de StatusLicitacao
    const history = c.statusLicitacao;
    let diasPesquisa = 0;
    let diasTr = 0;
    let diasMinutas = 0;
    let diasPge = 0;
    let diasAgente = 0;

    let ultimoStatus = history.length > 0 ? history[history.length - 1].status : "ETP_DEMANDANTE";
    let responsavelAtual = history.length > 0 ? history[history.length - 1].responsavel ?? history[history.length - 1].agenteNome ?? undefined : undefined;

    for (let i = 0; i < history.length; i++) {
      const itemAtual = history[i];
      const dataInicioItem = new Date(itemAtual.createdAt);
      const dataFimItem = i + 1 < history.length ? new Date(history[i + 1].createdAt) : agora;
      const duracao = diffEmDias(dataInicioItem, dataFimItem);

      if (itemAtual.status === "PESQUISA_PRECOS") {
        diasPesquisa += duracao;
      } else if (itemAtual.status === "TERMO_REFERENCIA" || itemAtual.status === "DILIGENCIA_DEMANDANTE") {
        diasTr += duracao;
      } else if (itemAtual.status === "MINUTAS") {
        diasMinutas += duracao;
      } else if (itemAtual.status === "ANALISE_JURIDICA" || itemAtual.status === "DILIGENCIAS_PGE") {
        // Órgão externo (PGE): contabilizado separadamente
        diasPge += duracao;
      } else if (
        itemAtual.status === "SESSAO_MARCADA" ||
        itemAtual.status === "ANALISE_PROPOSTAS" ||
        itemAtual.status === "RECURSO"
      ) {
        diasAgente += duracao;
      }
    }

    if (diasPesquisa > 0 || history.some((h) => h.status === "PESQUISA_PRECOS")) {
      somaDiasPesquisa += diasPesquisa;
      countPesquisa++;
    }
    if (diasTr > 0 || history.some((h) => h.status === "TERMO_REFERENCIA")) {
      somaDiasTr += diasTr;
      countTr++;
    }
    if (diasMinutas > 0 || history.some((h) => h.status === "MINUTAS")) {
      somaDiasMinutas += diasMinutas;
      countMinutas++;
    }
    if (diasPge > 0 || history.some((h) => h.status === "ANALISE_JURIDICA")) {
      somaDiasPge += diasPge;
      countPge++;
    }
    if (diasAgente > 0 || history.some((h) => h.status === "SESSAO_MARCADA")) {
      somaDiasAgente += diasAgente;
      countAgente++;
    }

    // Lead time UERN (excluindo PGE)
    const diasTotalInternoUern = diasDemandante + diasPesquisa + diasTr + diasMinutas + diasAgente;
    const diasTotalGeral = diasTotalInternoUern + diasPge;

    // Detectar gargalo específico do processo com base nas metas vigentes
    const ratios = [
      { setor: "Demandante (ETP/Riscos)", ratio: diasDemandante / METAS.demandanteEtp },
      { setor: "Pesquisa de Preços", ratio: diasPesquisa / METAS.pesquisaPrecos },
      { setor: "Termo de Referência", ratio: diasTr / METAS.termoReferencia },
      { setor: "Minutas DLC", ratio: diasMinutas / METAS.minutasDlc },
      { setor: "Agente de Contratação", ratio: diasAgente / METAS.agenteFaseExterna },
    ];
    ratios.sort((a, b) => b.ratio - a.ratio);
    const gargaloIdentificado = ratios[0].ratio > 1.0 ? ratios[0].setor : undefined;

    const metaInternaEsperada =
      METAS.demandanteEtp +
      METAS.pesquisaPrecos +
      METAS.termoReferencia +
      METAS.minutasDlc +
      METAS.agenteFaseExterna;

    const calcProcesso = calcularScoreERating(diasTotalInternoUern, metaInternaEsperada, LIMIARES);

    // Itens e Homologação
    const todosItens = [...c.itensDfd, ...c.itensTecnicos];
    let procSucesso = 0;
    let procFracassado = 0;
    let procDeserto = 0;
    let procPendente = 0;

    for (const it of todosItens) {
      if (it.resultadoHomologacao === "SUCESSO") {
        procSucesso++;
        totalHomologadosSucesso++;
        totalItensDisputados++;
      } else if (it.resultadoHomologacao === "FRACASSADO") {
        procFracassado++;
        totalFracassados++;
        totalItensDisputados++;
      } else if (it.resultadoHomologacao === "DESERTO") {
        procDeserto++;
        totalDesertos++;
        totalItensDisputados++;
      } else {
        procPendente++;
      }
    }

    const totalHomologados = procSucesso + procFracassado + procDeserto;
    const taxaSucessoPercent =
      totalHomologados > 0 ? Number(((procSucesso / totalHomologados) * 100).toFixed(1)) : 100;

    listaProcessosKpi.push({
      id: c.id,
      pcaAno: c.pcaAno,
      categoriaNome: c.categoria.nome,
      setorTecnicoNome: c.setorTecnico.nome,
      processoSEI: c.processoSEI,
      tipoContratacao: c.tipoContratacao,
      statusAtual: ultimoStatus,
      responsavelAtual,
      diasDemandanteEtp: diasDemandante,
      diasPesquisaPrecos: diasPesquisa,
      diasTermoReferencia: diasTr,
      diasMinutasDlc: diasMinutas,
      diasPgeExterno: diasPge,
      diasAgenteExterna: diasAgente,
      diasTotalInternoUern,
      diasTotalGeral,
      gargaloIdentificado,
      scoreProcesso: calcProcesso.score,
      faixaProcesso: calcProcesso.faixa,
      itensResumo: {
        total: todosItens.length,
        sucesso: procSucesso,
        fracassado: procFracassado,
        deserto: procDeserto,
        pendente: procPendente,
        taxaSucessoPercent,
      },
    });
  }

  // Médias Setoriais
  const mediaDemandante = countDemandante > 0 ? Number((somaDiasDemandante / countDemandante).toFixed(1)) : 0;
  const mediaPesquisa = countPesquisa > 0 ? Number((somaDiasPesquisa / countPesquisa).toFixed(1)) : 0;
  const mediaTr = countTr > 0 ? Number((somaDiasTr / countTr).toFixed(1)) : 0;
  const mediaMinutas = countMinutas > 0 ? Number((somaDiasMinutas / countMinutas).toFixed(1)) : 0;
  const mediaPge = countPge > 0 ? Number((somaDiasPge / countPge).toFixed(1)) : 0;
  const mediaAgente = countAgente > 0 ? Number((somaDiasAgente / countAgente).toFixed(1)) : 0;

  const ratingDemandante = calcularScoreERating(mediaDemandante, METAS.demandanteEtp, LIMIARES);
  const ratingPesquisa = calcularScoreERating(mediaPesquisa, METAS.pesquisaPrecos, LIMIARES);
  const ratingTr = calcularScoreERating(mediaTr, METAS.termoReferencia, LIMIARES);
  const ratingMinutas = calcularScoreERating(mediaMinutas, METAS.minutasDlc, LIMIARES);
  const ratingAgente = calcularScoreERating(mediaAgente, METAS.agenteFaseExterna, LIMIARES);

  // PGE: Calculado apenas como referência externa (sem penalizar rating UERN)
  const ratingPge = calcularScoreERating(mediaPge, METAS.pgeReferencial, LIMIARES);

  const ratingsSetoriais: RatingSetorialInfo[] = [
    {
      setorCodigo: "DEMANDANTE_ETP",
      setorNome: "Fase Interna Demandante / ETP & Riscos",
      responsavelPadrao: "Setores Técnicos e Unidades Demandantes",
      metaDias: METAS.demandanteEtp,
      diasMediosReais: mediaDemandante,
      processosAvaliados: countDemandante,
      razaoEficiencia: ratingDemandante.razao,
      score: ratingDemandante.score,
      faixa: ratingDemandante.faixa,
      isGargaloPrincipal: false,
    },
    {
      setorCodigo: "PESQUISA_PRECOS",
      setorNome: "Pesquisa de Preços de Mercado",
      responsavelPadrao: "Unidade de Pesquisa de Preços (DLC)",
      metaDias: METAS.pesquisaPrecos,
      diasMediosReais: mediaPesquisa,
      processosAvaliados: countPesquisa,
      razaoEficiencia: ratingPesquisa.razao,
      score: ratingPesquisa.score,
      faixa: ratingPesquisa.faixa,
      isGargaloPrincipal: false,
    },
    {
      setorCodigo: "TERMO_REFERENCIA",
      setorNome: "Elaboração de Termo de Referência (TR)",
      responsavelPadrao: "Unidade de Planejamento da Contratação",
      metaDias: METAS.termoReferencia,
      diasMediosReais: mediaTr,
      processosAvaliados: countTr,
      razaoEficiencia: ratingTr.razao,
      score: ratingTr.score,
      faixa: ratingTr.faixa,
      isGargaloPrincipal: false,
    },
    {
      setorCodigo: "MINUTAS_DLC",
      setorNome: "Minutas de Edital, Contrato e Ata",
      responsavelPadrao: "Divisão de Licitações e Contratos (DLC)",
      metaDias: METAS.minutasDlc,
      diasMediosReais: mediaMinutas,
      processosAvaliados: countMinutas,
      razaoEficiencia: ratingMinutas.razao,
      score: ratingMinutas.score,
      faixa: ratingMinutas.faixa,
      isGargaloPrincipal: false,
    },
    {
      setorCodigo: "PGE_REFERENCIAL",
      setorNome: "Análise Jurídica Externa (PGE-RN)",
      responsavelPadrao: "Procuradoria Geral do Estado (Órgão Externo)",
      metaDias: METAS.pgeReferencial,
      diasMediosReais: mediaPge,
      processosAvaliados: countPge,
      razaoEficiencia: ratingPge.razao,
      score: ratingPge.score,
      faixa: ratingPge.faixa,
      isGargaloPrincipal: false,
      isExternoNeutro: true, // Informativo: NÃO afeta o score geral UERN
    },
    {
      setorCodigo: "AGENTE_FASE_EXTERNA",
      setorNome: "Fase Externa e Homologação",
      responsavelPadrao: "Agente de Contratação / Comissão",
      metaDias: METAS.agenteFaseExterna,
      diasMediosReais: mediaAgente,
      processosAvaliados: countAgente,
      razaoEficiencia: ratingAgente.razao,
      score: ratingAgente.score,
      faixa: ratingAgente.faixa,
      isGargaloPrincipal: false,
    },
  ];

  // Determinar o Gargalo Principal entre os setores internos da UERN
  const setoresInternos = ratingsSetoriais.filter((r) => !r.isExternoNeutro);
  setoresInternos.sort((a, b) => b.razaoEficiencia - a.razaoEficiencia);
  let setorGargaloPrincipal: string | null = null;
  if (setoresInternos.length > 0 && setoresInternos[0].razaoEficiencia > 1.0) {
    setoresInternos[0].isGargaloPrincipal = true;
    setorGargaloPrincipal = setoresInternos[0].setorNome;
  }

  // Score Geral de Eficiência UERN (média dos setores internos)
  const somaScoreInterno = setoresInternos.reduce((acc, s) => acc + s.score, 0);
  const scoreGeralEficiencia =
    setoresInternos.length > 0 ? Math.round(somaScoreInterno / setoresInternos.length) : 100;
  let faixaGeral: FaixaRating = "DIAMANTE";
  if (scoreGeralEficiencia >= LIMIARES.diamante) faixaGeral = "DIAMANTE";
  else if (scoreGeralEficiencia >= LIMIARES.ouro) faixaGeral = "OURO";
  else if (scoreGeralEficiencia >= LIMIARES.prata) faixaGeral = "PRATA";
  else faixaGeral = "BRONZE_CRITICO";

  // Sucesso de Licitações (RSL)
  const taxaSucessoGeral =
    totalItensDisputados > 0
      ? Number(((totalHomologadosSucesso / totalItensDisputados) * 100).toFixed(1))
      : 100;
  let ratingSucesso: FaixaRating = "DIAMANTE";
  if (taxaSucessoGeral >= LIMIARES.diamante) ratingSucesso = "DIAMANTE";
  else if (taxaSucessoGeral >= LIMIARES.ouro) ratingSucesso = "OURO";
  else if (taxaSucessoGeral >= 60) ratingSucesso = "PRATA";
  else ratingSucesso = "BRONZE_CRITICO";

  // ----------------------------------------------------
  // Execução de Bens
  // ----------------------------------------------------
  const processosExecucao = await prisma.processoExecucao.findMany({
    include: {
      statusExecucao: { orderBy: { createdAt: "asc" } },
      entregas: {
        include: {
          statusEntrega: { orderBy: { createdAt: "asc" } },
        },
      },
    },
  });

  let atrasosFornecedor = 0;
  let somaDiasFornecedor = 0;
  let countFornecedor = 0;

  let somaDiasConfDef = 0;
  let countConfDef = 0;

  let somaDiasEntregaDest = 0;
  let countEntregaDest = 0;

  let processosExecConcluidos = 0;

  for (const pe of processosExecucao) {
    const stList = pe.statusExecucao;
    const remetidoFornec = stList.find((s) => s.status === "REMETIDO_FORNECEDOR");
    const recebidoConf = stList.find((s) => s.status === "RECEBIDA_CONFERENCIA");
    const recebidoDef = stList.find((s) => s.status === "RECEBIDA_DEFINITIVO");

    if (remetidoFornec) {
      const dataEnvio = remetidoFornec.dataEnvio ? new Date(remetidoFornec.dataEnvio) : new Date(remetidoFornec.createdAt);
      const prazoDias = remetidoFornec.prazoDias ?? 30;
      const dataConferido = recebidoConf ? new Date(recebidoConf.createdAt) : agora;
      const diasGastoFornec = diffEmDias(dataEnvio, dataConferido);
      somaDiasFornecedor += diasGastoFornec;
      countFornecedor++;
      if (diasGastoFornec > prazoDias) {
        atrasosFornecedor++;
      }
    }

    if (recebidoConf && recebidoDef) {
      const diasConf = diffEmDias(new Date(recebidoConf.createdAt), new Date(recebidoDef.createdAt));
      somaDiasConfDef += diasConf;
      countConfDef++;
    }

    if (recebidoDef) {
      processosExecConcluidos++;
      for (const ent of pe.entregas) {
        const entFinal = ent.statusEntrega.find((se) => se.status === "ENTREGUE");
        if (entFinal) {
          const diasEnt = diffEmDias(new Date(recebidoDef.createdAt), new Date(entFinal.createdAt));
          somaDiasEntregaDest += diasEnt;
          countEntregaDest++;
        }
      }
    }
  }

  const mediaDiasFornec = countFornecedor > 0 ? Number((somaDiasFornecedor / countFornecedor).toFixed(1)) : 0;
  const mediaDiasConfDef = countConfDef > 0 ? Number((somaDiasConfDef / countConfDef).toFixed(1)) : 0;
  const mediaDiasEntrega = countEntregaDest > 0 ? Number((somaDiasEntregaDest / countEntregaDest).toFixed(1)) : 0;

  const pontualidadeFornec = countFornecedor > 0 ? Math.max(0, 100 - (atrasosFornecedor / countFornecedor) * 100) : 100;
  const scoreConf = calcularScoreERating(mediaDiasConfDef, METAS.conferenciaDefinitivoBens, LIMIARES).score;
  const scoreEntr = calcularScoreERating(mediaDiasEntrega, METAS.entregaDestinatarioBens, LIMIARES).score;
  const scoreEficienciaExecucao = Math.round(pontualidadeFornec * 0.4 + scoreConf * 0.35 + scoreEntr * 0.25);

  let faixaExecucao: FaixaRating = "DIAMANTE";
  if (scoreEficienciaExecucao >= LIMIARES.diamante) faixaExecucao = "DIAMANTE";
  else if (scoreEficienciaExecucao >= LIMIARES.ouro) faixaExecucao = "OURO";
  else if (scoreEficienciaExecucao >= LIMIARES.prata) faixaExecucao = "PRATA";
  else faixaExecucao = "BRONZE_CRITICO";

  const totalProc = consolidacoes.length;
  const procConcluidos = consolidacoes.filter((c) =>
    c.statusLicitacao.some((s) => s.status === "HOMOLOGADO" || s.status === "REMETIDO_EXECUCAO")
  ).length;

  const tempoMedioTotalInternoUern =
    mediaDemandante + mediaPesquisa + mediaTr + mediaMinutas + mediaAgente;

  return {
    pcaAnoFiltro: pcaAno ?? null,
    totalProcessos: totalProc,
    processosConcluidos: procConcluidos,
    processosEmAndamento: totalProc - procConcluidos,
    tempoMedioTotalInternoUern: Number(tempoMedioTotalInternoUern.toFixed(1)),
    tempoMedioPgeReferencial: mediaPge,
    scoreGeralEficiencia,
    faixaGeral,
    setorGargaloPrincipal,
    ratingsSetoriais,
    sucessoLicitacoes: {
      totalItensDisputados,
      totalHomologadosSucesso,
      totalDesertos,
      totalFracassados,
      taxaSucessoGeral,
      ratingSucesso,
      scoreSucesso: Math.round(taxaSucessoGeral),
    },
    execucaoBens: {
      totalProcessosExecucao: processosExecucao.length,
      processosConcluidos: processosExecConcluidos,
      processosEmAndamento: processosExecucao.length - processosExecConcluidos,
      atrasosFornecedor,
      diasMediosFornecedor: mediaDiasFornec,
      diasMediosConferenciaDefinitivo: mediaDiasConfDef,
      diasMediosEntregaDestinatario: mediaDiasEntrega,
      scoreEficienciaExecucao,
      faixaExecucao,
    },
    processos: listaProcessosKpi,
    parametrosVigentes: paramsConfig,
  };
}
